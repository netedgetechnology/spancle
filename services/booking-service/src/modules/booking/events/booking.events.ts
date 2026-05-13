export enum BookingEvents {
  CREATED              = 'spancle.booking.created',
  CONFIRMED            = 'spancle.booking.confirmed',
  CANCELLED            = 'spancle.booking.cancelled',
  COMPLETED            = 'spancle.booking.completed',
  NO_SHOW_MARKED       = 'spancle.booking.no_show_marked',
  NO_SHOW_WAIVED       = 'spancle.booking.no_show_waived',
  RESCHEDULED          = 'spancle.booking.rescheduled',
  REFUNDED             = 'spancle.booking.refunded',
  CHECKED_IN           = 'spancle.booking.checked_in',
  RECURRING_GENERATED  = 'spancle.booking.recurring_generated',
  UPDATED              = 'spancle.booking.updated',
  DELETED              = 'spancle.booking.deleted',
  STATUS_CHANGED       = 'spancle.booking.status_changed',
}

export interface BookingEventPayload {
  tenantId:   string;
  bookingId:  string;
  actorId?:   string | null;
  timestamp:  string;
}

export interface BookingStatusChangedPayload extends BookingEventPayload {
  previousStatus: string;
  newStatus:      string;
}

export interface BookingRescheduledPayload extends BookingEventPayload {
  previousSlotIds: string[];
  newSlotIds:      string[];
  reason?:         string | null;
}

export interface BookingRecurringGeneratedPayload extends BookingEventPayload {
  parentBookingId: string;
  generatedIds:    string[];
  frequency:       string;
}
