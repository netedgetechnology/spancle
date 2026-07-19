/**
 * platform-contract-intake.ts
 *
 * Anti-Corruption Layer (ACL) entry point.
 *
 * Orchestrates: validate → check outcome → map → return typed result
 *
 * Finance calls this with raw envelope data received from any delivery mechanism.
 * The ACL shields the Finance domain from platform contract details.
 *
 * No persistence. No events. No async I/O.
 * Pure function composition of Validator and Mapper.
 */
import type { CommercialDecisionContract, PlatformContractEnvelope } from '@spancle/types';
import { PlatformContractValidator }   from './platform-contract-validator';
import { PlatformContractMapper }      from './platform-contract-mapper';
import {
  type IntakeResult,
  accepted,
  rejected,
  fieldError,
} from './intake-result.model';

export class PlatformContractIntake {

  /**
   * Process an incoming platform contract envelope.
   *
   * Pipeline:
   *   1. Validate envelope structure and version
   *   2. Check outcome — DENIED contracts produce a valid but no-op result
   *   3. Map to Finance internal commands
   *   4. Return typed IntakeResult (never throws)
   *
   * @param rawEnvelope  Any object received from a transport layer.
   */
  static process(rawEnvelope: unknown): IntakeResult {
    // Step 1: validate structure
    const validation = PlatformContractValidator.validate(rawEnvelope);
    if (!validation.valid) {
      const reason = PlatformContractIntake.classifyRejection(rawEnvelope, validation.errors);
      return rejected(reason, validation.errors as {field: string; message: string}[]);
    }

    const envelope = rawEnvelope as PlatformContractEnvelope<CommercialDecisionContract>;

    // Step 2: map to commands (DENIED outcome maps to a transaction-only batch)
    try {
      const commands = PlatformContractMapper.map(envelope);
      return accepted(commands);
    } catch (err) {
      return rejected('INTERNAL_ERROR', [
        fieldError('mapper', `Mapping failed: ${(err as Error).message ?? 'unknown'}`),
      ]);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private static classifyRejection(
    rawEnvelope: unknown,
    errors: ReadonlyArray<{ field: string; message: string }>,
  ) {
    if (!rawEnvelope || typeof rawEnvelope !== 'object') return 'MALFORMED_PAYLOAD';

    const env = rawEnvelope as Record<string, unknown>;
    const hasVersionError = errors.some((e) =>
      e.field === 'schemaVersion' || e.field === 'contractVersion',
    );
    if (hasVersionError) return 'UNSUPPORTED_VERSION';

    const hasSchemaError = errors.some((e) => e.field === 'envelope' || e.field === 'payload');
    if (hasSchemaError) return 'MALFORMED_PAYLOAD';

    const missingRequired = errors.some((e) => e.message.includes('missing'));
    if (missingRequired) return 'MISSING_REQUIRED_FIELD';

    return 'INVALID_SCHEMA';
  }
}
