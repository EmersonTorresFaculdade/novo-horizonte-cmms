export interface WorkOrder {
  id: string;
  asset: string;
  issue: string;
  status: 'Aberto' | 'Em Progresso' | 'Concluído' | 'Crítico' | 'Pendente';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  technician: string;
  technicianAvatar?: string;
  date: string;
  sector: string;
  failure_type: string;
  technical_report?: string;
  maintenance_type?: 'Preventiva' | 'Corretiva' | 'Preditiva';
  response_hours?: number;
  estimated_hours?: number;
  parts_cost?: number;
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  status: 'Ativo' | 'Inativo';
  avatar: string;
  performance: {
    open: number;
    closed: number;
  };
  contact: string;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  sector: string;
  model: string;
  status: 'Operacional' | 'Em Manutenção' | 'Parada';
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitValue: number;
  status: 'Normal' | 'Baixo Estoque' | 'Esgotado' | 'Atenção';
}