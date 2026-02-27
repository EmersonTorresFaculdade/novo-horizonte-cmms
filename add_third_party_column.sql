-- Adicionar nova coluna para vincular Empresas Parceiras à Ordem de Serviço
ALTER TABLE work_orders
ADD COLUMN third_party_company_id UUID REFERENCES third_party_companies(id) ON DELETE SET NULL;

CREATE INDEX idx_work_orders_third_party_company_id ON work_orders(third_party_company_id);

-- Atualização da view e RLS (caso necessário, no futuro) para third_party_company_id
