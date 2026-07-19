/**
 * platform-contract-validator.ts
 *
 * Validates an incoming platform contract envelope before mapping.
 *
 * Responsibilities (in order):
 *   1. Validate envelope header fields (contractId, schemaVersion, eventType…)
 *   2. Validate schema version compatibility (same-major rule)
 *   3. Validate payload structural completeness
 *   4. Return typed ValidationResult — never throw
 *
 * No business logic.
 * No repositories.
 * No database access.
 * Purely structural validation.
 */
import {
  isPlatformContractVersionCompatible,
  PLATFORM_CONTRACT_VERSION,
  type CommercialDecisionContract,
  type PlatformContractEnvelope,
} from '@spancle/types';
import { type IntakeValidationError, fieldError } from './intake-result.model';

// ── Constants ─────────────────────────────────────────────────────────────────

export const SUPPORTED_EVENT_TYPES = new Set([
  'spancle.platform.commercial.decision.generated',
]);

/** Minimum required envelope header fields. */
const REQUIRED_ENVELOPE_FIELDS: ReadonlyArray<keyof PlatformContractEnvelope> = [
  'contractId', 'contractVersion', 'schemaVersion', 'eventType',
  'sourceService', 'correlationId', 'traceId', 'deduplicationKey',
  'occurredAt', 'priority', 'deliveryMode', 'payload',
];

/** Required fields on a CommercialDecisionContract payload. */
const REQUIRED_DECISION_FIELDS: ReadonlyArray<keyof CommercialDecisionContract> = [
  'kind', 'contractVersion', 'decisionId', 'tenantId', 'moduleId',
  'productId', 'transactionType', 'outcome', 'currency', 'country',
  'requestedAmountMinor', 'requestedAt', 'settlementInstruction',
];

// ── ValidationResult ──────────────────────────────────────────────────────────

export interface ValidationResult {
  readonly valid:  boolean;
  readonly errors: ReadonlyArray<IntakeValidationError>;
}

const OK: ValidationResult = Object.freeze({ valid: true, errors: [] });

// ── PlatformContractValidator ─────────────────────────────────────────────────

export class PlatformContractValidator {

  /**
   * Full validation pipeline for an incoming envelope.
   *
   * Steps:
   *   1. Envelope header completeness
   *   2. Schema version compatibility
   *   3. Event type is known
   *   4. occurredAt is a valid ISO-8601 date
   *   5. Payload structural validation for CommercialDecisionContract
   */
  static validate(envelope: unknown): ValidationResult {
    const errors: IntakeValidationError[] = [];

    // ── Step 1: envelope must be an object ───────────────────────────────────
    if (!envelope || typeof envelope !== 'object') {
      return {
        valid:  false,
        errors: [fieldError('envelope', 'Envelope must be a non-null object')],
      };
    }

    const env = envelope as Record<string, unknown>;

    // ── Step 2: required header fields ───────────────────────────────────────
    for (const field of REQUIRED_ENVELOPE_FIELDS) {
      const value = env[field as string];
      if (value === undefined || value === null || value === '') {
        errors.push(fieldError(field as string, `Required envelope field "${field}" is missing or empty`));
      }
    }

    if (errors.length) return { valid: false, errors };

    // ── Step 3: schema version ────────────────────────────────────────────────
    const schemaVersion = env['schemaVersion'] as string;
    if (!isPlatformContractVersionCompatible(schemaVersion)) {
      errors.push(fieldError(
        'schemaVersion',
        `Unsupported schema version "${schemaVersion}". ` +
        `Current version: ${PLATFORM_CONTRACT_VERSION}. Same major required.`,
      ));
      return { valid: false, errors };
    }

    // ── Step 4: event type ────────────────────────────────────────────────────
    const eventType = env['eventType'] as string;
    if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
      errors.push(fieldError(
        'eventType',
        `Unknown event type "${eventType}". ` +
        `Supported: [${[...SUPPORTED_EVENT_TYPES].join(', ')}]`,
      ));
    }

    // ── Step 5: occurredAt ────────────────────────────────────────────────────
    const occurredAt = env['occurredAt'] as string;
    if (isNaN(Date.parse(occurredAt))) {
      errors.push(fieldError('occurredAt', `"occurredAt" is not a valid ISO-8601 string: "${occurredAt}"`));
    }

    if (errors.length) return { valid: false, errors };

    // ── Step 6: payload structural validation ─────────────────────────────────
    const payload = env['payload'];
    if (!payload || typeof payload !== 'object') {
      return {
        valid:  false,
        errors: [fieldError('payload', 'Payload must be a non-null object')],
      };
    }

    const payloadErrors = PlatformContractValidator.validateDecisionPayload(
      payload as Record<string, unknown>,
    );
    if (payloadErrors.length) return { valid: false, errors: payloadErrors };

    return OK;
  }

  /**
   * Validates the schema version field alone, without checking the full envelope.
   * Used for fast rejection before full parse.
   */
  static validateVersion(contractVersion: string): ValidationResult {
    if (!isPlatformContractVersionCompatible(contractVersion)) {
      return {
        valid:  false,
        errors: [fieldError(
          'contractVersion',
          `Unsupported contract version "${contractVersion}". Same major as ` +
          `"${PLATFORM_CONTRACT_VERSION}" required.`,
        )],
      };
    }
    return OK;
  }

  /**
   * Validates only the payload object of a CommercialDecisionContract.
   * Returns empty array when valid.
   */
  static validateDecisionPayload(payload: Record<string, unknown>): IntakeValidationError[] {
    const errors: IntakeValidationError[] = [];

    // kind must be CommercialDecisionContract
    if (payload['kind'] !== 'CommercialDecisionContract') {
      errors.push(fieldError('payload.kind', `Expected "CommercialDecisionContract", got "${payload['kind']}"`));
      return errors;
    }

    // Required fields
    for (const field of REQUIRED_DECISION_FIELDS) {
      const value = payload[field as string];
      if (value === undefined || value === null) {
        errors.push(fieldError(`payload.${field}`, `Required payload field "${field}" is missing`));
      }
    }

    if (errors.length) return errors;

    // requestedAmountMinor must be non-negative integer
    const amt = payload['requestedAmountMinor'] as unknown;
    if (!Number.isInteger(amt) || (amt as number) < 0) {
      errors.push(fieldError('payload.requestedAmountMinor', `Must be a non-negative integer; received ${amt}`));
    }

    // currency must be 3 chars
    const cur = payload['currency'] as string;
    if (!cur || cur.length !== 3) {
      errors.push(fieldError('payload.currency', `Must be a 3-character ISO-4217 code; received "${cur}"`));
    }

    // country must be 2 chars
    const country = payload['country'] as string;
    if (!country || country.length !== 2) {
      errors.push(fieldError('payload.country', `Must be a 2-character ISO-3166 code; received "${country}"`));
    }

    // settlementInstruction must be present
    const si = payload['settlementInstruction'];
    if (!si || typeof si !== 'object') {
      errors.push(fieldError('payload.settlementInstruction', 'settlementInstruction must be a non-null object'));
    }

    // requestedAt must parse as date
    const reqAt = payload['requestedAt'] as string;
    if (reqAt && isNaN(Date.parse(reqAt))) {
      errors.push(fieldError('payload.requestedAt', `Not a valid ISO-8601 string: "${reqAt}"`));
    }

    return errors;
  }
}
