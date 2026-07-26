import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddNotificationPreferencesAndTemplates1722000004000
 *
 * 1. Creates notification_preferences table (user opt-in/out per channel per type).
 * 2. Seeds 7 new system default email templates (idempotent — ON CONFLICT DO NOTHING):
 *    - booking_rescheduled_email
 *    - booking_expired_email
 *    - booking_reminder_email
 *    - waitlist_promoted_email
 *    - guest_booking_email
 *    - payment_failed_email
 *    - membership_expiry_email
 */
export class AddNotificationPreferencesAndTemplates1722000004000 implements MigrationInterface {
  name = 'AddNotificationPreferencesAndTemplates1722000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Notification preferences table ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id           UUID          NOT NULL,
        user_id             UUID          NOT NULL,
        notification_type   VARCHAR(80)   NOT NULL,
        enable_email        BOOLEAN       NOT NULL DEFAULT TRUE,
        enable_sms          BOOLEAN       NOT NULL DEFAULT TRUE,
        enable_push         BOOLEAN       NOT NULL DEFAULT TRUE,
        enable_in_app       BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_notif_pref_user_type UNIQUE (tenant_id, user_id, notification_type)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences (tenant_id, user_id)`);

    // ── 2. booking_rescheduled_email ───────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Booking Rescheduled (Email / EN)', 'booking_rescheduled_email', 'email', 'en',
        'Your booking has been rescheduled — {{booking.reference}}',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Booking rescheduled</h1>
  <p>Hi {{customer.name}},</p>
  <p>Your booking at <strong>{{venue.name}}</strong> has been rescheduled.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td><td style="font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">New time</td><td>{{booking.newStartsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Duration</td><td>{{booking.durationMins}} min</td></tr>
    <tr><td style="padding:8px 0;color:#555">Court</td><td>{{court.name}}</td></tr>
    {{#if booking.reason}}<tr><td style="padding:8px 0;color:#555">Reason</td><td>{{booking.reason}}</td></tr>{{/if}}
  </table>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Booking rescheduled — {{booking.reference}}\n\nHi {{customer.name}},\n\nNew time: {{booking.newStartsAt}}\nDuration: {{booking.durationMins}} min\nCourt: {{court.name}}\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","booking.reference":"string","booking.newStartsAt":"string","booking.durationMins":"string","court.name":"string","venue.name":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // ── 3. booking_expired_email ───────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Booking Expired (Email / EN)', 'booking_expired_email', 'email', 'en',
        'Your booking reservation has expired — {{booking.reference}}',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Reservation expired</h1>
  <p>Hi {{customer.name}},</p>
  <p>Your booking reservation at <strong>{{venue.name}}</strong> has expired because payment was not received in time.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td><td style="font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Slot time</td><td>{{booking.startsAt}}</td></tr>
  </table>
  <p>The slot has been released and is available for others to book. You are welcome to try again.</p>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Reservation expired — {{booking.reference}}\n\nHi {{customer.name}},\n\nYour reservation at {{venue.name}} expired ({{booking.startsAt}}).\nThe slot has been released.\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","booking.reference":"string","booking.startsAt":"string","venue.name":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // ── 4. booking_reminder_email ──────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Booking Reminder (Email / EN)', 'booking_reminder_email', 'email', 'en',
        'Reminder: your booking is coming up — {{booking.reference}}',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Booking reminder</h1>
  <p>Hi {{customer.name}},</p>
  <p>This is a reminder for your upcoming booking at <strong>{{venue.name}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td><td style="font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Date &amp; time</td><td>{{booking.startsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Duration</td><td>{{booking.durationMins}} min</td></tr>
    <tr><td style="padding:8px 0;color:#555">Court</td><td>{{court.name}}</td></tr>
  </table>
  <p>We look forward to seeing you!</p>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Booking reminder — {{booking.reference}}\n\nHi {{customer.name}},\n\nDate &amp; time: {{booking.startsAt}}\nDuration: {{booking.durationMins}} min\nCourt: {{court.name}}\nVenue: {{venue.name}}\n\nSee you there!\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","booking.reference":"string","booking.startsAt":"string","booking.durationMins":"string","court.name":"string","venue.name":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // ── 5. waitlist_promoted_email ─────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Waitlist Promoted (Email / EN)', 'waitlist_promoted_email', 'email', 'en',
        'Great news — a slot is now available for you!',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Your slot is available!</h1>
  <p>Hi {{customer.name}},</p>
  <p>Good news! A slot you were waiting for at <strong>{{venue.name}}</strong> has opened up.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Court</td><td>{{slot.courtName}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Time</td><td>{{slot.startsAt}} – {{slot.endsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Reserved for you until</td><td>{{slot.reservedFor}}</td></tr>
  </table>
  <p><strong>Please book now before the reservation expires.</strong></p>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Waitlist slot available!\n\nHi {{customer.name}},\n\nA slot at {{venue.name}} is now available:\nCourt: {{slot.courtName}}\nTime: {{slot.startsAt}} – {{slot.endsAt}}\nReserved until: {{slot.reservedFor}}\n\nPlease book now before the reservation expires.\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","slot.courtName":"string","slot.startsAt":"string","slot.endsAt":"string","slot.reservedFor":"string","venue.name":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // ── 6. guest_booking_email ─────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Guest Booking Confirmation (Email / EN)', 'guest_booking_email', 'email', 'en',
        'Your guest booking is confirmed — {{booking.reference}}',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Booking confirmed</h1>
  <p>Hi {{customer.name}},</p>
  <p>Your guest booking at <strong>{{venue.name}}</strong> is confirmed.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td><td style="font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Date &amp; time</td><td>{{booking.startsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Duration</td><td>{{booking.durationMins}} min</td></tr>
    <tr><td style="padding:8px 0;color:#555">Court</td><td>{{court.name}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Total paid</td><td>{{booking.totalPrice}}</td></tr>
  </table>
  <p>Look up your booking anytime: <a href="{{booking.lookupUrl}}">{{booking.lookupUrl}}</a></p>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Guest booking confirmed — {{booking.reference}}\n\nHi {{customer.name}},\n\nDate: {{booking.startsAt}}\nCourt: {{court.name}}\nVenue: {{venue.name}}\nTotal: {{booking.totalPrice}}\n\nLook up your booking: {{booking.lookupUrl}}\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","booking.reference":"string","booking.startsAt":"string","booking.durationMins":"string","court.name":"string","booking.totalPrice":"string","booking.lookupUrl":"string","venue.name":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // ── 7. payment_failed_email ────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Payment Failed (Email / EN)', 'payment_failed_email', 'email', 'en',
        'Payment unsuccessful — action required',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;color:#c0392b">Payment unsuccessful</h1>
  <p>Hi {{customer.name}},</p>
  <p>We were unable to process your payment for booking <strong>{{booking.reference}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Booking</td><td style="font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Slot time</td><td>{{booking.startsAt}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Reason</td><td>{{payment.failureReason}}</td></tr>
  </table>
  <p>Please <a href="mailto:{{tenant.supportEmail}}">contact us</a> or try booking again.</p>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Payment unsuccessful — {{booking.reference}}\n\nHi {{customer.name}},\n\nWe could not process payment for {{booking.reference}} ({{booking.startsAt}}).\nReason: {{payment.failureReason}}\n\nPlease contact us at {{tenant.supportEmail}}.\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","booking.reference":"string","booking.startsAt":"string","payment.failureReason":"string","tenant.supportEmail":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // ── 8. membership_expiry_email ─────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO templates (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables, is_deleted, created_at, updated_at)
      VALUES (gen_random_uuid(), 'system', 'Membership Expiry Reminder (Email / EN)', 'membership_expiry_email', 'email', 'en',
        'Your membership expires in {{membership.daysRemaining}} day(s) — renew now',
        $h$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Membership expiry reminder</h1>
  <p>Hi {{customer.name}},</p>
  <p>Your <strong>{{membership.planName}}</strong> membership expires in <strong>{{membership.daysRemaining}} day(s)</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Member number</td><td style="font-family:monospace">{{membership.memberNumber}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Expires</td><td>{{membership.expiresAt}}</td></tr>
  </table>
  <p>Renew your membership to continue enjoying member benefits.</p>
  <p style="color:#999;font-size:12px">— {{tenant.name}}</p>
</body></html>$h$,
        $t$Membership expiry reminder\n\nHi {{customer.name}},\n\nYour {{membership.planName}} membership ({{membership.memberNumber}}) expires in {{membership.daysRemaining}} day(s) on {{membership.expiresAt}}.\n\nPlease renew to keep your benefits.\n\n— {{tenant.name}}$t$,
        '{"customer.name":"string","membership.planName":"string","membership.daysRemaining":"string","membership.memberNumber":"string","membership.expiresAt":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM templates WHERE tenant_id = 'system' AND slug IN ('booking_rescheduled_email','booking_expired_email','booking_reminder_email','waitlist_promoted_email','guest_booking_email','payment_failed_email','membership_expiry_email')`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notif_pref_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_preferences`);
  }
}
