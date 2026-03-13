
import json

html_template = """=
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #f8fafc; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background-color: #1a2332; padding: 32px 24px; text-align: left; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; }
    .header .icon { margin-right: 12px; font-size: 22px; }
    .header .accent { color: #10b981; margin-left: auto; }
    .content { padding: 40px 30px; }
    .message { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
    .message strong { color: #1e293b; font-weight: 700; }
    .data-grid { background-color: #f8fafc; border-left: 4px solid #10b981; padding: 24px 32px; margin-bottom: 32px; }
    .data-item { margin-bottom: 24px; }
    .data-item:last-child { margin-bottom: 0; }
    .label { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .value { color: #1e293b; font-size: 15px; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; background-color: #f1fdf9; color: #10b981; }
    .priority-Alta { color: #ef4444; }
    .priority-Média { color: #f59e0b; }
    .priority-Baixa { color: #10b981; }
    .btn-container { text-align: center; margin-top: 10px; }
    .btn { background-color: #1e8355; color: #ffffff !important; padding: 18px 40px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px; }
    .footer { padding: 32px; text-align: center; background-color: #1a2332; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
    hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>
          {{ ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ? '<span class="icon">🔄</span> Atualização da Ordem de Serviço' : '<span class="icon">🔔</span> Notificação do Sistema' }}
          {{ ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ? ('<span class="accent">#' + ($json.body.workOrder.osNumber || $json.workOrder.osNumber || $json.body.workOrder.order_number || $json.workOrder.order_number || 'N/A') + '</span>') : '' }}
        </h1>
      </div>
      <div class="content">
        <div class="message">
          {{ $json.body.intro_html || $json.intro_html || 'Olá! Temos uma atualização administrativa sobre o sistema Novo Horizonte CMMS.' }}
        </div>
        
        <div class="data-grid">
          {{ ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ? (
            '<div class="data-item"><div class="label">Descrição do Problema</div><div class="value">' + ($json.body.description || $json.description || $json.body.workOrder.description || $json.workOrder.description || 'N/A') + '</div></div>' +
            '<div class="data-item"><div class="label">Máquina / Ativo</div><div class="value">' + ($json.body.workOrder.assetName || $json.workOrder.assetName || 'N/A') + '</div></div>' +
            '<div class="data-item"><div class="label">Tipo de Serviço</div><div class="value">' + ($json.body.maintenance_type || $json.maintenance_type || $json.body.workOrder.maintenance_category || $json.workOrder.maintenance_category || 'Predial') + '</div></div>' +
            '<div class="data-item"><div class="label">Novo Status</div><div class="value"><span class="badge">' + ($json.body.workOrder.status || $json.workOrder.status || 'Recebido') + '</span></div></div>' +
            '<div class="data-item"><div class="label">Prioridade</div><div class="value"><span class="priority-' + ($json.body.workOrder.priority || $json.workOrder.priority || 'Média') + '\\\">' + ($json.body.workOrder.priority || $json.workOrder.priority || 'Média') + '</span></div></div>' +
            '<div class="data-item"><div class="label">Técnico Responsável</div><div class="value">' + (($json.body.technicianName || $json.technicianName) && ($json.body.technicianName || $json.technicianName) !== "Pendente" ? ($json.body.technicianName || $json.technicianName) : "Aguardando") + '</div></div>' +
            '<hr>' +
            '<div class="data-item"><div class="label">Relatório Técnico / Solução</div><div class="value">' + ($json.body.technical_report || $json.technical_report || ($json.body.workOrder && $json.body.workOrder.technical_report) || ($json.workOrder && $json.workOrder.technical_report) || 'Pendente') + '</div></div>'
          ) : (
            '<div class="data-item"><div class="label">Usuário</div><div class="value">' + ($json.body.requesterName || $json.requesterName || $json.body.name || $json.name || 'N/A') + '</div></div>' +
            '<div class="data-item"><div class="label">E-mail</div><div class="value">' + ($json.body.requesterEmail || $json.requesterEmail || $json.body.email || $json.email || 'N/A') + '</div></div>' +
            '<div class="data-item"><div class="label">Situação do Acesso</div><div class="value"><span class="badge">' + ( ($json.body.event || $json.event) === 'password_changed' ? 'Senha Alterada ✅' : (['user_approved', 'user_activated'].includes($json.body.event || $json.event) ? 'Liberado ✅' : (($json.body.event || $json.event) === 'user_registered' ? 'Pendente ⏳' : 'Ação Requerida'))) + '</span></div></div>'
          ) }}
        </div>
        
        <div class="btn-container">
          <a href="{{ ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ? ($json.body.workOrder.url || $json.workOrder.url || ('https://manutencao.novohorizonte.com/#/work-orders/' + ($json.body.workOrder.id || $json.workOrder.id))) : 'https://manutencao.novohorizonte.com/' }}" class="btn">
            {{ ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ? 'Acompanhar Ordem de Serviço' : 'Acessar Sistema' }}
          </a>
        </div>
      </div>
      <div class="footer">
        <p>© 2026 Novo Horizonte • Gestão de Manutenção Inteligente</p>
      </div>
    </div>
  </div>
</body>
</html>
"""

