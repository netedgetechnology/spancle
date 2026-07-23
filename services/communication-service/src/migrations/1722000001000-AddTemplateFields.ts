import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddTemplateFields1722000001000
 *
 * Adds slug, channel, locale, subject, body_html, body_text, variables
 * to the templates table and drops the scaffolding-only description column.
 *
 * Also seeds three system default templates used by the communication-service.
 * Seeds use INSERT … ON CONFLICT DO NOTHING — safe to replay.
 *
 * Unique constraint: (tenant_id, slug, channel, locale)
 * Reserved tenantId: 'system' for platform defaults.
 */
export class AddTemplateFields1722000001000 implements MigrationInterface {
  name = 'AddTemplateFields1722000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Add new columns ────────────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS slug      VARCHAR(100)  NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS channel   VARCHAR(20)   NOT NULL DEFAULT 'email',
        ADD COLUMN IF NOT EXISTS locale    VARCHAR(10)   NOT NULL DEFAULT 'en',
        ADD COLUMN IF NOT EXISTS subject   TEXT          NULL,
        ADD COLUMN IF NOT EXISTS body_html TEXT          NULL,
        ADD COLUMN IF NOT EXISTS body_text TEXT          NULL,
        ADD COLUMN IF NOT EXISTS variables JSONB         NULL DEFAULT '{}'
    `);

    // ── 2. Drop scaffolding-only column (if it exists) ───────────────────

    await queryRunner.query(`
      ALTER TABLE templates
        DROP COLUMN IF EXISTS description
    `);

    // ── 3. Unique constraint for lookup key ───────────────────────────────

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        ux_templates_tenant_slug_channel_locale
      ON templates (tenant_id, slug, channel, locale)
      WHERE is_deleted = FALSE
    `);

    // ── 4. Seed system default templates ──────────────────────────────────
    // tenantId = 'system' is reserved for platform defaults.
    // ON CONFLICT DO NOTHING — idempotent, safe to replay.

    await queryRunner.query(`
      INSERT INTO templates
        (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables,
         is_deleted, created_at, updated_at)
      VALUES
        (
          gen_random_uuid(),
          'system',
          'Booking Confirmed (Email / EN)',
          'booking_confirmed_email',
          'email',
          'en',
          'Your booking is confirmed — {{booking.reference}}',
          $html_booking_confirmed$
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Confirmed</title></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin-bottom:4px">Booking confirmed! 🎾</h1>
  <p style="color:#555;margin-top:0">Hi {{customer.name}},</p>
  <p>Your booking at <strong>{{venue.name}}</strong> is confirmed.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td>
        <td style="padding:8px 0;font-weight:600;font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Court</td>
        <td style="padding:8px 0">{{court.name}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Date &amp; time</td>
        <td style="padding:8px 0">{{booking.startsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Duration</td>
        <td style="padding:8px 0">{{booking.durationMins}} minutes</td></tr>
    <tr><td style="padding:8px 0;color:#555">Total</td>
        <td style="padding:8px 0">{{booking.totalPrice}}</td></tr>
  </table>
  <p>Present this reference at the venue to check in. See you on the court!</p>
  <p style="color:#999;font-size:12px;margin-top:32px">
    This is an automated message from {{tenant.name}}.
    If you have questions, contact us at {{tenant.supportEmail}}.
  </p>
</body>
</html>
$html_booking_confirmed$,
          $text_booking_confirmed$
Booking confirmed — {{booking.reference}}

Hi {{customer.name}},

Your booking at {{venue.name}} is confirmed.

Reference : {{booking.reference}}
Court     : {{court.name}}
Date/time : {{booking.startsAt}}
Duration  : {{booking.durationMins}} minutes
Total     : {{booking.totalPrice}}

Present this reference at the venue to check in.

— {{tenant.name}}
$text_booking_confirmed$,
          '{"customer.name":"string","booking.reference":"string","venue.name":"string","court.name":"string","booking.startsAt":"string","booking.durationMins":"string","booking.totalPrice":"string","tenant.name":"string","tenant.supportEmail":"string"}',
          FALSE, NOW(), NOW()
        ),
        (
          gen_random_uuid(),
          'system',
          'Payment Received (Email / EN)',
          'payment_received_email',
          'email',
          'en',
          'Payment received — {{booking.reference}}',
          $html_payment_received$
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Payment Received</title></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin-bottom:4px">Payment received ✅</h1>
  <p style="color:#555;margin-top:0">Hi {{customer.name}},</p>
  <p>We received your payment of <strong>{{payment.amount}}</strong> for booking <strong>{{booking.reference}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Booking</td>
        <td style="padding:8px 0;font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Amount paid</td>
        <td style="padding:8px 0;font-weight:600">{{payment.amount}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Payment ID</td>
        <td style="padding:8px 0;font-family:monospace;font-size:12px">{{payment.id}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Date</td>
        <td style="padding:8px 0">{{payment.date}}</td></tr>
  </table>
  <p style="color:#999;font-size:12px;margin-top:32px">
    — {{tenant.name}}
  </p>
</body>
</html>
$html_payment_received$,
          $text_payment_received$
Payment received — {{booking.reference}}

Hi {{customer.name}},

We received your payment of {{payment.amount}} for booking {{booking.reference}}.

Booking  : {{booking.reference}}
Amount   : {{payment.amount}}
ID       : {{payment.id}}
Date     : {{payment.date}}

— {{tenant.name}}
$text_payment_received$,
          '{"customer.name":"string","booking.reference":"string","payment.amount":"string","payment.id":"string","payment.date":"string","tenant.name":"string"}',
          FALSE, NOW(), NOW()
        ),
        (
          gen_random_uuid(),
          'system',
          'Guest Booking Confirmed (Email / EN)',
          'guest_booking_confirmed_email',
          'email',
          'en',
          'Your guest booking — {{booking.reference}}',
          $html_guest_booking_confirmed$
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Guest Booking Confirmed</title></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin-bottom:4px">Booking confirmed! 🎾</h1>
  <p style="color:#555;margin-top:0">Hi {{customer.name}},</p>
  <p>Your guest booking at <strong>{{venue.name}}</strong> is confirmed.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td>
        <td style="padding:8px 0;font-weight:600;font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Court</td>
        <td style="padding:8px 0">{{court.name}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Date &amp; time</td>
        <td style="padding:8px 0">{{booking.startsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Duration</td>
        <td style="padding:8px 0">{{booking.durationMins}} minutes</td></tr>
    <tr><td style="padding:8px 0;color:#555">Total</td>
        <td style="padding:8px 0">{{booking.totalPrice}}</td></tr>
  </table>
  <p>
    <strong>View your booking:</strong>
    <a href="{{guest.lookupUrl}}">{{guest.lookupUrl}}</a>
  </p>
  <p>
    Save time next time —
    <a href="{{tenant.registerUrl}}">create a free account</a>
    to manage bookings, view history, and check in faster.
  </p>
  <p style="color:#999;font-size:12px;margin-top:32px">
    This is an automated message from {{tenant.name}}.
  </p>
</body>
</html>
$html_guest_booking_confirmed$,
          $text_guest_booking_confirmed$
Booking confirmed — {{booking.reference}}

Hi {{customer.name}},

Your guest booking at {{venue.name}} is confirmed.

Reference : {{booking.reference}}
Court     : {{court.name}}
Date/time : {{booking.startsAt}}
Duration  : {{booking.durationMins}} minutes
Total     : {{booking.totalPrice}}

View your booking: {{guest.lookupUrl}}

Create a free account: {{tenant.registerUrl}}

— {{tenant.name}}
$text_guest_booking_confirmed$,
          '{"customer.name":"string","booking.reference":"string","venue.name":"string","court.name":"string","booking.startsAt":"string","booking.durationMins":"string","booking.totalPrice":"string","guest.lookupUrl":"string","tenant.registerUrl":"string","tenant.name":"string"}',
          FALSE, NOW(), NOW()
        )
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded system templates
    await queryRunner.query(`
      DELETE FROM templates
      WHERE tenant_id = 'system'
        AND slug IN (
          'booking_confirmed_email',
          'payment_received_email',
          'guest_booking_confirmed_email'
        )
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS ux_templates_tenant_slug_channel_locale
    `);

    await queryRunner.query(`
      ALTER TABLE templates
        DROP COLUMN IF EXISTS variables,
        DROP COLUMN IF EXISTS body_text,
        DROP COLUMN IF EXISTS body_html,
        DROP COLUMN IF EXISTS subject,
        DROP COLUMN IF EXISTS locale,
        DROP COLUMN IF EXISTS channel,
        DROP COLUMN IF EXISTS slug,
        ADD COLUMN IF NOT EXISTS description TEXT NULL
    `);
  }
}
