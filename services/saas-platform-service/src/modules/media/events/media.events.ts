export enum MediaEventNames {
  UPLOADED = 'spancle.cms.media.uploaded',
  UPDATED  = 'spancle.cms.media.updated',
  DELETED  = 'spancle.cms.media.deleted',
}

export interface MediaEventPayload {
  tenantId:    string;
  assetId:     string;
  actorId:     string;
  assetType?:  string;
  timestamp:   string;
}
