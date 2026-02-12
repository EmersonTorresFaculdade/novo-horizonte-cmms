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
        // Let's parse flexibly to handle different payload structures.
        const body = await req.json().catch(() => ({}));

        let event = body.event;
        let workOrder = body.workOrder || body.data; // Handle 'workOrder' (from Service) or 'data' (generic)
        let company = body.company;

        // Fallback for DB Webhook (type=INSERT/UPDATE)
        if (!event && body.type) {
            if (body.type === 'INSERT') event = 'work_order_created';
            else if (body.type === 'UPDATE') event = 'work_order_updated';
            workOrder = body.record;
        }

        if (!event || !workOrder) {
            console.error('Missing event or workOrder in payload:', body);
            return new Response(JSON.stringify({ message: 'Missing event or workOrder' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Processing event: ${event}`);

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
            console.log('Webhook disabled in settings.');
            return new Response(
                JSON.stringify({ success: true, message: 'Integration disabled', skipped: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Fetch Admin Phone Number(s) AND Emails
        // ... (lines 56-113 remain the same, so I will skip re-writing them in this tool call to keep it focused if possible, 
        // but replace_file_content needs contiguous block. I'll include the necessary context or just replace the parsing block 
        // and then the requesterId block separately if they are far apart.
        // Actually, lines 32-134 cover the start of the function up to requesterId extraction.
        // I will replace the BEGINNING of the function up to line 134.
        // Wait, lines 56-113 are admin fetching. I don't need to change them.
        // I will split this into two edits if needed, or just replace the payload part and the requesterId part.
        // Payload parsing is lines 32-33. RequesterId is line 133.
        // The block is too large to replace everything in between.
        // I will just replace the top payload parsing first.

        // ... changing plan to use MULTI_REPLACE ...
        // Wait, I can only use replace_file_content for single block.
        // I will use multi_replace_file_content.

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

        // Logic for Admin Notifications:
        // - work_order_created: Admins receive it (Global monitoring)
        // - work_order_updated: Admins DO NOT receive it implicitly (Only if they are the requester)
        if (event === 'work_order_updated') {
            // Clear admin lists for updates, so only the Requester gets notified
            // (If the requester IS an admin, they are already covered by requesterEmail)
            adminEmails = [];
            adminPhones = [];
            console.log('Work Order Update: Cleared admin recipients to notify only the requester.');
        }

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
                requesterName,
                // Enviar campos separados para o n8n
                failure_type: enrichedWorkOrder.failure_type,
                technical_report: enrichedWorkOrder.technical_report,

                // Descrição LIMPA (como pedido, mas enviamos blocos formatados para ajudar)
                description: enrichedWorkOrder.description || '',

                // CAMPOS FORMATADOS PARA O LAYOUT SOLICITADO
                // O usuário pode mapear estes campos diretamente no n8n para montar o layout exato.
                formatted_blocks: {
                    failure_type_block: enrichedWorkOrder.failure_type ? `⚠ Tipo de Falha:\n${enrichedWorkOrder.failure_type}` : '',
                    technical_report_block: enrichedWorkOrder.technical_report ? `📝 Relatório Técnico:\n${enrichedWorkOrder.technical_report}` : '',
                    // Exemplo de como poderia ser o corpo inteiro se ele quisesse substituir tudo
                    full_body_suggestion: `Olá ${requesterName || 'Ilmo'},\n\nTítulo\n${enrichedWorkOrder.title || enrichedWorkOrder.description}\n\nMáquina\n${enrichedWorkOrder.assetName}\n\nTipo de Falha\n${enrichedWorkOrder.failure_type || 'N/A'}\n\nNovo Status\n${enrichedWorkOrder.status}\n\nSolicitante\n${requesterName || 'N/A'}\n\nTécnico responsável\n${enrichedWorkOrder.technicianName}\n\nRelatório Técnico\n${enrichedWorkOrder.technical_report || 'N/A'}`
                }
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