password_html = """=
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #f8fafc; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background-color: #1a2332; padding: 32px 24px; text-align: left; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; }
    .header .icon { margin-right: 12px; font-size: 22px; }
    .content { padding: 45px 35px; }
    .icon-box { background-color: #f1fdf9; width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 32px; color: #10b981; }
    .message { color: #475569; font-size: 16px; line-height: 1.7; text-align: center; margin-bottom: 35px; }
    .message strong { color: #1e293b; font-weight: 700; }
    .btn-container { text-align: center; }
    .btn { background-color: #1e8355; color: #ffffff !important; padding: 18px 40px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px; }
    .footer { padding: 32px; text-align: center; background-color: #1a2332; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
    .security-note { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 35px; line-height: 1.5; padding: 0 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1><span class="icon">🔐</span> Redefinição de Senha de Acesso</h1>
      </div>
      <div class="content">
        <div class="icon-box">🔑</div>
        <div class="message">
          Olá <strong>{{ $json.body.requesterName || 'Colaborador' }}</strong>,<br><br>
          Recebemos um pedido para <strong>redefinir a sua senha</strong> de acesso ao sistema Novo Horizonte CMMS. Se você solicitou esta alteração, clique no botão abaixo para prosseguir.
        </div>
        
        <div class="btn-container">
          <a href="{{ $json.body.reset_url || 'https://manutencao.novohorizonte.com/#/reset-password' }}" class="btn">Redefinir Senha de Acesso</a>
        </div>

        <div class="security-note">
          Por motivos de segurança, este link expirará em breve. Se você não solicitou uma nova senha, pode ignorar este e-mail - sua conta continua protegida.
        </div>
      </div>
      <div class="footer">
        <p>© 2026 Novo Horizonte • Gestão de Manutenção Inteligente</p>
      </div>
    </div>
  </div>
</body>
</html>
"""

