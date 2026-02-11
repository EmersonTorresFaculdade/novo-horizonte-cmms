import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to format phone numbers for WhatsApp (DDI + DDD + Number)
function formatPhone(phone: string | null): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length === 0) return null;

    // Brazil numbers usually: 
    // Mobile: 11 digits (DD + 9 + 8 digits) -> Needs 55
    // Landline: 10 digits (DD + 8 digits) -> Needs 55
    if (cleaned.length >= 10 && cleaned.length <= 11) {
        cleaned = '55' + cleaned;
    }

    return cleaned;
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

        // 2. Fetch Admin Phone Number(s) AND Emails
        // Check both 'users' table (registration data) and 'user_profiles' (profile data)
        const { data: adminUsers } = await supabaseAdmin
            .from('users')
            .select('id, phone, email')
            .in('role', ['admin_root', 'admin'])

        let adminPhone = null;
        let adminEmails: string[] = [];
        let adminPhones: string[] = [];

        if (adminUsers && adminUsers.length > 0) {
            const adminIds = adminUsers.map(u => u.id);

            // Fetch profiles to get updated contact info
            const { data: profiles } = await supabaseAdmin
                .from('user_profiles')
                .select('id, phone, email')
                .in('id', adminIds);

            // Create a map of profiles for easy lookup
            const profileMap = new Map(profiles?.map(p => [p.id, p]));

            // Process each admin user to get the best email and phone
            const uniqueEmails = new Set<string>();
            const uniquePhones = new Set<string>();

            adminUsers.forEach(user => {
                const profile = profileMap.get(user.id);

                // Email priority: Profile > User
                const email = (profile?.email && profile.email.trim() !== '')
                    ? profile.email
                    : user.email;

                if (email && email.trim() !== '') {
                    uniqueEmails.add(email);
                }

                // Phone priority: Profile > User
                const rawPhone = (profile?.phone && profile.phone.trim() !== '')
                    ? profile.phone
                    : user.phone;

                const formattedPhone = formatPhone(rawPhone);
                if (formattedPhone) {
                    uniquePhones.add(formattedPhone);
                }
            });

            adminEmails = Array.from(uniqueEmails);
            adminPhones = Array.from(uniquePhones);

            // Determine primary admin phone (just pick the first one available if multiple)
            if (adminPhones.length > 0) {
                adminPhone = adminPhones[0];
            }
        }


        // 3. Enrich Work Order Data (Asset, Technician, OS Number)
        // Declare variables for requester info which might be fetched here or later
        let requesterPhone = null;
        let requesterEmail = null;
        let requesterName = null;
        let requesterPreferences = {
            email: true,
            whatsapp: false,
            push: true
        };

        // We fetch the latest data from DB to ensure we have relations
        // The trigger payload sends snake_case keys (e.g. requester_id, asset_id, order_number)
        let enrichedWorkOrder = { ...workOrder };

        // Handle both camelCase (from test/app) and snake_case (from DB trigger)
        const workOrderId = workOrder.id || workOrder.id; // DB trigger sends 'id'
        const requesterId = workOrder.requesterId || workOrder.requester_id;

        if (workOrderId) {
            const { data: dbWorkOrder, error: dbError } = await supabaseAdmin
                .from('work_orders')
                .select(`
                    *,
                    asset:assets(name, code),
                    technician:technicians!technician_id(name),
                    requester:users!requester_id(name, email, phone, email_notifications, whatsapp_notifications, push_notifications)
                `)
                .eq('id', workOrderId)
                .single();

            if (dbError) {
                console.error('Error fetching work order details:', dbError);
            }

            if (dbWorkOrder) {
                enrichedWorkOrder = {
                    ...workOrder, // Keep original props
                    ...dbWorkOrder, // Overwrite with fresh DB data
                    assetName: dbWorkOrder.asset?.name || 'N/A',
                    assetCode: dbWorkOrder.asset?.code,
                    technicianName: dbWorkOrder.technician?.name || 'Pendente',
                    osNumber: dbWorkOrder.order_number || workOrder.osNumber || workOrder.order_number,
                    // Map 'issue' (problem description) to 'description' as requested
                    description: dbWorkOrder.issue || workOrder.description || workOrder.issue,
                    title: dbWorkOrder.issue || workOrder.title // Keep title for backward compat if needed, but UI wants description
                };

                // Update requester info from DB fetch
                if (dbWorkOrder.requester) {
                    const userData = dbWorkOrder.requester;
                    if (userData.phone) requesterPhone = formatPhone(userData.phone);
                    if (userData.email) requesterEmail = userData.email;
                    if (userData.name) requesterName = userData.name;

                    requesterPreferences = {
                        email: userData.email_notifications ?? true,
                        whatsapp: userData.whatsapp_notifications ?? false,
                        push: userData.push_notifications ?? true
                    };
                }

                // Buscar dados atualizados do perfil (user_profiles) que é onde o usuário edita
                // O Profile.tsx salva em user_profiles, então priorizamos esses dados
                const profileRequesterId = dbWorkOrder.requester_id || requesterId;
                if (profileRequesterId) {
                    const { data: profileData } = await supabaseAdmin
                        .from('user_profiles')
                        .select('phone, email, name')
                        .eq('id', profileRequesterId)
                        .single();

                    if (profileData) {
                        // Priorizar dados do user_profiles sobre users
                        if (profileData.phone) requesterPhone = formatPhone(profileData.phone);
                        if (profileData.email) requesterEmail = profileData.email;
                        if (profileData.name) requesterName = profileData.name;
                        console.log('Requester info updated from user_profiles:', { phone: requesterPhone, email: requesterEmail, name: requesterName });
                    }
                }
            }
        } else if (requesterId) {
            // Fallback if no work order ID but we have requesterId
            // Primeiro tenta user_profiles (dados atualizados pelo usuário)
            const { data: profileData } = await supabaseAdmin
                .from('user_profiles')
                .select('phone, email, name')
                .eq('id', requesterId)
                .single();

            if (profileData) {
                if (profileData.phone) requesterPhone = formatPhone(profileData.phone);
                if (profileData.email) requesterEmail = profileData.email;
                if (profileData.name) requesterName = profileData.name;
            }

            // Buscar preferências de notificação da tabela users (onde são armazenadas)
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('phone, email, name, email_notifications, whatsapp_notifications, push_notifications')
                .eq('id', requesterId)
                .single();

            if (userData) {
                // Só usar phone/email/name do users se não encontramos no user_profiles
                if (!requesterPhone && userData.phone) requesterPhone = formatPhone(userData.phone);
                if (!requesterEmail && userData.email) requesterEmail = userData.email;
                if (!requesterName && userData.name) requesterName = userData.name;

                requesterPreferences = {
                    email: userData.email_notifications ?? true,
                    whatsapp: userData.whatsapp_notifications ?? false,
                    push: userData.push_notifications ?? true
                };
            }
        }

        // TEST MODE LOGIC:
        // If this is a test event, we want the admin to receive BOTH the Admin notification AND the Requester notification.
        // So we override the requester credentials with the current admin's credentials.
        if (event === 'test_notification') {
            console.log('Test Mode: Using Admin credentials as Requester to simulate full flow.');

            // Use the first available admin email/phone for the "Requester" role
            if (adminEmails.length > 0) requesterEmail = adminEmails[0];
            if (adminPhones.length > 0) requesterPhone = adminPhones[0];
            requesterName = 'Administrador (Teste)';

            // Force enable all notifications for the "Requester" in test mode
            requesterPreferences = {
                email: true,
                whatsapp: true,
                push: true
            };
        }

        console.log(`Sending notification for ${event}. Work Order ID: ${workOrderId}, OS #: ${enrichedWorkOrder.osNumber}`);
        console.log(`Admins: ${adminEmails.join(', ')} / ${adminPhones.join(', ')}, Requester: ${requesterEmail}`);

        // 4. Send to n8n Webhook
        const response = await fetch(settings.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: event,
                timestamp: new Date().toISOString(),
                company: company || 'Novo Horizonte',
                workOrder: enrichedWorkOrder,
                preferences: {
                    email: settings.email_notifications,
                    whatsapp: settings.whatsapp_notifications,
                    requester: requesterPreferences
                },
                adminPhone,
                adminEmails: adminEmails.join(','), // Send as comma-separated string
                adminPhones: adminPhones.join(','), // Send as comma-separated string
                requesterPhone,
                requesterEmail,
                requesterName
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
