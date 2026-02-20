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

    if (cleaned.length >= 10 && cleaned.length <= 11) {
        cleaned = '55' + cleaned;
    }

    return cleaned;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));

        let event = body.event;
        let workOrder = body.workOrder || body.data;
        let company = body.company;

        if (!event && body.type) {
            if (body.type === 'INSERT') event = 'work_order_created';
            else if (body.type === 'UPDATE') event = 'work_order_updated';
            workOrder = body.record;
        }

        if (!event || !workOrder) {
            return new Response(JSON.stringify({ message: 'Missing event or workOrder' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Processing event: ${event}`);

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch Webhook URL & Settings
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('webhook_url, webhook_enabled')
            .single()

        if (settingsError) throw new Error('Failed to fetch app settings.')
        if (!settings?.webhook_url) throw new Error('Webhook URL not configured.')

        if (settings.webhook_enabled === false) {
            return new Response(
                JSON.stringify({ success: true, message: 'Integration disabled', skipped: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Fetch Admin(s) with individual preferences
        const { data: adminUsers } = await supabaseAdmin
            .from('users')
            .select('id, phone, email, email_notifications, whatsapp_notifications')
            .in('role', ['admin_root', 'admin'])

        let adminPhone = null;
        let adminEmails: string[] = [];
        let adminPhones: string[] = [];

        if (adminUsers && adminUsers.length > 0) {
            const adminIds = adminUsers.map(u => u.id);
            const { data: profiles } = await supabaseAdmin
                .from('user_profiles')
                .select('id, phone, email')
                .in('id', adminIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]));
            const uniqueEmails = new Set<string>();
            const uniquePhones = new Set<string>();

            adminUsers.forEach(user => {
                const profile = profileMap.get(user.id);

                // Respect individual email preference
                const emailEnabled = user.email_notifications ?? true;
                if (emailEnabled) {
                    const email = (profile?.email && profile.email.trim() !== '') ? profile.email : user.email;
                    if (email && email.trim() !== '') uniqueEmails.add(email);
                }

                // Respect individual whatsapp preference
                const whatsappEnabled = user.whatsapp_notifications ?? false;
                if (whatsappEnabled) {
                    const rawPhone = (profile?.phone && profile.phone.trim() !== '') ? profile.phone : user.phone;
                    const formattedPhone = formatPhone(rawPhone);
                    if (formattedPhone) uniquePhones.add(formattedPhone);
                }
            });

            adminEmails = Array.from(uniqueEmails);
            adminPhones = Array.from(uniquePhones);
            if (adminPhones.length > 0) adminPhone = adminPhones[0];
        }

        // 3. Enrich Work Order Data
        let requesterPhone = null;
        let requesterEmail = null;
        let requesterName = null;
        let requesterPreferences = { email: true, whatsapp: false, push: true };

        const workOrderId = workOrder.id;
        const requesterId = workOrder.requesterId || workOrder.requester_id;

        // Preserve URL if exists in input
        const originalUrl = workOrder.url || workOrder.link;

        let enrichedWorkOrder = { ...workOrder };

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
                    ...workOrder,
                    ...dbWorkOrder,
                    url: originalUrl || workOrder.url || enrichedWorkOrder.url,
                    assetName: dbWorkOrder.asset?.name || 'N/A',
                    assetCode: dbWorkOrder.asset?.code,
                    technicianName: dbWorkOrder.technician?.name || 'Pendente',
                    osNumber: dbWorkOrder.order_number || workOrder.osNumber || workOrder.order_number,
                    description: dbWorkOrder.issue || workOrder.description || workOrder.issue,
                    title: dbWorkOrder.issue || workOrder.title
                };

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

                const profileRequesterId = dbWorkOrder.requester_id || requesterId;
                if (profileRequesterId) {
                    const { data: profileData } = await supabaseAdmin
                        .from('user_profiles')
                        .select('phone, email, name')
                        .eq('id', profileRequesterId)
                        .single();
                    if (profileData) {
                        if (profileData.phone) requesterPhone = formatPhone(profileData.phone);
                        if (profileData.email) requesterEmail = profileData.email;
                        if (profileData.name) requesterName = profileData.name;
                    }
                }
            }
        }

        if (event === 'test_notification') {
            if (adminEmails.length > 0) requesterEmail = adminEmails[0];
            if (adminPhones.length > 0) requesterPhone = adminPhones[0];
            requesterName = 'Administrador (Teste)';
            requesterPreferences = { email: true, whatsapp: true, push: true };
        }

        if (event === 'work_order_updated') {
            adminEmails = [];
            adminPhones = [];
        }

        const response = await fetch(settings.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: event,
                timestamp: new Date().toISOString(),
                company: company || 'Novo Horizonte Alumínios',
                workOrder: enrichedWorkOrder,
                preferences: {
                    requester: requesterPreferences
                },
                adminPhone,
                adminEmails: adminEmails.join(','),
                adminPhones: adminPhones.join(','),
                requesterPhone,
                requesterEmail,
                requesterName,
                failure_type: enrichedWorkOrder.failure_type,
                technical_report: enrichedWorkOrder.technical_report,
                description: enrichedWorkOrder.description || '',
                formatted_blocks: {
                    failure_type_block: enrichedWorkOrder.failure_type ? `⚠ Tipo de Falha:\n${enrichedWorkOrder.failure_type}` : '',
                    technical_report_block: enrichedWorkOrder.technical_report ? `📝 Relatório Técnico:\n${enrichedWorkOrder.technical_report}` : '',
                    full_body_suggestion: `Olá ${requesterName || 'Ilmo'},\n\nTítulo\n${enrichedWorkOrder.title || enrichedWorkOrder.description}\n\nMáquina\n${enrichedWorkOrder.assetName}\n\nTipo de Falha\n${enrichedWorkOrder.failure_type || 'N/A'}\n\nNovo Status\n${enrichedWorkOrder.status}\n\nSolicitante\n${requesterName || 'N/A'}\n\nTécnico responsável\n${enrichedWorkOrder.technicianName}\n\nRelatório Técnico\n${enrichedWorkOrder.technical_report || 'N/A'}`
                }
            }),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`n8n responded with ${response.status}: ${text}`)
        }

        const data = await response.text()
        return new Response(JSON.stringify({ success: true, n8nResponse: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        })

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        })
    }
})

