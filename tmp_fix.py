
import json

def fix_whatsapp_text(text_expr):
    # Replace double-escaped newlines with real newlines or single-escaped ones
    # In n8n expressions, backticks are best.
    # We want literals, so we'll replace \\\\n with \n
    fixed = text_expr.replace('\\\\\\\\n', '\\n')
    # If it starts with ={{ '...' + ... }} we can convert to ={{ `...` }}
    return fixed

# Read the workflow to get exact existing names and IDs
# I'll just use the IDs and Names from the previous view_file

ops = [
    {
        "nodeName": "WhatsApp-Admin-API",
        "type": "updateNode",
        "updates": {
            "parameters": {
                "bodyParameters": {
                    "parameters": [
                        {"name": "number", "value": "={{ $json.adminPhoneToUse }}"},
                        {"name": "text", "value": "={{ `🔔 *Novo Horizonte CMMS*\n📝 ${$json.body.workOrder && $json.body.workOrder.id ? '🔄 ' : '🔐 '}*${$json.body.subject_display}${$json.body.workOrder && $json.body.workOrder.id ? (' #' + ($json.body.workOrder.osNumber || $json.body.workOrder.order_number || 'N/A')) : ''}*\n\nOlá, Administrador Root!\nUm evento ${$json.body.intro_display} 👇\n\n${$json.body.workOrder && $json.body.workOrder.id ? `📄 *Problema:* ${$json.body.description || $json.body.workOrder.description || 'Não informado'}\n🏭 *Ativo:* ${$json.body.workOrder.assetName || 'Não informado'}\n🛠️ *Tipo:* ${$json.body.workOrder.maintenance_type || $json.body.workOrder.maintenance_category || 'Geral'}\n🚨 *Prioridade:* ${$json.body.workOrder.priority || 'Média'}\n🚦 *Status:* ${$json.body.workOrder.status || 'N/A'}\n👨‍🔧 *Técnico:* ${$json.body.technicianName && $json.body.technicianName !== 'Pendente' && $json.body.technicianName !== 'Aguardando' ? $json.body.technicianName : 'Aguardando'}${$json.body.technical_report ? `\n\n📋 *Relatório Técnico / Solução:*\n${$json.body.technical_report}` : ''}` : `👤 *Usuário:* ${$json.body.requesterName || $json.body.name || 'N/A'}\n📧 *Email:* ${$json.body.requesterEmail || $json.body.email || 'N/A'}\n📱 *WhatsApp:* ${$json.body.requesterPhone || $json.body.phone || 'N/A'}`}\n\n🔗 *Acompanhe aqui:* ${$json.body.workOrder && $json.body.workOrder.id ? ($json.body.workOrder.url || ('https://manutencao.novohorizonte.com/#/work-orders/' + $json.body.workOrder.id)) : 'https://manutencao.novohorizonte.com/'}` }}"}
                    ]
                }
            }
        }
    },
    {
        "nodeName": "WhatsApp-Solicitante-API",
        "type": "updateNode",
        "updates": {
            "parameters": {
                "bodyParameters": {
                    "parameters": [
                        {"name": "number", "value": "={{ $json.body.requesterPhone || $json.body.phone }}"},
                        {"name": "text", "value": "={{ `🔔 *Novo Horizonte CMMS*\n📝 ${$json.body.event === 'password_reset_request' ? '🔐 ' : ($json.body.workOrder && $json.body.workOrder.id ? '🔄 ' : '👤 ')}*${$json.body.subject_display}*\n\nOlá, ${$json.body.requesterName || $json.body.name || 'Solicitante'}!\n${$json.body.event === 'password_reset_request' ? `Recebemos um pedido de redefinição de senha para sua conta. Enviamos um link seguro para o seu e-mail: *${$json.body.requesterEmail || $json.body.email}*` : `Sua solicitação ${$json.body.intro_display} 👇`}\n\n${$json.body.workOrder && $json.body.workOrder.id ? `📄 *Problema:* ${$json.body.description || $json.body.workOrder.description || 'Não informado'}\n🏭 *Ativo:* ${$json.body.workOrder.assetName || 'Não informado'}\n🛠️ *Tipo:* ${$json.body.workOrder.maintenance_type || $json.body.workOrder.maintenance_category || 'Geral'}\n🚨 *Prioridade:* ${$json.body.workOrder.priority || 'Média'}\n🚦 *Status:* ${$json.body.workOrder.status || 'N/A'}\n👨‍🔧 *Técnico:* ${$json.body.technicianName && $json.body.technicianName !== 'Pendente' && $json.body.technicianName !== 'Aguardando' ? $json.body.technicianName : 'Aguardando'}${$json.body.technical_report ? `\n\n📋 *Relatório Técnico / Solução:*\n${$json.body.technical_report}` : ''}` : ($json.body.event === 'password_reset_request' ? '' : `🔧 *Situação do Acesso:* ${$json.body.event === 'user_registered' ? 'Aguardando Aprovação do Admin' : ($json.body.event === 'user_approved' ? 'Aprovado ✅ - Já pode acessar!' : 'Não Aprovado ❌')}`)}\n\n🔗 *Acesse o sistema:* ${$json.body.workOrder && $json.body.workOrder.id ? ($json.body.workOrder.url || ('https://manutencao.novohorizonte.com/#/work-orders/' + $json.body.workOrder.id)) : ($json.body.event === 'password_reset_request' ? ($json.body.reset_url || $json.body.url || 'https://manutencao.novohorizonte.com/#/reset-password') : 'https://manutencao.novohorizonte.com/')}` }}"}
                    ]
                }
            }
        }
    }
]

# Write Email nodes updates separately because they are large
# ... actually I'll just write the full JSON for the operations
