/**
 * EMAIL_QUEUE — BullMQ queue name for outbound email delivery.
 * Single queue; priority and delay are set per-job.
 */
export const EMAIL_QUEUE = 'email' as const;

/** Job name for template-rendered email delivery. */
export const EMAIL_JOB_SEND = 'send_email' as const;

/**
 * EmailJobData — the payload stored in the BullMQ job.
 *
 * notificationId  — FK to NotificationEntity; consumer updates status on completion.
 * tenantId        — required for TemplateRenderer lookup and for audit.
 * recipientEmail  — delivery address.
 * templateSlug    — slug passed to TemplateRenderer.resolve().
 * locale          — BCP-47 locale for template selection (default 'en').
 * variables       — template variable map (nested or flat).
 * channel         — always 'email' for EMAIL_QUEUE; carried for consistency.
 */
export interface EmailJobData {
  notificationId: string;
  tenantId:       string;
  recipientEmail: string;
  templateSlug:   string;
  locale:         string;
  variables:      Record<string, unknown>;
  channel:        'email';
}
