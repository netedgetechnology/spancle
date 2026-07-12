/**
 * Dispute domain events — emitted by DisputeService only.
 * Follows the existing spancle.finance.* convention.
 * Finance Outbox relay is deferred to Batch 7.5.
 */
export enum DisputeEvents {
  OPENED        = 'spancle.finance.dispute_opened',
  UNDER_REVIEW  = 'spancle.finance.dispute_under_review',
  WON           = 'spancle.finance.dispute_won',
  LOST          = 'spancle.finance.dispute_lost',
  CANCELLED     = 'spancle.finance.dispute_cancelled',
}

// ── Payload interfaces ────────────────────────────────────────────────────────

export interface DisputeEventBase {
  tenantId:           string;
  disputeId:          string;
  disputeNumber:      string | null;
  paymentId:          string;
  gatewayDisputeId:   string;
  disputedAmountMinor: number;
  currency:           string;
  status:             string;
  timestamp:          string;
}

export interface DisputeOpenedPayload extends DisputeEventBase {
  feeAmountMinor:   number;
  reason:           string;
  evidenceDueAt:    string | null;
  journalEntryId:   string;
}

export interface DisputeWonPayload extends DisputeEventBase {
  resolutionJournalEntryId: string;
}

export interface DisputeLostPayload extends DisputeEventBase {
  resolutionJournalEntryId: string;
}

export interface DisputeCancelledPayload extends DisputeEventBase {
  reason: string | null;
}
