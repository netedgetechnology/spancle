/**
 * nodemailer.provider.spec.ts
 *
 * Unit tests for NodemailerProvider.
 *
 * Strategy: jest.mock('nodemailer') replaces createTransport with a
 * jest.fn() before any test runs. Each test configures the mock's
 * return value. No real SMTP connection is attempted.
 *
 * Covers:
 *   ✓ SMTP initialises when SMTP_HOST is set
 *   ✓ SMTP_URL overrides individual SMTP_* vars
 *   ✓ Missing SMTP config → not configured, send returns {success:false}
 *   ✓ transporter.verify() failure is non-fatal
 *   ✓ send() succeeds and returns messageId
 *   ✓ send() handles transport error → {success:false, error}
 *   ✓ send() rejects message with no body
 *   ✓ send() uses message.from when provided, falls back to SMTP_FROM
 *   ✓ send() passes replyTo when provided; omits when absent
 *   ✓ Array recipients joined to comma-separated string
 *   ✓ text-only message accepted (no html)
 *   ✓ Provider extends EmailProvider (DI contract)
 *   ✓ EMAIL_PROVIDER token is a string constant
 */

import { NodemailerProvider }                   from '../providers/nodemailer.provider';
import { EmailProvider, EMAIL_PROVIDER }         from '../interfaces/email-provider.interface';
import type { ConfigService }                    from '@nestjs/config';

// ── Module-level mock — must be before any imports of nodemailer ──────────────
jest.mock('nodemailer');
import * as nodemailer from 'nodemailer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    SMTP_HOST:    'smtp.example.com',
    SMTP_PORT:    587,
    SMTP_FROM:    'noreply@example.com',
    SMTP_SECURE:  'false',
    SMTP_TIMEOUT_MS: 10000,
    ...overrides,
  };
  return {
    get:        (key: string, def?: unknown) => (values[key] !== undefined ? values[key] : def),
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`Missing config: ${key}`);
      return values[key];
    },
  } as unknown as ConfigService;
}

const mockCreateTransport = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>;

