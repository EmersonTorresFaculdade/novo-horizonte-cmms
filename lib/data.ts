import { WorkOrder, InventoryItem } from '../types';
import { IMAGES } from '../constants';

export const workOrdersData: WorkOrder[] = [
    // Open
    {
        id: '#4022',
        asset: 'Fresadora CNC 04',
        issue: 'Vazamento hidráulico',
        priority: 'Alta',
        sector: 'Embalagem',
        status: 'Aberto',
        date: '2h atrás',
        technician: 'Não atribuído'
    } as any,
    {
        id: '#4023',
        asset: 'Robô de Solda R2',
        issue: 'Erro de calibração eixo Z',
        priority: 'Média',
        sector: 'Montagem',
        status: 'Aberto',
        date: '4h atrás',
        technician: 'Não atribuído'
    } as any,
    // In Progress
    {
        id: '#4020',
        asset: 'Empilhadeira 09',
        issue: 'Manutenção de Bateria',
        priority: 'Média',
        sector: 'Logística',
        status: 'Em Progresso',
        date: '1d atrás',
        technician: 'João Doe',
        technicianAvatar: IMAGES.technicianJohn
    } as any,
    {
        id: '#4021',
        asset: 'Esteira A',
        issue: 'Falha no Motor - Linha Parada',
        priority: 'Crítica',
        sector: 'Montagem',
        status: 'Pendente',
        date: '30m atrás',
        technician: 'Pendente'
    } as any,
    // Completed
    {
        id: '#4018',
        asset: 'Unidade HVAC 3',
        issue: 'Troca de Filtro',
        priority: 'Baixa',
        sector: 'Instalações',
        status: 'Concluído',
        date: '2d atrás',
        technician: 'Jane Smith',
        technicianAvatar: IMAGES.technicianAna
    } as any,
    {
        id: '#4015',
        asset: 'Compressor C1',
        issue: 'Troca de Óleo',
        priority: 'Baixa',
        sector: 'Utilidades',
        status: 'Concluído',
        date: '3d atrás',
        technician: 'Carlos Silva',
        technicianAvatar: IMAGES.profileCarlos
    } as any
];

export const inventoryData: InventoryItem[] = [
    {
        id: '1',
        sku: 'P-1023',
        name: 'Rolamento Esférico 20mm',
        unitValue: 45.00,
        quantity: 3,
        status: 'Baixo Estoque'
    },
    {
        id: '2',
        sku: 'E-2201',
        name: 'Engrenagem Cônica 45D',
        unitValue: 120.50,
        quantity: 28,
        status: 'Normal'
    },
    {
        id: '3',
        sku: 'C-0882',
        name: 'Correia Dentada HTD 8M',
        unitValue: 85.90,
        quantity: 15,
        status: 'Normal'
    },
    {
        id: '4',
        sku: 'O-0012',
        name: 'Óleo Lubrificante ISO 68',
        unitValue: 25.00,
        quantity: 0,
        status: 'Esgotado'
    },
    {
        id: '5',
        sku: 'S-9932',
        name: 'Sensor Indutivo M18',
        unitValue: 145.00,
        quantity: 8,
        status: 'Atenção'
    }
];
