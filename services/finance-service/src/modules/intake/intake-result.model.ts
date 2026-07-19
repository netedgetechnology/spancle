/**
 * intake-result.model.ts
 *
 * Typed, discriminated-union result for the Platform Contract Intake ACL.
 *
 * Never throws. All error conditions are represented as typed values.
 * Consumer pattern:
 *
 *   const result = await intake.process(envelope);
 *   if (result.accepted) {
 *     // result.commands is FinanceCommandBatch
 *   } else {
 *     // result.reason is IntakeRejectionReason
 *     // result.errors is string[]
 *   }
 */
import type { FinanceCommandBatch } from './commands/finance.commands';

// ── Rejection reasons ─────────────────────────────────────────────────────────

export type IntakeRejectionReason =
  | 'UNSUPPORTED_VERSION'        // contractVersion major mismatch
  | 'INVALID_SCHEMA'             // required envelope fields missing
  | 'MALFORMED_PAYLOAD'          // payload failed structural validation
  | 'MISSING_REQUIRED_FIELD'     // a required contract field is null/undefined
  | 'OUTCOME_DENIED'             // CommercialDecisionContract.outcome = DENIED
  | 'DUPLICATE'                  // deduplicationKey already processed
  | 'INTERNAL_ERROR';            // unexpected error in the ACL itself

// ── Validation error ──────────────────────────────────────────────────────────

export interface IntakeValidationError {
  readonly field:   string;
  readonly message: string;
}

// ── Accepted result ───────────────────────────────────────────────────────────

export interface PlatformContractAccepted {
  readonly accepted:  true;
  readonly commands:  Readonly<FinanceCommandBatch>;
  readonly processedAt: string;   // ISO-8601
}

// ── Rejected result ───────────────────────────────────────────────────────────

export interface PlatformContractRejected {
  readonly accepted: false;
  readonly reason:   IntakeRejectionReason;
  readonly errors:   ReadonlyArray<IntakeValidationError>;
  readonly rejectedAt: string;   // ISO-8601
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type IntakeResult = PlatformContractAccepted | PlatformContractRejected;

// ── Factories ─────────────────────────────────────────────────────────────────

export function accepted(commands: FinanceCommandBatch): PlatformContractAccepted {
  return Object.freeze({
    accepted:    true,
    commands:    Object.freeze(commands),
    processedAt: new Date().toISOString(),
  });
}

export function rejected(
  reason: IntakeRejectionReason,
  errors: IntakeValidationError[],
): PlatformContractRejected {
  return Object.freeze({
    accepted:   false,
    reason,
    errors:     Object.freeze(errors),
    rejectedAt: new Date().toISOString(),
  });
}

export function fieldError(field: string, message: string): IntakeValidationError {
  return Object.freeze({ field, message });
}
