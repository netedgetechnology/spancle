/**
 * WalletEvents — domain event constants for the wallet domain.
 * All events namespaced under spancle.wallet.*
 */
export enum WalletEvents {
  CREATED = 'spancle.wallet.created',
  UPDATED = 'spancle.wallet.updated',
  DELETED = 'spancle.wallet.deleted',
  STATUS_CHANGED = 'spancle.wallet.status_changed',
}

export interface WalletEventPayload {
  tenantId: string;
  walletId: string;
  actorId?: string;
  timestamp?: string;
}

export interface WalletStatusChangedPayload extends WalletEventPayload {
  previousStatus: string;
  newStatus: string;
}
