import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { randomBytes } from 'node:crypto';
import { createRedisClient } from '../../../infrastructure/config/redis.config';
import type { BaseConfig } from '../../../infrastructure/config/base.config';

/**
 * Registration state stored in Redis.
 * Persists across all onboarding steps — acts as the in-progress workflow record.
 */
export interface RegistrationRecord {
  /** Stable ID for this signup attempt */
  registrationId:  string;
  /** Step the user has reached: 1=signup, 2=verified, 3=package_selected, 4=provisioned */
  step:            1 | 2 | 3 | 4;
  fullName:        string;
  orgName:         string;
  slug:            string;
  email:           string;
  emailVerified:   boolean;
  /** Selected packageId (set in step 3) */
  packageId:       string | null;
  billingCycle:    'monthly' | 'annual';
  /** Set after provisioning */
  tenantId:        string | null;
  subscriptionId:  string | null;
  createdAt:       string;
  lastUpdatedAt:   string;
}

/**
 * OnboardingTokenService — manages onboarding workflow state in Redis.
 *
 * Key namespaces (all on Redis DB 0 — cache):
 *   onboarding:reg:{registrationId}    → RegistrationRecord JSON, TTL 48h
 *   onboarding:token:{registrationId}  → verification token hex, TTL 24h
 *   onboarding:slug:{slug}             → "reserved" string, TTL 48h (prevents races)
 *   onboarding:email:{email}           → registrationId, TTL 48h (prevents duplicate signups)
 *   onboarding:idempotency:{key}       → response JSON, TTL 60s (prevents double-submit)
 */
@Injectable()
export class OnboardingTokenService implements OnModuleInit {
  private readonly logger = new Logger(OnboardingTokenService.name);
  private redis!: Redis;

  private readonly REG_TTL_S    = 48 * 60 * 60;  // 48 hours
  private readonly TOKEN_TTL_S  = 24 * 60 * 60;  // 24 hours
  private readonly IDEM_TTL_S   = 60;             // 60 seconds

  constructor(private readonly config: ConfigService<BaseConfig, true>) {}

  onModuleInit(): void {
    this.redis = createRedisClient(this.config as ConfigService<BaseConfig, true>, 'cache');
    this.logger.log('OnboardingTokenService Redis client initialised');
  }

  // ── Registration records ───────────────────────────────────────────────────

  async createRegistration(data: Omit<RegistrationRecord, 'registrationId' | 'step' | 'createdAt' | 'lastUpdatedAt' | 'emailVerified' | 'packageId' | 'tenantId' | 'subscriptionId' | 'billingCycle'>): Promise<RegistrationRecord> {
    const registrationId = randomBytes(16).toString('hex');
    const now            = new Date().toISOString();

    const record: RegistrationRecord = {
      registrationId,
      step:           1,
      emailVerified:  false,
      packageId:      null,
      billingCycle:   'monthly',
      tenantId:       null,
      subscriptionId: null,
      createdAt:      now,
      lastUpdatedAt:  now,
      ...data,
    };

    await Promise.all([
      this.redis.setex(this.regKey(registrationId), this.REG_TTL_S, JSON.stringify(record)),
      this.redis.setex(this.slugKey(data.slug),  this.REG_TTL_S, registrationId),
      this.redis.setex(this.emailKey(data.email), this.REG_TTL_S, registrationId),
    ]);

    return record;
  }

  async getRegistration(registrationId: string): Promise<RegistrationRecord | null> {
    const raw = await this.redis.get(this.regKey(registrationId));
    if (!raw) return null;
    return JSON.parse(raw) as RegistrationRecord;
  }

  async updateRegistration(
    registrationId: string,
    patch: Partial<RegistrationRecord>,
  ): Promise<RegistrationRecord> {
    const existing = await this.getRegistration(registrationId);
    if (!existing) throw new Error(`Registration ${registrationId} not found or expired`);

    const updated: RegistrationRecord = {
      ...existing,
      ...patch,
      registrationId,
      lastUpdatedAt: new Date().toISOString(),
    };

    await this.redis.setex(this.regKey(registrationId), this.REG_TTL_S, JSON.stringify(updated));
    return updated;
  }

  async deleteRegistration(registrationId: string): Promise<void> {
    const record = await this.getRegistration(registrationId);
    if (!record) return;

    await Promise.all([
      this.redis.del(this.regKey(registrationId)),
      this.redis.del(this.tokenKey(registrationId)),
      this.redis.del(this.slugKey(record.slug)),
      this.redis.del(this.emailKey(record.email)),
    ]);
  }

  // ── Email verification tokens ──────────────────────────────────────────────

  /**
   * Generates a new 64-character hex verification token.
   * Old token is overwritten — only one valid token per registration at a time.
   */
  async generateVerificationToken(registrationId: string): Promise<string> {
    const token = randomBytes(32).toString('hex'); // 64 hex chars
    await this.redis.setex(this.tokenKey(registrationId), this.TOKEN_TTL_S, token);
    return token;
  }

  /**
   * Validates a verification token — single-use, deleted immediately on match.
   */
  async validateAndConsumeToken(registrationId: string, token: string): Promise<boolean> {
    const stored = await this.redis.get(this.tokenKey(registrationId));
    if (!stored || stored !== token) return false;

    // Delete immediately — single use
    await this.redis.del(this.tokenKey(registrationId));
    return true;
  }

  // ── Duplicate prevention ───────────────────────────────────────────────────

  async isSlugReserved(slug: string): Promise<boolean> {
    return (await this.redis.exists(this.slugKey(slug))) === 1;
  }

  async isEmailPendingRegistration(email: string): Promise<string | null> {
    return this.redis.get(this.emailKey(email));
  }

  // ── Idempotency ────────────────────────────────────────────────────────────

  async getIdempotentResponse(key: string): Promise<string | null> {
    return this.redis.get(`onboarding:idempotency:${key}`);
  }

  async setIdempotentResponse(key: string, response: unknown): Promise<void> {
    await this.redis.setex(
      `onboarding:idempotency:${key}`,
      this.IDEM_TTL_S,
      JSON.stringify(response),
    );
  }

  // ── Private key builders ───────────────────────────────────────────────────

  private regKey(id: string):    string { return `onboarding:reg:${id}`; }
  private tokenKey(id: string):  string { return `onboarding:token:${id}`; }
  private slugKey(slug: string): string { return `onboarding:slug:${slug}`; }
  private emailKey(email: string): string { return `onboarding:email:${email}`; }
}
