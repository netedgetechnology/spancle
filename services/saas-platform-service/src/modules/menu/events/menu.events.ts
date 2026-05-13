export enum MenuEventNames {
  CREATED = 'spancle.cms.menu.created',
  UPDATED = 'spancle.cms.menu.updated',
  DELETED = 'spancle.cms.menu.deleted',
}

export interface MenuEventPayload {
  tenantId:  string;
  menuId:    string;
  actorId:   string;
  handle?:   string;
  timestamp: string;
}
