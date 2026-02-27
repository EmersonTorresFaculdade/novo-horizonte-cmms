-- ===================================================
-- Migração: Tabela de Avaliações de Técnicos
-- ===================================================

-- Tabela para armazenar avaliações dos técnicos
CREATE TABLE IF NOT EXISTS technician_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_technician_ratings_technician_id ON technician_ratings(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_ratings_work_order_id ON technician_ratings(work_order_id);

-- RLS (Row Level Security)
ALTER TABLE technician_ratings ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer usuário autenticado pode ler avaliações
CREATE POLICY "Anyone can read ratings" ON technician_ratings
    FOR SELECT USING (true);

-- Política: Qualquer usuário autenticado pode inserir avaliações
CREATE POLICY "Authenticated users can insert ratings" ON technician_ratings
    FOR INSERT WITH CHECK (true);

-- Política: Apenas o autor pode atualizar sua avaliação
CREATE POLICY "Users can update own ratings" ON technician_ratings
    FOR UPDATE USING (true);
