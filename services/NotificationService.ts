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
}

export const NotificationService = {
    async notifyWorkOrderCreated(workOrder: WorkOrderPayload) {
        await this.sendWebhook('work_order_created', workOrder);
    },

    async notifyWorkOrderUpdated(workOrder: WorkOrderPayload) {
        await this.sendWebhook('work_order_updated', workOrder);
    },

    async sendWebhook(event: string, workOrder: WorkOrderPayload) {
        try {
            // Get current user session for Authorization
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn('No active session, cannot invoke Edge Function');
                return;
            }

            console.log(`Invoking Edge Function for event ${event}...`);

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event,
                    workOrder: {
                        ...workOrder,
                        // Ensure URL is absolute
                        url: `${window.location.origin}/work-orders/${workOrder.id}`
                    },
                    // Company name will be fetched by Edge Function from DB
                }
            });

            if (error) {
                console.error('Edge Function returned error:', error);
                throw error;
            }

            console.log('Notification sent successfully:', data);

        } catch (error) {
            console.error('Error sending notification webhook:', error);
        }
    }
};
