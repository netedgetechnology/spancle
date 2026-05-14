import type { Notification, CreateNotificationDto, CreateTemplateDto, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * CommunicationClient — typed client for communication-service.
 *
 * Covers: notifications, bulk messaging, template management.
 */
export declare const CommunicationClient: {
    sendNotification(dto: CreateNotificationDto, ctx: RequestContext): Promise<Notification>;
    sendBulkNotification(dto: {
        recipientIds: string[];
        channel: string;
        subject?: string;
        body: string;
    }, ctx: RequestContext): Promise<{
        queued: number;
        failed: number;
    }>;
    getNotificationById(notificationId: string, ctx: RequestContext): Promise<Notification>;
    listNotifications(params: {
        page?: number;
        limit?: number;
        recipientId?: string;
        channel?: string;
        status?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Notification>>;
    retryNotification(notificationId: string, ctx: RequestContext): Promise<Notification>;
    createTemplate(dto: CreateTemplateDto, ctx: RequestContext): Promise<{
        id: string;
        name: string;
        type: string;
    }>;
    getTemplateById(templateId: string, ctx: RequestContext): Promise<{
        id: string;
        name: string;
        type: string;
        body: string;
    }>;
    listTemplates(params: {
        page?: number;
        limit?: number;
        type?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<{
        id: string;
        name: string;
        type: string;
    }>>;
    updateTemplate(templateId: string, dto: Partial<CreateTemplateDto>, ctx: RequestContext): Promise<{
        id: string;
        name: string;
        type: string;
    }>;
    deleteTemplate(templateId: string, ctx: RequestContext): Promise<void>;
    previewTemplate(templateId: string, variables: Record<string, string>, ctx: RequestContext): Promise<{
        subject?: string;
        body: string;
    }>;
};
//# sourceMappingURL=communication.client.d.ts.map