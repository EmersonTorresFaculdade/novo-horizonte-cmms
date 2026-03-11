
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fdezpdgtxmhijsfupajj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZXpwZGd0eG1oaWpzZnVwYWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTE1NjMsImV4cCI6MjA4NTg4NzU2M30.iMWdiC5km2Hxj81whQnHBsqYZ1f2o2qcWSIHoH2Qsyg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestWorkOrder() {
    console.log('--- Iniciando criação de OS teste ---');

    try {
        // 1. Buscar um ativo (asset) qualquer para vincular
        const { data: assets, error: assetError } = await supabase
            .from('assets')
            .select('id, name, sector')
            .limit(1);

        if (assetError) throw assetError;
        const asset = assets?.[0];

        // 2. Buscar um usuário (requester) qualquer
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, name')
            .limit(1);

        if (userError) throw userError;
        const user = users?.[0];

        console.log(`Ativo selecionado: ${asset?.name || 'Nenhum'}`);
        console.log(`Usuário selecionado: ${user?.name || 'Nenhum'}`);

        // 3. Criar a Ordem de Serviço
        const payload = {
            asset_id: asset?.id || null,
            maintenance_category: 'Equipamento',
            priority: 'Alta',
            status: 'Recebido', // Status inicial pedido: Recebido
            issue: 'TESTE AUTOMATIZADO: Falha intermitente no sensor de proximidade infravermelho. Necessário calibração e verificação de fiação externa.',
            failure_type: 'Elétrica',
            sector: asset?.sector || 'Produção',
            date: new Date().toISOString(),
            requester_id: user?.id || null,
            maintenance_type: 'Corretiva',
            estimated_hours: 2,
            downtime_hours: 0,
            parts_cost: 0,
            response_hours: 0,
        };

        const { data: newOrder, error: insertError } = await supabase
            .from('work_orders')
            .insert([payload])
            .select()
            .single();

        if (insertError) throw insertError;

        console.log('✅ Ordem de Serviço criada com sucesso!');
        console.log(`ID: ${newOrder.id}`);
        console.log(`Número (OS): ${newOrder.order_number}`);
        console.log(`Status atual: ${newOrder.status}`);
        console.log('\nVocê já pode ver esta OS no sistema e alterar o status conforme desejado.');

    } catch (err) {
        console.error('❌ Erro ao criar OS teste:', err.message);
    }
}

createTestWorkOrder();
