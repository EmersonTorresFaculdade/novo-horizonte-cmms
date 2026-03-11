
def concat_expr(expr_list):
    # Joins a list of parts with '+'
    # If a part starts with ':', it's literal. If it starts with '=', it's code.
    # Otherwise, it's treated as code.
    # Actually, simpler: just use + between all parts in the n8n expression.
    parts = []
    for part in expr_list:
        if part.startswith("'") or part.startswith('"'):
            parts.append(part)
        else:
            parts.append(part)
    return "={{ " + " + ".join(parts) + " }}"

def get_os_html_v2():
    # Helper to generate the premium OS email HTML with string concatenation
    html_parts = [
        "'<!DOCTYPE html><html><head><style>'",
        "'body { background-color: #f4f7f6; margin: 0; padding: 0; font-family: Segoe UI, Tahoma, Arial, sans-serif; }'",
        "'.container { max-width: 600px; margin: 20px auto; background-color: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }'",
        "'.header { background-color: #1a202c; padding: 35px 20px; text-align: center; }'",
        "'.header h1 { margin: 0; font-size: 20px; color: #ffffff; font-weight: 700; }'",
        "'.accent { color: #10b981; }'",
        "'.body-content { padding: 40px; color: #4b5563; }'",
        "'.intro { margin-bottom: 25px; font-size: 15px; line-height: 1.6; }'",
        "'.data-card { background-color: #f9fafb; border-left: 4px solid #1e7e4e; padding: 30px; margin-bottom: 35px; border-radius: 0 4px 4px 0; }'",
        "'.label { color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }'",
        "'.value { color: #1e293b; font-size: 15px; font-weight: 700; margin-bottom: 22px; }'",
        "'.status-badge { background-color: #eefdf5; color: #10b981; padding: 4px 12px; border-radius: 4px; font-size: 13px; }'",
        "'.btn-container { text-align: center; }'",
        "'.btn { background-color: #1e7e4e; color: #ffffff !important; padding: 18px 45px; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block; }'",
        "'.footer { background-color: #1a202c; padding: 25px; text-align: center; color: #94a3b8; font-size: 12px; }'",
        "'</style></head><body><div class=\"container\"><div class=\"header\"><h1>'",
        "($json.body.workOrder && $json.body.workOrder.id) ? ('🔄 Atualização do seu Chamado <span class=\"accent\">#' + ($json.body.workOrder.osNumber || $json.body.workOrder.order_number || 'N/A') + '</span>') : '👤 Central de Acesso <span class=\"accent\">Novo Horizonte</span>'",
        "'</h1></div><div class=\"body-content\"><div class=\"intro\">'",
        "'Olá <strong>' + ($json.body.requesterName || $json.body.name || 'Solicitante') + '</strong>, seu chamado foi atualizado para o status: <strong>' + (($json.body.workOrder && $json.body.workOrder.status) || 'Aberto') + '</strong>. Veja os detalhes abaixo:'",
        "'</div><div class=\"data-card\">'",
        "($json.body.workOrder && $json.body.workOrder.id) ? (",
        "'<div class=\"label\">DESCRIÇÃO DO PROBLEMA</div><div class=\"value\">' + ($json.body.description || $json.body.workOrder.description || 'Não informado') + '</div>' + ",
        "'<div class=\"label\">MÁQUINA / ATIVO</div><div class=\"value\">' + ($json.body.workOrder.assetName || 'Não informado') + '</div>' + ",
        "'<div class=\"label\">TIPO DE SERVIÇO</div><div class=\"value\">' + ($json.body.maintenance_type || $json.body.workOrder.maintenance_category || 'Corretiva') + '</div>' + ",
        "'<div class=\"label\">NOVO STATUS</div><div class=\"value\"><span class=\"status-badge\">' + ($json.body.workOrder.status || 'Aberto') + '</span></div>' + ",
        "'<div class=\"label\">PRIORIDADE</div><div class=\"value\" style=\"color: #f97316;\">' + ($json.body.workOrder.priority || 'Média') + '</div>' + ",
        "'<div class=\"label\">TÉCNICO RESPONSÁVEL</div><div class=\"value\">' + (($json.body.technicianName && $json.body.technicianName !== 'Pendente') ? $json.body.technicianName : 'Aguardando') + '</div>' + ",
        "'<div style=\"border-top: 1px solid #e2e8f0; margin: 20px 0;\"></div>' + ",
        "'<div class=\"label\">RELATÓRIO TÉCNICO / SOLUÇÃO</div><div class=\"value\" style=\"margin-bottom:0;\">' + ($json.body.technical_report || 'Pendente') + '</div>'",
        ") : (",
        "'<div class=\"label\">TIPO DE SOLICITAÇÃO</div><div class=\"value\">' + ($json.body.event === 'password_reset_request' ? 'Recuperação de Senha' : ($json.body.event === 'user_registered' ? 'Cadastro de Novo Usuário' : 'Liberação de Acesso')) + '</div>' + ",
        "'<div class=\"label\">PRÓXIMO PASSO</div><div class=\"value\" style=\"margin-bottom:0;\">' + ($json.body.event === 'password_reset_request' ? 'Siga as instruções enviadas para criar uma nova senha.' : ($json.body.event === 'user_registered' ? 'Aguarde enquanto validamos seus dados.' : 'Você já pode acessar o sistema.')) + '</div>'",
        ")",
        "'</div><div class=\"btn-container\"><a href=\"' + ",
        "($json.body.workOrder && $json.body.workOrder.id) ? ($json.body.workOrder.url || ('https://manutencao.novohorizonte.com/#/work-orders/' + $json.body.workOrder.id)) : ($json.body.event === 'password_reset_request' ? ($json.body.reset_url || 'https://manutencao.novohorizonte.com/#/reset-password') : 'https://manutencao.novohorizonte.com/')",
        "'\" class=\"btn\">' + ",
        "($json.body.workOrder && $json.body.workOrder.id) ? 'Acompanhar Minha Solicitação' : ($json.body.event === 'password_reset_request' ? 'Redefinir Senha' : 'Acessar Sistema')",
        "'</a></div></div><div class=\"footer\">Novo Horizonte CMMS • Tecnologia em Gestão<br>© 2026 Novo Horizonte</div></div></body></html>'",
    ]
    return "={{ " + " + ".join(html_parts) + " }}"

print(get_os_html_v2())
