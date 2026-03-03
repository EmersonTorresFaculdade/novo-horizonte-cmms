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

    async sendWebhook(event: string, workOrder: WorkOrderPayload, adminName?: string) {
        try {
            // Get session if available, but don't strictly block (Edge Function might have its own auth check or be public)
            const { data: { session } } = await supabase.auth.getSession();

            console.log(`DEBUG: Invoking Edge Function for event: ${event}`);
            console.log('DEBUG: Payload:', {
                event,
                status: workOrder.status,
                id: workOrder.id,
                scheduled_at: (workOrder as any).scheduled_at
            });

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

            if (error) {
                console.error('Edge Function returned error:', error);
                // Return success false to handle in UI if needed
                return { success: false, error };
            }

            console.log('Notification sent successfully:', data);
            return { success: true, data };

        } catch (error) {
            console.error('Error sending notification webhook:', error);
            return { success: false, error };
        }
    }
};
