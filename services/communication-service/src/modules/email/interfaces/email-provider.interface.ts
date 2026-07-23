/**
 * EmailMessage — the input type for every email provider.
 *
 * All fields except `to`, `subject`, and at least one of `html`/`text`
 * are optional. Providers may ignore fields they cannot support.
 */
export interface EmailMessage {
  /** Recipient address or RFC 5321 address (e.g. "Alice <alice@example.com>") */
  to:       string | string[];
  /** Subject line */
  subject:  string;
  /** HTML body — at least one of html / text must be provided */
  html?:    string;
  /** Plain-text fallback */
  text?:    string;
  /** Sender address — overrides provider default when supplied */
  from?:    string;
  /** Reply-to address */
  replyTo?: string;
}

/**
 * EmailSendResult — returned by every provider on success or failure.
 *
 * `success: false` does NOT throw — callers decide how to handle failure.
 * Providers throw only for unrecoverable configuration errors (e.g. no SMTP host).
 */
export interface EmailSendResult {
  success:     boolean;
  /** Provider-specific message ID (e.g. Nodemailer messageId, SES MessageId) */
  messageId?:  string;
  /** Human-readable error when success=false */
  error?:      string;
}

/**
 * EmailProvider — the abstraction that isolates all email-sending logic
 * from the rest of the communication-service.
 *
 * Rules:
 *   - Implementations MUST be @Injectable() NestJS providers.
 *   - Implementations MUST NOT throw on transient delivery errors —
 *     return { success: false, error: '...' } instead.
 *   - Implementations MAY throw on configuration errors (missing host, etc.)
 *     because those are programmer errors, not runtime failures.
 *   - All SMTP / API credentials come from ConfigService, never hardcoded.
 *
 * Future providers (SES, SendGrid, Resend) implement this interface only.
 * No other file changes are required when switching providers.
 */
export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<EmailSendResult>;
}

/** DI injection token — used to inject the active provider via @Inject(). */
export const EMAIL_PROVIDER = 'EMAIL_PROVIDER' as const;
