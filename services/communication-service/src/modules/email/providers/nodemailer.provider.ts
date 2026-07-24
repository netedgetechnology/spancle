import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import * as nodemailer                       from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import type SMTPTransport                    from 'nodemailer/lib/smtp-transport';
import {
  EmailProvider,
  type EmailMessage,
  type EmailSendResult,
} from '../interfaces/email-provider.interface';

/**
 * NodemailerProvider
 *
 * Sends email via SMTP using the nodemailer library already installed
 * in communication-service (nodemailer@^6.9.14).
 *
 * Configuration (all read from ConfigService / environment):
 *
 *   SMTP_HOST          (required) — SMTP server hostname
 *   SMTP_PORT          (optional, default: 587) — SMTP port
 *   SMTP_SECURE        (optional, default: false) — true forces TLS (port 465)
 *   SMTP_USER          (optional) — SMTP authentication username
 *   SMTP_PASS          (optional) — SMTP authentication password
 *   SMTP_FROM          (required) — Default From address ("Spancle <noreply@...>")
 *   SMTP_TIMEOUT_MS    (optional, default: 10000) — Connection timeout
 *
 * Alternatively, set SMTP_URL to a full SMTP connection string:
 *   smtp://user:pass@host:port  (overrides individual SMTP_* vars)
 *
 * Security:
 *   - SMTP credentials are never logged.
 *   - If neither SMTP_HOST nor SMTP_URL is set, NodemailerProvider logs a
 *     warning and returns { success: false } on every send rather than
 *     throwing — this allows the service to start in environments without
 *     email configured (e.g. test, local dev).
 *
 * Transporter verification:
 *   onModuleInit() calls transporter.verify() to detect misconfiguration
 *   at startup. Failure is logged as a warning (not a fatal error) because
 *   transient SMTP unavailability should not prevent service startup.
 */
@Injectable()
export class NodemailerProvider extends EmailProvider implements OnModuleInit {
  private readonly logger      = new Logger(NodemailerProvider.name);
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private defaultFrom: string  = '';
  private configured           = false;

  constructor(private readonly config: ConfigService) {
    super();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    this.defaultFrom = this.config.get<string>('SMTP_FROM', '');

    const smtpUrl  = this.config.get<string>('SMTP_URL');
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (!smtpUrl && !smtpHost) {
      this.logger.warn(
        'NodemailerProvider: SMTP_HOST (or SMTP_URL) is not set. ' +
        'Email sends will return { success: false } until configured. ' +
        'Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM ' +
        'or SMTP_URL in the environment.',
      );
      this.configured = false;
      return;
    }

    this.transporter = this.buildTransporter(smtpUrl, smtpHost);
    this.configured  = true;

    // Verify connectivity at startup — non-fatal if SMTP is temporarily down
    try {
      await this.transporter.verify();
      this.logger.log(
        `NodemailerProvider ready — host=${smtpUrl ? '[from SMTP_URL]' : smtpHost} ` +
        `from="${this.defaultFrom}"`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `NodemailerProvider: SMTP verify failed at startup — ${msg}. ` +
        'Sends will be attempted regardless.',
      );
    }
  }

  // ── Public verify ────────────────────────────────────────────────────────

  /**
   * verify() — tests the SMTP connection.
   * Returns true when SMTP is configured and reachable.
   * Returns false when SMTP is not configured (not an error — just unconfigured).
   * Throws when SMTP is configured but unreachable.
   *
   * Used by HealthController.checkSmtp().
   */
  async verify(): Promise<boolean> {
    if (!this.configured || !this.transporter) return false;
    await this.transporter.verify();
    return true;
  }

  // ── Core send ─────────────────────────────────────────────────────────────

  /**
   * send() — sends a single email.
   *
   * Returns { success: false, error } on transient delivery failure.
   * Never throws for delivery failures — the caller (queue consumer in Sprint 2)
   * is responsible for retry decisions.
   *
   * Throws only for programming errors (calling send before onModuleInit).
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.configured || !this.transporter) {
      this.logger.warn(
        `NodemailerProvider: send() called but SMTP is not configured. ` +
        `Dropping message to ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`,
      );
      return {
        success: false,
        error:   'SMTP not configured — set SMTP_HOST or SMTP_URL',
      };
    }

    if (!message.html && !message.text) {
      return {
        success: false,
        error:   'Email must include at least one of: html, text',
      };
    }

    const mailOptions: SendMailOptions = {
      from:    message.from ?? this.defaultFrom,
      to:      Array.isArray(message.to) ? message.to.join(', ') : message.to,
      subject: message.subject,
      ...(message.html    ? { html:    message.html    } : {}),
      ...(message.text    ? { text:    message.text    } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.debug(
        `Email sent — messageId=${info.messageId} ` +
        `to=${mailOptions.to} subject="${message.subject}"`,
      );
      return { success: true, messageId: info.messageId };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Email send failed — to=${mailOptions.to} subject="${message.subject}": ${error}`,
      );
      return { success: false, error };
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private buildTransporter(
    smtpUrl:   string | undefined,
    smtpHost:  string | undefined,
  ): Transporter<SMTPTransport.SentMessageInfo> {
    const timeoutMs = this.config.get<number>('SMTP_TIMEOUT_MS', 10_000);

    if (smtpUrl) {
      return nodemailer.createTransport(smtpUrl, {
        connectionTimeout: timeoutMs,
        greetingTimeout:   timeoutMs,
        socketTimeout:     timeoutMs,
      });
    }

    const port   = this.config.get<number>('SMTP_PORT', 587);
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const user   = this.config.get<string>('SMTP_USER');
    const pass   = this.config.get<string>('SMTP_PASS');

    return nodemailer.createTransport({
      host:   smtpHost!,
      port,
      secure,
      connectionTimeout: timeoutMs,
      greetingTimeout:   timeoutMs,
      socketTimeout:     timeoutMs,
      ...(user && pass
        ? { auth: { type: 'LOGIN' as const, user, pass } }
        : {}),
    });
  }
}
