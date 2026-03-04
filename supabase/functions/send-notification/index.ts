import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));

        let event = body.event;
        let workOrder: any = body.workOrder || body.data;
        let company = body.company;
        let reportData = body.reportData;

        if (!event && body.type) {
            if (body.type === 'INSERT') event = 'work_order_created';
            else if (body.type === 'UPDATE') event = 'work_order_updated';
            workOrder = body.record;
        }

        // Allow report events to proceed without a workOrder if reportData is present
        const isReportEvent = event === 'executive_report_manual';

        if (!event || (!workOrder && !isReportEvent)) {
            return new Response(JSON.stringify({
                message: 'Missing event or workOrder',
                received: { event, hasWorkOrder: !!workOrder, hasReportData: !!reportData }
            }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Ensure workOrder is at least an empty object for downstream logic
        if (!workOrder) workOrder = {};

        console.log(`Processing event: ${event}`);

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch Webhook URL & Settings
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('webhook_url, webhook_enabled, board_emails')
            .single()

        if (settingsError) throw new Error('Failed to fetch app settings.')
        if (!settings?.webhook_url) throw new Error('Webhook URL not configured.')

        if (settings.webhook_enabled === false) {
            return new Response(
                JSON.stringify({ success: true, message: 'Integration disabled', skipped: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Handle recipients based on event
        let adminPhone = null;
        let adminEmails: string[] = [];
        let adminPhones: string[] = [];
        let customEmailForReport = body.customEmail;

        if (event === 'executive_report_manual') {
            // Priority 1: Custom email from UI
            if (customEmailForReport && customEmailForReport.trim() !== '') {
                adminEmails = customEmailForReport.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
            }
            // Priority 2: Configured board emails
            else if (settings.board_emails && settings.board_emails.trim() !== '') {
                adminEmails = settings.board_emails.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
            }

            // Priority 3: Fallback to all administrators if emails are empty
            if (adminEmails.length === 0) {
                const { data: adminUsers } = await supabaseAdmin
                    .from('users')
                    .select('id, email, email_notifications')
                    .in('role', ['admin_root', 'admin'])

                if (adminUsers && adminUsers.length > 0) {
                    const adminIds = adminUsers.map((u: any) => u.id);
                    const { data: profiles } = await supabaseAdmin
                        .from('user_profiles')
                        .select('id, email')
                        .in('id', adminIds);

                    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));
                    const uniqueEmails = new Set<string>();

                    adminUsers.forEach((user: any) => {
                        const emailEnabled = user.email_notifications ?? true;
                        if (emailEnabled) {
                            const profile = profileMap.get(user.id) as any;
                            const email = (profile && typeof profile === 'object' && 'email' in profile && profile.email && profile.email.trim() !== '') ? profile.email : user.email;
                            if (email && email.trim() !== '') uniqueEmails.add(email);
                        }
                    });
                    adminEmails = Array.from(uniqueEmails);
                }
            }
        } else {
            // Fetch Admin(s) for standard work order notifications
            const { data: adminUsers } = await supabaseAdmin
                .from('users')
                .select('id, phone, email, email_notifications, whatsapp_notifications, manage_equipment, manage_predial, manage_others')
                .in('role', ['admin_root', 'admin'])

            if (adminUsers && adminUsers.length > 0) {
                const adminIds = adminUsers.map((u: any) => u.id);
                const { data: profiles } = await supabaseAdmin
                    .from('user_profiles')
                    .select('id, phone, email')
                    .in('id', adminIds);

                const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));
                const uniqueEmails = new Set<string>();
                const uniquePhones = new Set<string>();

                const woCategory = workOrder.maintenance_category || 'Equipamento';

                adminUsers.forEach((user: any) => {
                    let hasCategoryPermission = false;
                    if (user.manage_equipment && woCategory === 'Equipamento') hasCategoryPermission = true;
                    if (user.manage_predial && woCategory === 'Predial') hasCategoryPermission = true;
                    if (user.manage_others && woCategory === 'Outros') hasCategoryPermission = true;

                    if (!hasCategoryPermission) return;

                    const profile = profileMap.get(user.id) as any;

                    const emailEnabled = user.email_notifications ?? true;
                    if (emailEnabled) {
                        const email = (profile && typeof profile === 'object' && 'email' in profile && profile.email && profile.email.trim() !== '') ? profile.email : user.email;
                        if (email && email.trim() !== '') uniqueEmails.add(email);
                    }

                    const whatsappEnabled = user.whatsapp_notifications ?? false;
                    if (whatsappEnabled) {
                        const rawPhone = (profile && typeof profile === 'object' && 'phone' in profile && profile.phone && profile.phone.trim() !== '') ? profile.phone : user.phone;
                        const formattedPhone = formatPhone(rawPhone);
                        if (formattedPhone) uniquePhones.add(formattedPhone);
                    }
                });

                adminEmails = Array.from(uniqueEmails);
                adminPhones = Array.from(uniquePhones);
                if (adminPhones.length > 0) adminPhone = adminPhones[0];
            }
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
                    console.log('DB Work Order fetched:', { status: dbWorkOrder.status, scheduled_at: dbWorkOrder.scheduled_at });

                    enrichedWorkOrder = {
                        ...workOrder,
                        ...dbWorkOrder,
                        // PRIORIDADE: Manter o que veio do frontend se for mais recente ou específico
                        status: workOrder.status || dbWorkOrder.status,
                        scheduled_at: workOrder.scheduled_at || dbWorkOrder.scheduled_at,
                        url: originalUrl || workOrder.url || enrichedWorkOrder.url,
                        assetName: dbWorkOrder.asset?.name || workOrder.assetName || 'N/A',
                        assetCode: dbWorkOrder.asset?.code || workOrder.assetCode,
                        technicianName: dbWorkOrder.technician?.name || workOrder.technicianName || 'Não atribuído',
                        osNumber: dbWorkOrder.order_number || workOrder.osNumber || workOrder.order_number,
                        description: dbWorkOrder.issue || workOrder.description || workOrder.issue,
                        title: dbWorkOrder.issue || workOrder.title
                    };

                    console.log('Enriched Work Order final status:', enrichedWorkOrder.status);

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
        } else if (event === 'work_order_updated' || event === 'work_order_reopened' || event === 'work_order_cancelled') {
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
        } else if (event === 'executive_report_manual') {
            subject_display = "📊 Relatório Executivo Estratégico";
            intro_display = "foi gerado manualmente pela diretoria";
        } else {
            subject_display = "🔄 Atualização da Ordem de Serviço";
            // Custom messages based on status
            if (currentStatus === 'Recebido') {
                intro_display = "foi recebida e está aguardando início";
            } else if (currentStatus === 'Em Manutenção') {
                intro_display = "entrou em manutenção";
            } else if (currentStatus === 'Concluído') {
                intro_display = "foi concluída com sucesso";
            } else if (currentStatus === 'Agendado') {
                subject_display = "📅 Agendamento de Manutenção";
                if (enrichedWorkOrder.scheduled_at) {
                    try {
                        const date = new Date(enrichedWorkOrder.scheduled_at);
                        const formattedDate = date.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            timeZone: 'America/Sao_Paulo'
                        });
                        const formattedTime = date.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                        });
                        intro_display = `foi agendada para *${formattedDate}* às *${formattedTime}*`;
                    } catch (e) {
                        intro_display = `foi atualizada para o status: ${currentStatus}`;
                    }
                } else {
                    intro_display = "foi marcada como agendada";
                }
            } else {
                intro_display = `foi atualizada para o status: ${currentStatus}`;
            }
        }

        let finalWebhookUrl = settings.webhook_url;
        if (event === 'executive_report_manual') {
            // Derive the reports webhook URL from the base URL. 
            // Standard is .../webhook/cmms-webhook, reports is .../webhook/executive-report-manual
            const lastSlashIndex = settings.webhook_url.lastIndexOf('/');
            const baseUrl = settings.webhook_url.substring(0, lastSlashIndex + 1);
            finalWebhookUrl = baseUrl + 'executive-report-manual';
            console.log(`Routing executive report to: ${finalWebhookUrl}`);
        }

        // Extract dates and prepare HTML intro for easy access in n8n
        let formatted_date = '';
        let formatted_time = '';
        if (currentStatus === 'Agendado' && enrichedWorkOrder.scheduled_at) {
            try {
                const date = new Date(enrichedWorkOrder.scheduled_at);
                formatted_date = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
                formatted_time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
            } catch (e) { /* ignore */ }
        }

        // Convert WhatsApp bold (*) to HTML strong tags
        const intro_html = intro_display.replace(/\*(.*?)\*/g, '<strong>$1</strong>');

        console.log('Sending to n8n:', { event, status: enrichedWorkOrder.status, intro: intro_display });

        const response = await fetch(finalWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: event,
                subject_display,
                intro_display,
                intro_html,
                formatted_date,
                formatted_time,
                admin_name,
                timestamp: new Date().toISOString(),
                company: company || 'Novo Horizonte Alumínios',
                workOrder: enrichedWorkOrder,
                reportData: reportData, // Inclusion of report data
                pdf_attachment: body.pdf_attachment,
                preferences: {
                    requester: requesterPreferences
                },
                adminPhone,
                adminEmails: adminEmails.join(','),
                adminPhones: adminPhones.join(','),
                requesterPhone,
                requesterEmail,
                requesterName,
                maintenance_type: enrichedWorkOrder.maintenance_type || 'Corretiva',
                technical_report: enrichedWorkOrder.technical_report,
                description: enrichedWorkOrder.description || enrichedWorkOrder.issue || '',
                formatted_blocks: {
                    technical_report_block: enrichedWorkOrder.technical_report ? `📝 Relatório Técnico:\n${enrichedWorkOrder.technical_report}` : '',
                    full_body_suggestion: `Olá ${requesterName || 'Ilmo'},\n\nTítulo\n${enrichedWorkOrder.title || enrichedWorkOrder.description}\n\nMáquina\n${enrichedWorkOrder.assetName}\n\nTipo de Serviço\n${enrichedWorkOrder.maintenance_type || 'Corretiva'}\n\nDescrição\n${enrichedWorkOrder.description || enrichedWorkOrder.issue || 'N/A'}\n\nNovo Status\n${enrichedWorkOrder.status}${formatted_date ? `\n\n📅 Data do Agendamento\n*${formatted_date} às ${formatted_time}*` : ''}\n\nSolicitante\n${requesterName || 'N/A'}\n\nTécnico responsável\n${enrichedWorkOrder.technicianName}\n\nRelatório Técnico\n${enrichedWorkOrder.technical_report || 'N/A'}`
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        })
    }
})