nodes = [
    {
        "id": "04cf1289-14bf-4138-9e26-b12249be6404",
        "name": "Webhook-Recebimento",
        "parameters": {
            "httpMethod": "POST",
            "options": {},
            "path": "cmms-webhook"
        },
        "position": [-976, 160],
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2.1
    },
    {
        "id": "53579d33-f30e-4116-9daa-ad344ac11131",
        "name": "Enviar-WhatsApp-Admin",
        "parameters": {
            "conditions": {
                "combinator": "and",
                "conditions": [
                    {
                        "id": "cond-1-admin-wa-1",
                        "leftValue": "={{ $json.body.adminPhones }}",
                        "operator": {"operation": "notEmpty", "type": "string"}
                    },
                    {
                        "id": "cond-exclude-reset-admin-wa-2",
                        "leftValue": "={{ $json.body.event }}",
                        "operator": {"operation": "notEquals", "type": "string"},
                        "rightValue": "password_reset_request"
                    }
                ],
                "options": {"version": 2, "leftValue": "", "caseSensitive": True, "typeValidation": "loose"}
            }
        },
        "position": [-752, 64],
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3
    },
    {
        "id": "787839fa-e20d-4dc1-b6ba-7d46b367a7f3",
        "name": "Enviar-Email-Admin",
        "parameters": {
            "conditions": {
                "combinator": "and",
                "conditions": [
                    {
                        "id": "cond-admin-email-1-em-1",
                        "leftValue": "={{ $json.body.adminEmails }}",
                        "operator": {"operation": "notEmpty", "type": "string"}
                    },
                    {
                        "id": "cond-exclude-reset-admin-em-1",
                        "leftValue": "={{ $json.body.event }}",
                        "operator": {"operation": "notEquals", "type": "string"},
                        "rightValue": "password_reset_request"
                    }
                ],
                "options": {"version": 2, "leftValue": "", "caseSensitive": True, "typeValidation": "loose"}
            }
        },
        "position": [-752, 256],
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3
    },
    {
        "id": "0d53b462-6f0a-4b45-ad6e-1ecd5656de0a",
        "name": "WhatsApp-Admin-API",
        "onError": "continueRegularOutput",
        "parameters": {
            "authentication": "none",
            "bodyParameters": {
                "parameters": [
                    {"name": "number", "value": "={{ $json.whatsappNumber }}"},
                    {"name": "text", "value": "={{ $json.whatsappText }}"}
                ]
            },
            "headerParameters": {
                "parameters": [
                    {"name": "apikey", "value": "8029C030CF0D-42CD-8D34-D021CA6755DF"}
                ]
            },
            "method": "POST",
            "sendBody": True,
            "sendHeaders": True,
            "url": "https://api.emersontorres.com.br/message/sendText/Trello"
        },
        "position": [-160, -64],
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1
    },
    {
        "id": "23f1272b-9e8b-4e8f-8eb2-b280a6734e1a",
        "name": "Verificar-WhatsApp-Solicitante",
        "parameters": {
            "conditions": {
                "combinator": "and",
                "conditions": [
                    {
                        "id": "cond-req-wa-pref-1-wa-1",
                        "leftValue": "={{ $json.body.preferences && $json.body.preferences.requester ? $json.body.preferences.requester.whatsapp : true }}",
                        "operator": {"operation": "equals", "type": "boolean"},
                        "rightValue": True
                    },
                    {
                        "id": "cond-req-wa-phone-1-wa-1",
                        "leftValue": "={{ $json.body.requesterPhone || $json.body.phone }}",
                        "operator": {"operation": "notEmpty", "type": "string"}
                    },
                    {
                        "id": "cond-req-wa-event-1-wa-1",
                        "leftValue": "={{ $json.body.event }}",
                        "operator": {"operation": "regex", "type": "string"},
                        "rightValue": "work_order_created|work_order_updated|work_order_reopened|work_order_cancelled|user_registered|user_approved|user_activated|user_rejected|password_reset_request|password_changed"
                    },
                    {
                        "id": "cond-no-double-admin-wa-1-wa-1",
                        "leftValue": "={{ ($json.body.adminPhones && !$json.body.event.startsWith('user_') && !['password_reset_request', 'password_changed'].includes($json.body.event)) ? $json.body.adminPhones.includes($json.body.requesterPhone || $json.body.phone) : false }}",
                        "operator": {"operation": "equals", "type": "boolean"},
                        "rightValue": False
                    }
                ],
                "options": {"version": 2, "leftValue": "", "caseSensitive": True, "typeValidation": "loose"}
            }
        },
        "position": [-480, 160],
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3
    },
    {
        "id": "b8c4081a-b653-4e16-820f-b4220b44f794",
        "name": "WhatsApp-Solicitante-API",
        "onError": "continueRegularOutput",
        "parameters": {
            "authentication": "none",
            "bodyParameters": {
                "parameters": [
                    {"name": "number", "value": "={{ $json.whatsappNumber }}"},
                    {"name": "text", "value": "={{ $json.whatsappText }}"}
                ]
            },
            "headerParameters": {
                "parameters": [
                    {"name": "apikey", "value": "8029C030CF0D-42CD-8D34-D021CA6755DF"}
                ]
            },
            "method": "POST",
            "sendBody": True,
            "sendHeaders": True,
            "url": "https://api.emersontorres.com.br/message/sendText/Trello"
        },
        "position": [-176, 144],
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1
    },
    {
        "credentials": {"smtp": {"id": "JsuW30Y7uUGVBwb1", "name": "SMTP account"}},
        "id": "e1d28d39-a64d-4605-b09e-d7d10cbad56f",
        "name": "Email-Admin-SMTP",
        "parameters": {
            "emailFormat": "html",
            "fromEmail": "Novo Horizonte CMMS <ti@novohorizonte.com>",
            "html": html_template,
            "operation": "send",
            "resource": "email",
            "subject": "={{ ( $json.body.subject_display || $json.subject_display ) + (( ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ) ? (\" #\" + ($json.body.workOrder.osNumber || $json.workOrder.osNumber || $json.body.workOrder.order_number || $json.workOrder.order_number || \"N/A\")) : \"\") }}",
            "toEmail": "={{ $json.body.adminEmails || $json.adminEmails }}"
        },
        "position": [-160, 352],
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 2.1
    },
    {
        "id": "3680bd2d-e1e5-4c4e-ad00-05cde4dcae25",
        "name": "Verificar-Email-Solicitante",
        "parameters": {
            "conditions": {
                "combinator": "and",
                "conditions": [
                    {"id": "cond-req-em-pref-1-em-1", "leftValue": "={{ $json.body.preferences && $json.body.preferences.requester ? $json.body.preferences.requester.email : true }}", "operator": {"operation": "equals", "type": "boolean"}, "rightValue": True},
                    {"id": "cond-req-em-addr-1-em-1", "leftValue": "={{ $json.body.requesterEmail || $json.body.email }}", "operator": {"operation": "notEmpty", "type": "string"}},
                    {"id": "cond-req-em-event-1-em-1", "leftValue": "={{ $json.body.event }}", "operator": {"operation": "regex", "type": "string"}, "rightValue": "work_order_created|work_order_updated|work_order_reopened|work_order_cancelled|user_registered|user_approved|user_activated|user_rejected|password_reset_request|password_changed"},
                    {"id": "cond-no-double-admin-em-1-em-1", "leftValue": "={{ ($json.body.adminEmails && !$json.body.event.startsWith('user_') && !['password_reset_request', 'password_changed'].includes($json.body.event)) ? $json.body.adminEmails.includes($json.body.requesterEmail || $json.body.email) : false }}", "operator": {"operation": "equals", "type": "boolean"}, "rightValue": False}
                ],
                "options": {"version": 2, "leftValue": "", "caseSensitive": True, "typeValidation": "loose"}
            }
        },
        "position": [-752, 448],
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3
    },
    {
        "credentials": {"smtp": {"id": "JsuW30Y7uUGVBwb1", "name": "SMTP account"}},
        "id": "08ef2f3a-b555-4d03-a69d-eb184386399c",
        "name": "Email-Solicitante-SMTP",
        "parameters": {
            "emailFormat": "html",
            "fromEmail": "Novo Horizonte CMMS <ti@novohorizonte.com>",
            "html": html_template,
            "operation": "send",
            "resource": "email",
            "subject": "={{ ( $json.body.subject_display || $json.subject_display ) + (( ($json.body.workOrder || $json.workOrder) && ($json.body.workOrder.id || $json.workOrder.id) ) ? (\" #\" + ($json.body.workOrder.osNumber || $json.workOrder.osNumber || $json.body.workOrder.order_number || $json.workOrder.order_number || \"N/A\")) : \"\") }}",
            "toEmail": "={{ $json.body.requesterEmail || $json.body.email || $json.requesterEmail || $json.email }}"
        },
        "position": [-160, 528],
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 2.1
    },
    {
        "id": "91ded976-d6bd-48d7-bbad-a728721b1cee",
        "name": "Verificar-Push-Solicitante",
        "parameters": {
            "conditions": {
                "combinator": "and",
                "conditions": [
                    {"id": "cond-req-push-pref-1-ps-1", "leftValue": "={{ $json.body.preferences.requester.push }}", "operator": {"operation": "equals", "type": "boolean"}, "rightValue": True},
                    {"id": "cond-req-push-event-1-ps-1", "leftValue": "={{ $json.body.event }}", "operator": {"operation": "equals", "type": "string"}, "rightValue": "work_order_updated"}
                ],
                "options": {"version": 2, "leftValue": "", "caseSensitive": True, "typeValidation": "strict"}
            }
        },
        "position": [-752, 640],
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3
    },
    {
        "id": "0416d0f7-9e37-4740-b5d3-45c3108eed33",
        "name": "Espaco-Reservado-Push-Notification",
        "parameters": {},
        "position": [-480, 640],
        "type": "n8n-nodes-base.noOp",
        "typeVersion": 1
    },
    {
        "id": "c32fdc97-912f-4e79-92f5-2815f4d307ff",
        "name": "Separar-Telefones-dos-Admins",
        "parameters": {
            "jsCode": """const results = [];
const allItems = $input.all();

function buildMessage(item) {
  const json = item.json;
  const body = json.body || {};
  const workOrder = body.workOrder || {};
  const subject = body.subject_display || json.subject_display || '';
  const osNumber = workOrder.osNumber || workOrder.order_number || 'N/A';
  const intro = body.intro_display || json.intro_display || 'Olá, sua OS foi atualizada';
  const technicianName = (body.technicianName && body.technicianName !== 'Pendente') ? body.technicianName : 'Aguardando';

  let text = '🔔 *Novo Horizonte CMMS*\\n';
  text += '📝 *' + subject + (workOrder.id ? (' #' + osNumber) : '') + '*\\n\\n';
  text += 'Olá, Administrador Root!\\nUm evento ' + (body.intro_display || json.intro_display || 'ocorreu') + ' 👇\\n\\n';

  if (workOrder.id) {
    text += '📄 *Problema:* ' + (body.description || workOrder.description || 'Não informado') + '\\n';
    text += '🏭 *Ativo:* ' + (workOrder.assetName || 'Não informado') + '\\n';
    text += '🛠️ *Tipo:* ' + (body.maintenance_type || workOrder.maintenance_category || 'Geral') + '\\n';
    text += '🚨 *Prioridade:* ' + (workOrder.priority || 'Média') + '\\n';
    text += '🚦 *Status:* ' + (workOrder.status || 'N/A') + '\\n';
    text += '👨‍🔧 *Técnico:* ' + technicianName + '\\n\\n';
    text += '📋 *Relatório Técnico / Solução:*\\n' + (body.technical_report || (body.workOrder && body.workOrder.technical_report) || (json.workOrder && json.workOrder.technical_report) || 'Pendente');
  } else {
    text += '👤 *Usuário:* ' + (body.requesterName || body.name || json.requesterName || json.name || 'N/A') + '\\n';
    text += '📧 *Email:* ' + (body.requesterEmail || body.email || json.requesterEmail || json.email || 'N/A') + '\\n';
    text += '📱 *WhatsApp:* ' + (body.requesterPhone || body.phone || json.requesterPhone || json.phone || 'N/A');
  }

  text += '\\n\\n🔗 *Acompanhe aqui:* ' + (workOrder.id ? ('https://manutencao.novohorizonte.com/#/work-orders/' + workOrder.id) : 'https://manutencao.novohorizonte.com/');
  
  return text;
}

for (let i = 0; i < allItems.length; i++) {
  const item = allItems[i];
  const body = item.json.body || {};
  const adminPhones = body.adminPhones || '';
  
  if (adminPhones) {
    const phones = adminPhones.split(',').map(function(p) { return p.trim(); }).filter(function(p) { return p; });
    
    for (let j = 0; j < phones.length; j++) {
      const newItem = JSON.parse(JSON.stringify(item.json));
      newItem.whatsappNumber = phones[j];
      newItem.whatsappText = buildMessage(item);
      results.push({ json: newItem });
    }
  }
}

return results;"""
        },
        "position": [-432, -48],
        "type": "n8n-nodes-base.code",
        "typeVersion": 2
    },
    {
        "id": "reset-password-if-node-id",
        "name": "Dash-Recuperacao-de-Senha",
        "parameters": {
            "conditions": {
                "combinator": "and",
                "conditions": [
                    {"id": "cond-reset-1-reset-1", "leftValue": "={{ $json.body.event }}", "operator": {"operation": "equals", "type": "string"}, "rightValue": "password_reset_request"}
                ],
                "options": {"version": 2, "leftValue": "", "caseSensitive": True, "typeValidation": "loose"}
            }
        },
        "position": [-752, 800],
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3
    },
    {
        "credentials": {"smtp": {"id": "JsuW30Y7uUGVBwb1", "name": "SMTP account"}},
        "id": "user-reset-password-email-id",
        "name": "Email-Recuperacao-de-Senha",
        "parameters": {
            "emailFormat": "html",
            "fromEmail": "Novo Horizonte CMMS <ti@novohorizonte.com>",
            "html": password_html,
            "operation": "send",
            "resource": "email",
            "subject": "={{ \"🔐 Redefinição de Senha - \" + ($json.body.requesterName || \"Novo Horizonte\") }}",
            "toEmail": "={{ $json.body.requesterEmail || $json.body.email }}"
        },
        "position": [-480, 800],
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 2.1
    },
    {
        "id": "pre-wa-req-id-123",
        "name": "Preparar-WhatsApp-Solicitante",
        "parameters": {
            "jsCode": """const body = $json.body || {};
const workOrder = body.workOrder || {};
const subject = body.subject_display || $json.subject_display || '';
const osNumber = workOrder.osNumber || workOrder.order_number || 'N/A';
const intro = body.intro_display || $json.intro_display || 'Olá, sua OS foi atualizada';
const technicianName = (body.technicianName && body.technicianName !== 'Pendente') ? body.technicianName : 'Aguardando';

let text = '🔔 *Novo Horizonte CMMS*\\n';
text += '📝 *' + subject + (workOrder.id ? (' #' + osNumber) : '') + '*\\n\\n';
text += intro + ' 👇\\n\\n';

if (workOrder.id) {
  text += '📄 *Problema:* ' + (body.description || workOrder.description || 'Não informado') + '\\n';
  text += '🏭 *Ativo:* ' + (workOrder.assetName || 'Não informado') + '\\n';
  text += '🛠️ *Tipo:* ' + (body.maintenance_type || workOrder.maintenance_category || 'Geral') + '\\n';
  text += '🚨 *Prioridade:* ' + (workOrder.priority || 'Média') + '\\n';
  text += '🚦 *Status:* ' + (workOrder.status || 'N/A') + '\\n';
  text += '👨‍🔧 *Técnico:* ' + technicianName + '\\n\\n';
  text += '📋 *Relatório Técnico / Solução:*\\n' + (body.technical_report || (body.workOrder && body.workOrder.technical_report) || (workOrder.technical_report) || 'Pendente');
} else {
  const event = body.event || $json.event;
  if (!['password_reset_request', 'password_changed'].includes(event)) {
    const status = event === 'user_registered' ? '⌛ Aguardando Aprovação' : (['user_approved', 'user_activated'].includes(event) ? 'Aprovado! ✅' : 'Pendente/Não Aprovado ❌');
    text += '🔧 *Status Acesso:* ' + status;
  }
}

text += '\\n\\n🔗 *Sistema:* ' + (workOrder.id ? ('https://manutencao.novohorizonte.com/#/work-orders/' + workOrder.id) : (['password_reset_request', 'password_changed'].includes(body.event || $json.event) ? 'https://manutencao.novohorizonte.com/#/login' : 'https://manutencao.novohorizonte.com/'));

return [{
  json: {
    whatsappText: text,
    whatsappNumber: body.requesterPhone || body.phone || $json.requesterPhone || $json.phone
  }
}];""",
            "mode": "runOnceForEachItem"
        },
        "position": [-320, 200],
        "type": "n8n-nodes-base.code",
        "typeVersion": 2
    }
]

