export enum PackageEventNames {
  CREATED    = 'spancle.package.created',
  UPDATED    = 'spancle.package.updated',
  PUBLISHED  = 'spancle.package.published',
  DEPRECATED = 'spancle.package.deprecated',
  ARCHIVED   = 'spancle.package.archived',
  DELETED    = 'spancle.package.deleted',
  SEEDED     = 'spancle.package.seeded',
}

export interface PackageEventPayload {
  packageId:  string;
  tierKey:    string;
  actorId:    string;
  timestamp:  string;
}

export interface PackageSeededPayload {
  count:     number;
  actorId:   string;
  timestamp: string;
}
