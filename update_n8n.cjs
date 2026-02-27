const fs = require('fs');
const file = fs.readFileSync('c:\\Users\\Emerson\\.gemini\\antigravity\\brain\\3281bc05-bdb8-4b88-a673-399338cc5ec3\\.system_generated\\steps\\4576\\output.txt', 'utf8');
const data = JSON.parse(file).data;
const nodes = data.activeVersion.nodes;

const operations = [];

for (const node of nodes) {
    if (node.name === 'Admin Email' || node.name === 'Send Requester Email') {
        let html = node.parameters.html;
        // Insert new fields after Tipo de Falha
        const insertionMarker = '<div class=\\"field\\"><div class=\\"label\\">Tipo de Falha</div><div class=\\"value\\">\' + ($json.body.failure_type || \'Não especificado\') + \'</div></div>';
        const newFields = '<div class=\\"field\\"><div class=\\"label\\">Classe de Manutenção</div><div class=\\"value\\">\' + ($json.body.workOrder.maintenance_type || \'Não especificada\') + \'</div></div><div class=\\"field\\"><div class=\\"label\\">Tempo Estimado</div><div class=\\"value\\">\' + (($json.body.workOrder.estimated_hours !== undefined && $json.body.workOrder.estimated_hours !== null) ? $json.body.workOrder.estimated_hours + \'h\' : \'Não especificado\') + \'</div></div>';

        if (html.includes(insertionMarker)) {
            html = html.replace(insertionMarker, insertionMarker + newFields);
        } else {
            console.log("Could not find insertion marker in " + node.name);
        }

        operations.push({
            type: 'updateNode',
            nodeName: node.name,
            parameters: { html }
        });
    }

    if (node.name === 'Admin WhatsApp' || node.name === 'Requester WhatsApp') {
        const textParam = node.parameters.bodyParameters.parameters.find(p => p.name === 'text');
        if (textParam) {
            let text = textParam.value;

            if (text.includes("\\n📂 *Falha:* ' + ($json.body.failure_type || 'N/A') + '\\n")) {
                const newFields2 = '🛠️ *Classe:* \' + ($json.body.workOrder.maintenance_type || \'N/A\') + \'\\n⏳ *T. Estimado:* \' + (($json.body.workOrder.estimated_hours !== undefined && $json.body.workOrder.estimated_hours !== null) ? $json.body.workOrder.estimated_hours + \'h\' : \'N/A\') + \'\\n';
                text = text.replace("\\n📂 *Falha:* ' + ($json.body.failure_type || 'N/A') + '\\n", "\\n📂 *Falha:* ' + ($json.body.failure_type || 'N/A') + '\\n" + newFields2);
            } else if (text.includes("\\n📂 *Falha:* {{ $json.body.failure_type || 'N/A' }}\\n")) {
                const newFieldsTemplateString = "🛠️ *Classe:* {{ $json.body.workOrder.maintenance_type || 'N/A' }}\\n⏳ *T. Estimado:* {{ $json.body.workOrder.estimated_hours ? $json.body.workOrder.estimated_hours + 'h' : 'N/A' }}\\n";
                text = text.replace("\\n📂 *Falha:* {{ $json.body.failure_type || 'N/A' }}\\n", "\\n📂 *Falha:* {{ $json.body.failure_type || 'N/A' }}\\n" + newFieldsTemplateString);
            } else {
                console.log("Could not find insertion marker in " + node.name);
                console.log(text);
            }

            const newBodyParams = [...node.parameters.bodyParameters.parameters];
            const tIndex = newBodyParams.findIndex(p => p.name === 'text');
            newBodyParams[tIndex] = { name: 'text', value: text };

            operations.push({
                type: 'updateNode',
                nodeName: node.name,
                parameters: {
                    bodyParameters: {
                        ...node.parameters.bodyParameters,
                        parameters: newBodyParams
                    }
                }
            });
        }
    }
}

fs.writeFileSync('n8n_operations.json', JSON.stringify(operations, null, 2));
console.log("Wrote operations successfully!");
