import type {
  Notification,
  CreateNotificationDto,
  CreateTemplateDto,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('communication');

/**
 * CommunicationClient — typed client for communication-service.
 *
 * Covers: notifications, bulk messaging, template management.
 */
export const CommunicationClient = {

  // ── Notifications ─────────────────────────────────────────────────────────

  async sendNotification(
    dto: CreateNotificationDto,
    ctx: RequestContext,
  ): Promise<Notification> {
    return http.post<Notification>('/notifications', dto, ctx);
  },

  async sendBulkNotification(
    dto: { recipientIds: string[]; channel: string; subject?: string; body: string },
    ctx: RequestContext,
  ): Promise<{ queued: number; failed: number }> {
    return http.post('/notifications/bulk', dto, ctx);
  },

  async getNotificationById(
    notificationId: string,
    ctx: RequestContext,
  ): Promise<Notification> {
    return http.get<Notification>(`/notifications/${notificationId}`, ctx);
  },

  async listNotifications(
    params: {
      page?: number;
      limit?: number;
      recipientId?: string;
      channel?: string;
      status?: string;
    },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Notification>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<Notification>>(
      `/notifications${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async retryNotification(
    notificationId: string,
    ctx: RequestContext,
  ): Promise<Notification> {
    return http.post<Notification>(`/notifications/${notificationId}/retry`, {}, ctx);
  },

  // ── Templates ─────────────────────────────────────────────────────────────

  async createTemplate(
    dto: CreateTemplateDto,
    ctx: RequestContext,
  ): Promise<{ id: string; name: string; type: string }> {
    return http.post('/templates', dto, ctx);
  },

  async getTemplateById(
    templateId: string,
    ctx: RequestContext,
  ): Promise<{ id: string; name: string; type: string; body: string }> {
    return http.get(`/templates/${templateId}`, ctx);
  },

  async listTemplates(
    params: { page?: number; limit?: number; type?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<{ id: string; name: string; type: string }>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<{ id: string; name: string; type: string }>>(
      `/templates${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async updateTemplate(
    templateId: string,
    dto: Partial<CreateTemplateDto>,
    ctx: RequestContext,
  ): Promise<{ id: string; name: string; type: string }> {
    return http.patch(`/templates/${templateId}`, dto, ctx);
  },

  async deleteTemplate(templateId: string, ctx: RequestContext): Promise<void> {
    return http.delete<void>(`/templates/${templateId}`, ctx);
  },

  // ── Preview ───────────────────────────────────────────────────────────────

  async previewTemplate(
    templateId: string,
    variables: Record<string, string>,
    ctx: RequestContext,
  ): Promise<{ subject?: string; body: string }> {
    return http.post(`/templates/${templateId}/preview`, { variables }, ctx);
  },
};
