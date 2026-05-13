/**
 * TemplateEvents — domain event constants for the template domain.
 * All events namespaced under spancle.template.*
 */
export enum TemplateEvents {
  CREATED = 'spancle.template.created',
  UPDATED = 'spancle.template.updated',
  DELETED = 'spancle.template.deleted',
  STATUS_CHANGED = 'spancle.template.status_changed',
}

export interface TemplateEventPayload {
  tenantId: string;
  templateId: string;
  actorId?: string;
  timestamp?: string;
}

export interface TemplateStatusChangedPayload extends TemplateEventPayload {
  previousStatus: string;
  newStatus: string;
}
