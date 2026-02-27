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

        // 2. Fetch Admin(s) with individual preferences and category permissions
        const { data: adminUsers } = await supabaseAdmin
            .from('users')
            .select('id, phone, email, email_notifications, whatsapp_notifications, manage_equipment, manage_predial, manage_others')
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

            // Get maintenance category from work order (default to Equipamento if not present)
            const woCategory = workOrder.maintenance_category || 'Equipamento';

            adminUsers.forEach(user => {
                // Category filtering logic
                let hasCategoryPermission = false;
                if (user.manage_equipment && woCategory === 'Equipamento') hasCategoryPermission = true;
                if (user.manage_predial && woCategory === 'Predial') hasCategoryPermission = true;
                if (user.manage_others && woCategory === 'Outros') hasCategoryPermission = true;

                // admin_root sees everything by default if they have at least one key? 
                // Wait, last session we decided universally even admin_root is filtered.
                // Let's stick to the strict category matching.

                if (!hasCategoryPermission) return;

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

        console.log(`Enriching work order ${workOrderId}, requester: ${requesterId}`);

        // Preserve URL if exists in input
        const originalUrl = workOrder.url || workOrder.link;

        let enrichedWorkOrder = { ...workOrder };

        if (workOrderId) {
            try {
                // Use a simpler join or separate queries if the complex join fails
                const { data: dbWorkOrder, error: dbError } = await supabaseAdmin
                    .from('work_orders')
                    .select(`
                        *,
                        asset:assets(name, code),
                        technician:technicians!technician_id(name),
                        requester:users!requester_id(name, email, phone, email_notifications, whatsapp_notifications, push_notifications)
                    `)
                    .eq('id', workOrderId)
                    .maybeSingle();

                if (dbError) {
                    console.error('Error fetching work order details with joins:', dbError);
                    // Fallback to basic work order fetch if join failed
                    const { data: basicOrder } = await supabaseAdmin
                        .from('work_orders')
                        .select('*')
                        .eq('id', workOrderId)
                        .maybeSingle();

                    if (basicOrder) {
                        enrichedWorkOrder = { ...enrichedWorkOrder, ...basicOrder };
                    }
                } else if (dbWorkOrder) {
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
                }
            } catch (innerError) {
                console.error('Exception during work order enrichment:', innerError);
            }

            // Independent fetch for requester profile if needed
            const profileRequesterId = requesterId || enrichedWorkOrder.requester_id;
            if (profileRequesterId) {
                try {
                    const { data: profileData } = await supabaseAdmin
                        .from('user_profiles')
                        .select('phone, email, name')
                        .eq('id', profileRequesterId)
                        .maybeSingle();

                    if (profileData) {
                        if (profileData.phone) requesterPhone = formatPhone(profileData.phone);
                        if (profileData.email) requesterEmail = profileData.email;
                        if (profileData.name) requesterName = profileData.name;
                    }

                    // Also fetch notification preferences from users table if not already set
                    if (requesterPreferences.email === true && requesterPreferences.whatsapp === false) {
                        const { data: userData } = await supabaseAdmin
                            .from('users')
                            .select('email_notifications, whatsapp_notifications, push_notifications')
                            .eq('id', profileRequesterId)
                            .maybeSingle();

                        if (userData) {
                            requesterPreferences = {
                                email: userData.email_notifications ?? true,
                                whatsapp: userData.whatsapp_notifications ?? false,
                                push: userData.push_notifications ?? true
                            };
                        }
                    }
                } catch (profError) {
                    console.error('Error fetching requester fallback data:', profError);
                }
            }
        }

        // Filter out requester from admin lists to avoid duplicate notifications
        if (requesterEmail) {
            adminEmails = adminEmails.filter(email => email.toLowerCase() !== requesterEmail.toLowerCase());
        }
        if (requesterPhone) {
            adminPhones = adminPhones.filter(phone => phone !== requesterPhone);
        }

        // Final values if enrichment failed but payload had data
        if (!enrichedWorkOrder.order_number && (workOrder.order_number || workOrder.osNumber)) {
            enrichedWorkOrder.order_number = workOrder.order_number || workOrder.osNumber;
        }

        if (event === 'test_notification') {
            if (adminEmails.length > 0) requesterEmail = adminEmails[0];
            if (adminPhones.length > 0) requesterPhone = adminPhones[0];
            requesterName = 'Administrador (Teste)';
            requesterPreferences = { email: true, whatsapp: true, push: true };
        }

        if (event === 'work_order_updated' || event === 'work_order_reopened' || event === 'work_order_cancelled') {
            adminEmails = [];
            adminPhones = [];
        }

        let subject_display = "";
        let intro_display = "";
        const admin_name = body.adminName || "";
        const currentStatus = enrichedWorkOrder.status || 'N/A';

        if (event === 'work_order_created') {
            subject_display = "🆕 Nova Ordem de Serviço";
            intro_display = "foi criada";
        } else if (event === 'work_order_reopened') {
            subject_display = "🔄 Ordem de Serviço Reaberta";
            intro_display = "foi reaberta";
        } else if (event === 'work_order_cancelled') {
            subject_display = "❌ Ordem de Serviço Cancelada";
            intro_display = `foi cancelada${admin_name ? ` por ${admin_name}` : ''}`;
        } else {
            subject_display = "🔄 Atualização da Ordem de Serviço";
            // Custom messages based on status
            if (currentStatus === 'Recebido') {
                intro_display = "foi recebida e está aguardando início";
            } else if (currentStatus === 'Em Manutenção') {
                intro_display = "entrou em manutenção";
            } else if (currentStatus === 'Concluído') {
                intro_display = "foi concluída com sucesso";
            } else {
                intro_display = `foi atualizada para o status: ${currentStatus}`;
            }
        }

        const response = await fetch(settings.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: event,
                subject_display,
                intro_display,
                admin_name,
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

