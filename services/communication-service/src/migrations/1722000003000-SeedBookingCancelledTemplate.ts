import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * SeedBookingCancelledTemplate1722000003000
 *
 * Adds the system default booking_cancelled_email template.
 * Uses INSERT … ON CONFLICT DO NOTHING — idempotent, safe to replay.
 */
export class SeedBookingCancelledTemplate1722000003000 implements MigrationInterface {
  name = 'SeedBookingCancelledTemplate1722000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO templates
        (id, tenant_id, name, slug, channel, locale, subject, body_html, body_text, variables,
         is_deleted, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'system',
        'Booking Cancelled (Email / EN)',
        'booking_cancelled_email',
        'email',
        'en',
        'Your booking has been cancelled — {{booking.reference}}',
        $html$
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Cancelled</title></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin-bottom:4px">Booking cancelled</h1>
  <p style="color:#555;margin-top:0">Hi {{customer.name}},</p>
  <p>Your booking at <strong>{{venue.name}}</strong> has been cancelled.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 0;color:#555">Reference</td>
        <td style="padding:8px 0;font-family:monospace">{{booking.reference}}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Cancellation reason</td>
        <td style="padding:8px 0">{{booking.reason}}</td></tr>
  </table>
  <p>If you have questions or would like to rebook, please contact us.</p>
  <p style="color:#999;font-size:12px;margin-top:32px">
    — {{tenant.name}}
  </p>
</body>
</html>
$html$,
        $text$
Booking cancelled — {{booking.reference}}

Hi {{customer.name}},

Your booking at {{venue.name}} has been cancelled.

Reference : {{booking.reference}}
Reason    : {{booking.reason}}

If you have questions, please contact us.

— {{tenant.name}}
$text$,
        '{"customer.name":"string","booking.reference":"string","venue.name":"string","booking.reason":"string","tenant.name":"string"}',
        FALSE, NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM templates
      WHERE tenant_id = 'system' AND slug = 'booking_cancelled_email'
    `);
  }
}
