import { supabase } from '../lib/supabase';

interface WorkOrderPayload {
    id: string;
    order_number?: string | number;
    title: string;
    description: string;
    priority: string;
    status: string;
    maintenance_category?: string;
    assetId?: string;
    locationId?: string;
    assignedTo?: string;
    requesterId?: string; // ID of the user who requested the work order
    technical_report?: string;
    technicianName?: string;
    maintenance_type?: string;
    estimated_hours?: number;
    scheduled_at?: string;
}

interface UserPayload {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
}

export const NotificationService = {
    async notifyWorkOrderCreated(workOrder: WorkOrderPayload) {
        await this.sendWebhook('work_order_created', workOrder);
    },

    async notifyWorkOrderUpdated(workOrder: WorkOrderPayload) {
        await this.sendWebhook('work_order_updated', workOrder);
    },

    async notifyWorkOrderReopened(workOrder: WorkOrderPayload) {
        await this.sendWebhook('work_order_reopened', workOrder);
    },

    async notifyWorkOrderCancelled(workOrder: WorkOrderPayload, adminName?: string) {
        await this.sendWebhook('work_order_cancelled', workOrder, adminName);
    },

    async notifyUserRegistered(user: UserPayload) {
        await this.sendUserWebhook('user_registered', user);
    },

    async notifyUserApproved(user: UserPayload) {
        await this.sendUserWebhook('user_approved', user);
    },

    async notifyUserRejected(user: UserPayload) {
        await this.sendUserWebhook('user_rejected', user);
    },

    async notifyPasswordResetRequest(user: UserPayload, resetToken: string) {
        try {
            const token = localStorage.getItem('auth_token');
            const resetUrl = `${window.location.origin}/#/reset-password?token=${resetToken}&email=${user.email}`;

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event: 'password_reset_request',
                    user,
                    reset_url: resetUrl
                },
                headers: token ? {
                    Authorization: `Bearer ${token}`
                } : {}
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error sending password reset notification:', error);
            return { success: false, error };
        }
    },

    async sendWebhook(event: string, workOrder: WorkOrderPayload, adminName?: string) {
        try {
            const token = localStorage.getItem('auth_token');
            console.log(`[NotificationService] Enviando webhook: ${event} para OS ${workOrder.id}`);

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event,
                    adminName,
                    workOrder: {
                        ...workOrder,
                        url: `${window.location.origin}/#/work-orders/${workOrder.id}`
                    },
                },
                headers: token ? {
                    Authorization: `Bearer ${token}`
                } : {}
            });

            if (error) {
                console.error(`[NotificationService] Erro invoke send-notification (${event}):`, error);
                throw error;
            }
            console.log(`[NotificationService] Resposta do webhook (${event}):`, data);
            return { success: true, data };
        } catch (error) {
            console.error(`[NotificationService] Exception em sendWebhook (${event}):`, error);
            return { success: false, error };
        }
    },

    async sendUserWebhook(event: string, user: UserPayload) {
        try {
            const token = localStorage.getItem('auth_token');
            console.log(`[NotificationService] Enviando webhook de usuário: ${event} para ${user.email}`);

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event,
                    user,
                },
                headers: token ? {
                    Authorization: `Bearer ${token}`
                } : {}
            });

            if (error) {
                console.error(`[NotificationService] Erro invoke send-notification (${event}):`, error);
                throw error;
            }
            console.log(`[NotificationService] Resposta do webhook de usuário (${event}):`, data);
            return { success: true, data };
        } catch (error) {
            console.error(`[NotificationService] Exception em sendUserWebhook (${event}):`, error);
            return { success: false, error };
        }
    },

    async notifyPasswordChanged(user: UserPayload) {
        await this.sendUserWebhook('password_changed', user);
    }
};
