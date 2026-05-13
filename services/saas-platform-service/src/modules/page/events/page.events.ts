export enum PageEventNames {
  CREATED    = 'spancle.cms.page.created',
  UPDATED    = 'spancle.cms.page.updated',
  PUBLISHED  = 'spancle.cms.page.published',
  ARCHIVED   = 'spancle.cms.page.archived',
  DELETED    = 'spancle.cms.page.deleted',
}

export interface PageEventPayload {
  tenantId:  string;
  pageId:    string;
  actorId:   string;
  slug?:     string;
  timestamp: string;
}
