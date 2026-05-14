export interface PasswordPolicyViolation {
    rule: string;
    message: string;
}
export interface PasswordPolicyResult {
    valid: boolean;
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
export declare class PasswordService {
    private readonly logger;
    private readonly rounds;
    private readonly minLen;
    private readonly maxLen;
    /**
     * Common passwords blocklist — extended in Sprint 2 with full HIBP integration.
     */
    private readonly commonPasswords;
    /**
     * Hashes a plaintext password using bcrypt.
     * Validates policy first — throws UnprocessableEntityException on violation.
     */
    hash(plaintext: string): Promise<string>;
    /**
     * Compares a plaintext password against a bcrypt hash.
     * Returns false (not throws) on mismatch — callers decide the response.
     */
    compare(plaintext: string, hash: string): Promise<boolean>;
    /**
     * Validates password against all policy rules without hashing.
     * Returns structured result — does not throw.
     * Use enforcePolicy() when you want an exception on failure.
     */
    validatePolicy(password: string): PasswordPolicyResult;
    /**
     * Enforces policy and throws UnprocessableEntityException if violated.
     * Used by hash() and called explicitly before identity creation.
     */
    enforcePolicy(password: string): void;
    /**
     * Checks if a new password is different from the current hash.
     * Prevents reuse of the same password on change.
     */
    isDifferentFromCurrent(newPassword: string, currentHash: string): Promise<boolean>;
}
//# sourceMappingURL=password.service.d.ts.map