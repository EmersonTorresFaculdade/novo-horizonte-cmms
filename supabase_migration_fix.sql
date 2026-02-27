-- ============================================================
-- MIGRAÇÃO: Atualizar constraint de status + colunas faltantes
-- Execute este script no Supabase SQL Editor:
-- https://supabase.com/dashboard → Seu projeto → SQL Editor
-- ============================================================

-- 1. REMOVER a constraint antiga de status
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- 2. CRIAR nova constraint com TODOS os status válidos
ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
    'Pendente', 
    'Em Manutenção', 
    'Aguardando Peça', 
    'Concluído', 
    'Aberto', 
    'Recebido', 
    'Em Execução', 
    'Finalizado', 
    'Cancelado'
));

-- 3. Adicionar colunas de SLA (se ainda não existirem)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- 4. Adicionar campo de garantia nos ativos (se ainda não existir)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS warranty_expires_at TIMESTAMP WITH TIME ZONE;

-- 5. Garantir que a tabela de atividades existe
CREATE TABLE IF NOT EXISTS work_order_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT,
  activity_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Desabilitar RLS na tabela de atividades (para evitar permissões)
ALTER TABLE work_order_activities DISABLE ROW LEVEL SECURITY;

-- 7. Permissões para leitura/escrita
GRANT ALL ON TABLE work_order_activities TO authenticated;
GRANT ALL ON TABLE work_order_activities TO anon;
GRANT ALL ON TABLE work_order_activities TO service_role;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
