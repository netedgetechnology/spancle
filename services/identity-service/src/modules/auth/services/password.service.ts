import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PASSWORD } from '@spancle/constants';

export interface PasswordPolicyViolation {
  rule:    string;
  message: string;
}

export interface PasswordPolicyResult {
  valid:      boolean;
  violations: PasswordPolicyViolation[];
}

/**
 * PasswordService — password hashing, verification and policy enforcement.
 *
 * Security contracts:
 *   - bcrypt with configurable rounds (default: PASSWORD.BCRYPT_ROUNDS = 12)
 *   - Passwords are NEVER logged at any level
 *   - Policy is enforced before hashing — not after
 *   - compareHash() is constant-time via bcrypt.compare()
 *
 * Policy rules (configurable via constants):
 *   - Minimum 8 characters
 *   - Maximum 128 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one digit
 *   - At least one special character
 *   - Not a known common password (basic blocklist)
 */
@Injectable()
export class PasswordService {
  private readonly logger   = new Logger(PasswordService.name);
  private readonly rounds   = PASSWORD.BCRYPT_ROUNDS;
  private readonly minLen   = PASSWORD.MIN_LENGTH;
  private readonly maxLen   = PASSWORD.MAX_LENGTH;

  /**
   * Common passwords blocklist — extended in Sprint 2 with full HIBP integration.
   */
  private readonly commonPasswords = new Set([
    'password', 'password1', 'password123',
    'qwerty123', 'qwertyuiop',
    'letmein1', 'welcome1',
    'abc123456', '123456789',
    'iloveyou1', 'admin1234',
    'spancle123', 'spancle1',
  ]);

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Hashes a plaintext password using bcrypt.
   * Validates policy first — throws UnprocessableEntityException on violation.
   */
  async hash(plaintext: string): Promise<string> {
    this.enforcePolicy(plaintext);
    return bcrypt.hash(plaintext, this.rounds);
  }

  /**
   * Compares a plaintext password against a bcrypt hash.
   * Returns false (not throws) on mismatch — callers decide the response.
   */
  async compare(plaintext: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plaintext, hash);
    } catch (err) {
      // Malformed hash — treat as mismatch, log for ops visibility
      this.logger.error(`bcrypt.compare threw unexpectedly: ${String(err)}`);
      return false;
    }
  }

  /**
   * Validates password against all policy rules without hashing.
   * Returns structured result — does not throw.
   * Use enforcePolicy() when you want an exception on failure.
   */
  validatePolicy(password: string): PasswordPolicyResult {
    const violations: PasswordPolicyViolation[] = [];

    if (password.length < this.minLen) {
      violations.push({
        rule:    'min_length',
        message: `Password must be at least ${this.minLen} characters`,
      });
    }

    if (password.length > this.maxLen) {
      violations.push({
        rule:    'max_length',
        message: `Password must not exceed ${this.maxLen} characters`,
      });
    }

    if (!/[A-Z]/.test(password)) {
      violations.push({
        rule:    'uppercase',
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(password)) {
      violations.push({
        rule:    'lowercase',
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/\d/.test(password)) {
      violations.push({
        rule:    'digit',
        message: 'Password must contain at least one number',
      });
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      violations.push({
        rule:    'special_char',
        message: 'Password must contain at least one special character',
      });
    }

    if (this.commonPasswords.has(password.toLowerCase())) {
      violations.push({
        rule:    'common_password',
        message: 'This password is too common. Please choose a more unique password',
      });
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Enforces policy and throws UnprocessableEntityException if violated.
   * Used by hash() and called explicitly before identity creation.
   */
  enforcePolicy(password: string): void {
    const result = this.validatePolicy(password);

    if (!result.valid) {
      throw new UnprocessableEntityException({
        message:    'Password does not meet security policy requirements',
        violations: result.violations.map((v) => ({
          rule:    v.rule,
          message: v.message,
        })),
      });
    }
  }

  /**
   * Checks if a new password is different from the current hash.
   * Prevents reuse of the same password on change.
   */
  async isDifferentFromCurrent(
    newPassword: string,
    currentHash: string,
  ): Promise<boolean> {
    const isSame = await this.compare(newPassword, currentHash);
    return !isSame;
  }
}
