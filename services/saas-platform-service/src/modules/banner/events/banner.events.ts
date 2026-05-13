export enum BannerEventNames {
  CREATED   = 'spancle.cms.banner.created',
  UPDATED   = 'spancle.cms.banner.updated',
  ACTIVATED = 'spancle.cms.banner.activated',
  DELETED   = 'spancle.cms.banner.deleted',
}

export interface BannerEventPayload {
  tenantId:  string;
  bannerId:  string;
  actorId:   string;
  timestamp: string;
}
