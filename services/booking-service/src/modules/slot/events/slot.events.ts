/**
 * slot.events.ts — All domain event names and payloads for the slot engine.
 * Namespaced under spancle.slot.* and spancle.holiday.*
 */

export enum SlotEvents {
  CREATED         = 'spancle.slot.created',
  UPDATED         = 'spancle.slot.updated',
  DELETED         = 'spancle.slot.deleted',
  BULK_DELETED    = 'spancle.slot.bulk_deleted',
  STATUS_CHANGED  = 'spancle.slot.status_changed',
  BULK_GENERATED  = 'spancle.slot.bulk_generated',
  RESERVED        = 'spancle.slot.reserved',
  RESERVATION_EXPIRED = 'spancle.slot.reservation_expired',
}

export interface SlotEventPayload {
  tenantId:  string;
  slotId:    string;
  actorId?:  string;
  timestamp: string;
}

export interface SlotStatusChangedPayload extends SlotEventPayload {
  previousStatus: string;
  newStatus:      string;
}

export interface SlotBulkGeneratedPayload {
  tenantId:  string;
  courtId:   string;
  venueId:   string | null;
  branchId:  string;
  count:     number;
  slotIds:   string[];
  actorId:   string;
  timestamp: string;
}

export interface SlotBulkDeletedPayload {
  tenantId:  string;
  courtId:   string;
  venueId:   string | null;
  branchId:  string;
  count:     number;
  slotIds:   string[];
  actorId:   string;
  timestamp: string;
}