function setTransporterBehaviour(opts: {
  verifyResult?: 'ok' | Error;
  sendResult?:   { messageId: string } | Error;
} = {}) {
  const transport = {
    verify:   jest.fn().mockImplementation(() =>
      opts.verifyResult instanceof Error
        ? Promise.reject(opts.verifyResult)
        : Promise.resolve(true),
    ),
    sendMail: jest.fn().mockImplementation(() =>
      opts.sendResult instanceof Error
        ? Promise.reject(opts.sendResult)
        : Promise.resolve(opts.sendResult ?? { messageId: '<msg-id@example.com>' }),
    ),
  };
  mockCreateTransport.mockReturnValue(transport as never);
  return transport;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NodemailerProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Interface / token ─────────────────────────────────────────────────────

  it('extends EmailProvider abstract class', () => {
    const provider = new NodemailerProvider(makeConfig());
    expect(provider).toBeInstanceOf(EmailProvider);
  });

  it('EMAIL_PROVIDER token is the string constant "EMAIL_PROVIDER"', () => {
    expect(typeof EMAIL_PROVIDER).toBe('string');
    expect(EMAIL_PROVIDER).toBe('EMAIL_PROVIDER');
  });

  // ── onModuleInit — initialisation ─────────────────────────────────────────

  describe('onModuleInit()', () => {
    it('creates a transporter when SMTP_HOST is set', async () => {
      setTransporterBehaviour();
      const provider = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();
      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    });

    it('passes SMTP_URL as the first argument when set', async () => {
      setTransporterBehaviour();
      const config = makeConfig({
        SMTP_URL:  'smtp://user:pass@smtp.example.com:587',
        SMTP_HOST: undefined,
      });
      const provider = new NodemailerProvider(config);
      await provider.onModuleInit();

      const firstArg = mockCreateTransport.mock.calls[0]![0];
      expect(typeof firstArg).toBe('string');
      expect(firstArg as string).toContain('smtp://');
    });

    it('does NOT create a transporter when neither SMTP_HOST nor SMTP_URL is set', async () => {
      const provider = new NodemailerProvider(
        makeConfig({ SMTP_HOST: undefined, SMTP_URL: undefined }),
      );
      await provider.onModuleInit();
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('is non-fatal when transporter.verify() rejects', async () => {
      setTransporterBehaviour({ verifyResult: new Error('ECONNREFUSED') });
      const provider = new NodemailerProvider(makeConfig());
      await expect(provider.onModuleInit()).resolves.toBeUndefined();
    });

    it('calls transporter.verify() exactly once on init', async () => {
      const transport = setTransporterBehaviour();
      const provider  = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();
      expect(transport.verify).toHaveBeenCalledTimes(1);
    });
  });

  // ── send() ────────────────────────────────────────────────────────────────

  describe('send()', () => {
    it('returns {success:false} when SMTP is not configured', async () => {
      const provider = new NodemailerProvider(
        makeConfig({ SMTP_HOST: undefined, SMTP_URL: undefined }),
      );
      await provider.onModuleInit();

      const result = await provider.send({ to: 'a@b.com', subject: 'Test', html: '<p>x</p>' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP not configured');
    });

    it('returns {success:true, messageId} on successful send', async () => {
      setTransporterBehaviour({ sendResult: { messageId: '<abc@example.com>' } });
      const provider = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      const result = await provider.send({
        to:      'user@example.com',
        subject: 'Hello',
        html:    '<p>Hello!</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<abc@example.com>');
    });

    it('returns {success:false, error} when sendMail throws', async () => {
      setTransporterBehaviour({ sendResult: new Error('Connection timeout') });
      const provider = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      const result = await provider.send({ to: 'a@b.com', subject: 'T', html: '<p>x</p>' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });

    it('returns {success:false} when both html and text are absent', async () => {
      setTransporterBehaviour();
      const provider = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      const result = await provider.send({ to: 'a@b.com', subject: 'No body' } as never);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/html|text/i);
    });

    it('uses message.from when provided', async () => {
      const transport = setTransporterBehaviour();
      const provider  = new NodemailerProvider(makeConfig({ SMTP_FROM: 'default@example.com' }));
      await provider.onModuleInit();

      await provider.send({ to: 'a@b.com', subject: 'S', text: 'T', from: 'custom@example.com' });
      const opts = (transport.sendMail.mock.calls[0] as [{ from: string }])[0];
      expect(opts.from).toBe('custom@example.com');
    });

    it('falls back to SMTP_FROM when message.from is absent', async () => {
      const transport = setTransporterBehaviour();
      const provider  = new NodemailerProvider(makeConfig({ SMTP_FROM: 'default@example.com' }));
      await provider.onModuleInit();

      await provider.send({ to: 'a@b.com', subject: 'S', text: 'T' });
      const opts = (transport.sendMail.mock.calls[0] as [{ from: string }])[0];
      expect(opts.from).toBe('default@example.com');
    });

    it('joins array recipients into a comma-separated string', async () => {
      const transport = setTransporterBehaviour();
      const provider  = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      await provider.send({ to: ['a@b.com', 'c@d.com'], subject: 'Multi', text: 'Hi' });
      const opts = (transport.sendMail.mock.calls[0] as [{ to: string }])[0];
      expect(opts.to).toBe('a@b.com, c@d.com');
    });

    it('passes replyTo when provided', async () => {
      const transport = setTransporterBehaviour();
      const provider  = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      await provider.send({ to: 'a@b.com', subject: 'S', text: 'T', replyTo: 'reply@example.com' });
      const opts = (transport.sendMail.mock.calls[0] as [{ replyTo?: string }])[0];
      expect(opts.replyTo).toBe('reply@example.com');
    });

    it('omits replyTo when not provided', async () => {
      const transport = setTransporterBehaviour();
      const provider  = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      await provider.send({ to: 'a@b.com', subject: 'S', text: 'T' });
      const opts = (transport.sendMail.mock.calls[0] as [{ replyTo?: string }])[0];
      expect(opts.replyTo).toBeUndefined();
    });

    it('accepts a text-only message (no html)', async () => {
      setTransporterBehaviour();
      const provider = new NodemailerProvider(makeConfig());
      await provider.onModuleInit();

      const result = await provider.send({ to: 'a@b.com', subject: 'S', text: 'Plain text only' });
      expect(result.success).toBe(true);
    });
  });
});
