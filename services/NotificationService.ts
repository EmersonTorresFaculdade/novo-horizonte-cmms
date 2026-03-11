import { supabase } from '../lib/supabase';

interface WorkOrderPayload {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    assetId: string;
    locationId: string;
    assignedTo?: string;
    requesterId?: string; // ID of the user who requested the work order
    technical_report?: string;
    technicianName?: string;
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
            const { data: { session } } = await supabase.auth.getSession();
            const resetUrl = `${window.location.origin}/#/reset-password?token=${resetToken}&email=${user.email}`;

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event: 'password_reset_request',
                    user,
                    reset_url: resetUrl
                },
                headers: session ? {
                    Authorization: `Bearer ${session.access_token}`
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
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event,
                    adminName,
                    workOrder: {
                        ...workOrder,
                        url: `${window.location.origin}/#/work-orders/${workOrder.id}`
                    },
                },
                headers: session ? {
                    Authorization: `Bearer ${session.access_token}`
                } : {}
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error sending notification webhook:', error);
            return { success: false, error };
        }
    },

    async sendUserWebhook(event: string, user: UserPayload) {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event,
                    user,
                },
                headers: session ? {
                    Authorization: `Bearer ${session.access_token}`
                } : {}
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error sending user notification webhook:', error);
            return { success: false, error };
        }
    }
};
