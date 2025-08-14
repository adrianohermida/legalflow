import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { 
  FileX, 
  Users, 
  Calendar,
  Ticket,
  Activity,
  DollarSign,
  FileText,
  Inbox,
  Briefcase,
  FolderOpen,
  Plus
} from 'lucide-react';

interface EmptyStateProps {
  type: 'clientes' | 'processos' | 'tickets' | 'activities' | 'deals' | 'agenda' | 'documentos' | 'inbox' | 'jornadas' | 'financeiro' | 'relatorios' | 'default';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

const emptyStateConfig = {
  clientes: {
    icon: <Users className="h-12 w-12 text-gray-400" />,
    title: 'Nenhum cliente cadastrado',
    description: 'Comece adicionando seus primeiros clientes ao sistema.',
    actionLabel: 'Adicionar Cliente',
  },
  processos: {
    icon: <FileText className="h-12 w-12 text-gray-400" />,
    title: 'Nenhum processo encontrado',
    description: 'Importe ou sincronize processos dos tribunais.',
    actionLabel: 'Sincronizar Processos',
  },
  tickets: {
    icon: <Ticket className="h-12 w-12 text-gray-400" />,
    title: 'Nenhum ticket criado',
    description: 'Organize atendimentos e solicitações criando tickets.',
    actionLabel: 'Criar Ticket',
  },
  activities: {
    icon: <Activity className="h-12 w-12 text-gray-400" />,
    title: 'Nenhuma atividade cadastrada',
    description: 'Gerencie tarefas e acompanhe o progresso do escritório.',
    actionLabel: 'Nova Atividade',
  },
  deals: {
    icon: <Briefcase className="h-12 w-12 text-gray-400" />,
    title: 'Nenhuma oportunidade em andamento',
    description: 'Gerencie propostas e negocios em potencial.',
    actionLabel: 'Nova Oportunidade',
  },
  agenda: {
    icon: <Calendar className="h-12 w-12 text-gray-400" />,
    title: 'Agenda vazia',
    description: 'Agende compromissos, audiências e reuniões.',
    actionLabel: 'Novo Evento',
  },
  documentos: {
    icon: <FolderOpen className="h-12 w-12 text-gray-400" />,
    title: 'Nenhum documento encontrado',
    description: 'Faça upload e organize os documentos do processo.',
    actionLabel: 'Enviar Documento',
  },
  inbox: {
    icon: <Inbox className="h-12 w-12 text-gray-400" />,
    title: 'Caixa de entrada vazia',
    description: 'Publicações e movimentações aparecerão aqui.',
    actionLabel: 'Atualizar Publicações',
  },
  jornadas: {
    icon: <FileText className="h-12 w-12 text-gray-400" />,
    title: 'Nenhuma jornada iniciada',
    description: 'Inicie fluxos padronizados para seus processos.',
    actionLabel: 'Iniciar Jornada',
  },
  financeiro: {
    icon: <DollarSign className="h-12 w-12 text-gray-400" />,
    title: 'Nenhum plano de pagamento',
    description: 'Configure cobranças e acompanhe recebimentos.',
    actionLabel: 'Criar Plano',
  },
  relatorios: {
    icon: <FileText className="h-12 w-12 text-gray-400" />,
    title: 'Relatórios em construção',
    description: 'Dados insuficientes para gerar relatórios.',
    actionLabel: 'Ver Dados',
  },
  default: {
    icon: <FileX className="h-12 w-12 text-gray-400" />,
    title: 'Nenhum item encontrado',
    description: 'Tente ajustar os filtros ou adicionar novos itens.',
    actionLabel: 'Adicionar Item',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = '',
}) => {
  const config = emptyStateConfig[type] || emptyStateConfig.default;
  
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4">
          {icon || config.icon}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title || config.title}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          {description || config.description}
        </p>
        
        {onAction && (
          <Button onClick={onAction} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel || config.actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
