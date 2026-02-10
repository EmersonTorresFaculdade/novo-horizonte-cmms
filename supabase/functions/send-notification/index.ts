import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { event, workOrder, company } = await req.json()

        // Create Supabase client with Admin privileges (Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch Webhook URL & Settings
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('webhook_url, webhook_enabled, email_notifications, whatsapp_notifications')
            .single()

        if (settingsError) throw new Error('Failed to fetch app settings.')
        if (!settings?.webhook_url) throw new Error('Webhook URL not configured.')

        if (settings.webhook_enabled === false) {
            return new Response(
                JSON.stringify({ success: true, message: 'Integration disabled', skipped: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Fetch Admin Phone Number(s)
        // Check both 'users' table (registration data) and 'user_profiles' (profile data)
        const { data: adminUsers } = await supabaseAdmin
            .from('users')
            .select('id, phone')
            .in('role', ['admin_root', 'admin'])

        let adminPhone = null;

        if (adminUsers && adminUsers.length > 0) {
            // Priority 1: Check user_profiles (most likely to be updated by user)
            const adminIds = adminUsers.map(u => u.id);
            const { data: profiles } = await supabaseAdmin
                .from('user_profiles')
                .select('phone')
                .in('id', adminIds)
                .not('phone', 'is', null)

            if (profiles && profiles.length > 0) {
                const validProfile = profiles.find(p => p.phone && p.phone.trim() !== '');
                if (validProfile) {
                    adminPhone = validProfile.phone;
                }
            }

            // Priority 2: Fallback to 'users' table if no profile phone found
            if (!adminPhone) {
                const validUser = adminUsers.find(u => u.phone && u.phone.trim() !== '');
                if (validUser) {
                    adminPhone = validUser.phone;
                }
            }
        }

        // 3. Fetch Requester Phone Number (if applicable)
        let requesterPhone = null;
        if (workOrder?.requesterId) { // Use workOrder?.requesterId as per original context
            // Try profile first
            const { data: requesterProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('phone')
                .eq('id', workOrder.requesterId)
                .single()

            if (requesterProfile && requesterProfile.phone) {
                requesterPhone = requesterProfile.phone;
            } else {
                // Fallback to users table
                const { data: requesterUser } = await supabaseAdmin
                    .from('users')
                    .select('phone')
                    .eq('id', workOrder.requesterId)
                    .single()

                if (requesterUser && requesterUser.phone) {
                    requesterPhone = requesterUser.phone;
                }
            }
        }

        console.log(`Sending notification for ${event} to Admin: ${adminPhone}, Requester: ${requesterPhone}`);

        // 4. Send to n8n Webhook
        const response = await fetch(settings.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: event, // Use 'event' as per original context
                payload: {
                    company: company || 'Novo Horizonte',
                    workOrder,
                    preferences: {
                        email: settings.email_notifications,
                        whatsapp: settings.whatsapp_notifications
                    },
                    adminPhone, // Inject dynamic admin phone
                    requesterPhone // Inject dynamic requester phone
                },
                timestamp: new Date().toISOString()
            }),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`n8n responded with ${response.status}: ${text}`)
        }

        const data = await response.text()

        return new Response(
            JSON.stringify({ success: true, message: 'Notification forwarded successfully', n8nResponse: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
