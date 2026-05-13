export enum BlogEventNames {
  POST_CREATED       = 'spancle.cms.blog.post.created',
  POST_UPDATED       = 'spancle.cms.blog.post.updated',
  POST_PUBLISHED     = 'spancle.cms.blog.post.published',
  POST_SCHEDULED     = 'spancle.cms.blog.post.scheduled',
  POST_ARCHIVED      = 'spancle.cms.blog.post.archived',
  POST_DELETED       = 'spancle.cms.blog.post.deleted',
  CATEGORY_CREATED   = 'spancle.cms.blog.category.created',
  CATEGORY_UPDATED   = 'spancle.cms.blog.category.updated',
  CATEGORY_DELETED   = 'spancle.cms.blog.category.deleted',
}

export interface BlogPostEventPayload {
  tenantId:   string;
  postId:     string;
  actorId:    string;
  slug?:      string;
  timestamp:  string;
}

export interface BlogPostScheduledPayload extends BlogPostEventPayload {
  scheduledFor: string; // ISO-8601
}

export interface BlogCategoryEventPayload {
  tenantId:    string;
  categoryId:  string;
  actorId:     string;
  timestamp:   string;
}