# Correct connections with "main_trigger" for Webhook
connections = {
    "Webhook-Recebimento": {"main": [
        [
            {"node": "Enviar-WhatsApp-Admin", "type": "main_trigger", "index": 0},
            {"node": "Enviar-Email-Admin", "type": "main_trigger", "index": 0},
            {"node": "Verificar-Email-Solicitante", "type": "main_trigger", "index": 0},
            {"node": "Verificar-Push-Solicitante", "type": "main_trigger", "index": 0},
            {"node": "Verificar-WhatsApp-Solicitante", "type": "main_trigger", "index": 0},
            {"node": "Dash-Recuperacao-de-Senha", "type": "main_trigger", "index": 0}
        ]
    ]},
    "Enviar-WhatsApp-Admin": {"main": [[{"node": "Separar-Telefones-dos-Admins", "type": "main", "index": 0}]]},
    "Enviar-Email-Admin": {"main": [[{"node": "Email-Admin-SMTP", "type": "main", "index": 0}]]},
    "Verificar-Email-Solicitante": {"main": [[{"node": "Email-Solicitante-SMTP", "type": "main", "index": 0}]]},
    "Verificar-Push-Solicitante": {"main": [[{"node": "Espaco-Reservado-Push-Notification", "type": "main", "index": 0}]]},
    "Verificar-WhatsApp-Solicitante": {"main": [[{"node": "Preparar-WhatsApp-Solicitante", "type": "main", "index": 0}]]},
    "Separar-Telefones-dos-Admins": {"main": [[{"node": "WhatsApp-Admin-API", "type": "main", "index": 0}]]},
    "Preparar-WhatsApp-Solicitante": {"main": [[{"node": "WhatsApp-Solicitante-API", "type": "main", "index": 0}]]},
    "Dash-Recuperacao-de-Senha": {"main": [[{"node": "Email-Recuperacao-de-Senha", "type": "main", "index": 0}]]}
}

full_payload = {
    "id": "OK_sy_YmxlbknO234kMsU",
    "name": "Central de Notificações CMMS (Fixed)",
    "nodes": nodes,
    "connections": connections
}

with open('c:/Users/Emerson/Downloads/novo-horizonte-cmms/workflow_final.json', 'w', encoding='utf-8') as f:
    json.dump(full_payload, f, ensure_ascii=False, indent=2)
