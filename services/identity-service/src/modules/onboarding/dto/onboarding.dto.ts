import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── Step 1: Signup ────────────────────────────────────────────────────────────

/**
 * SignupDto — initiates the onboarding flow.
 * Creates a pending registration record and sends a verification email.
 */
export class SignupDto {
  /** Full name of the person signing up */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  /** Organisation / club name — becomes the tenant name */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  orgName!: string;

  /**
   * Desired subdomain slug — e.g. "acme-fc" → acme-fc.app.spancle.io
   * Immutable after tenant creation. Validated for uniqueness.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Slug must be 2–63 chars, lowercase alphanumeric, may contain hyphens, cannot start or end with a hyphen',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;
}

// ── Step 2: Email verification ────────────────────────────────────────────────

/**
 * VerifyEmailDto — submits the verification token received by email.
 */
export class VerifyEmailDto {
  /** The registrationId returned from signup — ties the token to a session */
  @IsString()
  @IsNotEmpty()
  registrationId!: string;

  /**
   * Cryptographically random 64-char hex token sent in the verification email.
   * Stored in Redis with 24h TTL, deleted on first valid use.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(64)
  @MaxLength(64)
  token!: string;
}

// ── Step 2b: Resend verification ───────────────────────────────────────────────

export class ResendVerificationDto {
  @IsString()
  @IsNotEmpty()
  registrationId!: string;
}

// ── Step 3: Package selection ─────────────────────────────────────────────────

/**
 * SelectPackageDto — tenant chooses a plan for their trial.
 * If packageId is omitted, the 'free' tier package is selected by default.
 */
export class SelectPackageDto {
  @IsString()
  @IsNotEmpty()
  registrationId!: string;

  @IsUUID()
  packageId!: string;

  @IsEnum(['monthly', 'annual'])
  @IsOptional()
  billingCycle?: 'monthly' | 'annual';
}

// ── Step 4: Setup (provisioning) ──────────────────────────────────────────────

/**
 * CompleteOnboardingDto — final setup step.
 * Sets the admin password and any org-level settings before provisioning.
 */
export class CompleteOnboardingDto {
  @IsString()
  @IsNotEmpty()
  registrationId!: string;

  /**
   * Admin password — must satisfy PasswordService.enforcePolicy().
   * Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;

  /** Timezone — e.g. 'Europe/London' */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  /** ISO-4217 currency — e.g. 'GBP' */
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;
}

// ── Check slug availability ───────────────────────────────────────────────────

export class CheckSlugDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;
}
