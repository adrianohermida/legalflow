import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { locale } from '../../lib/locale';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Users,
  ArrowRight,
  MessageCircle,
  Calendar,
  Filter,
  TrendingUp,
  Play,
  ExternalLink,
  Clock,
  User
} from 'lucide-react';

interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  dados: any;
  pausado: boolean;
  created_at: string;
  updated_at: string;
}

const CRMLeads: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Build dynamic query based on filters
  const buildQuery = () => {
    let whereClause = 'true';
    const params: any[] = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereClause += ` and (nome ilike $${paramIndex} or whatsapp ilike $${paramIndex})`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (originFilter !== 'all') {
      whereClause += ` and dados->>'source' = $${paramIndex}`;
      params.push(originFilter);
      paramIndex++;
    }

    if (statusFilter !== 'all') {
      const isPaused = statusFilter === 'paused';
      whereClause += ` and pausado = $${paramIndex}`;
      params.push(isPaused);
      paramIndex++;
    }

    if (dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      whereClause += ` and created_at >= now() - interval '${daysAgo} days'`;
    }

    return {
      query: `
        select id, nome, whatsapp, dados, pausado, created_at, updated_at
        from public.leads
        where ${whereClause}
        order by created_at desc
        limit 50
      `,
      params
    };
  };

  const { query, params } = buildQuery();
  
  // Fetch leads with filters
  const { data: leads, isLoading, error, refetch } = useSupabaseQuery<Lead[]>(
    ['crm-leads', searchTerm, originFilter, statusFilter, dateRange],
    query,
    params
  );

  // Get lead stats
  const { data: leadStats } = useSupabaseQuery(
    'lead-stats',
    `
    select 
      count(*) as total,
      count(*) filter (where pausado = false) as active,
      count(*) filter (where pausado = true) as paused,
      count(*) filter (where created_at >= now() - interval '7 days') as recent,
      count(distinct dados->>'source') as sources
    from public.leads
    `
  );

  const handleConvertLead = async (lead: Lead) => {
    setIsConverting(lead.id);
    
    try {
      const { data, error } = await supabase.rpc('crm_convert_lead', {
        p_lead_whatsapp: lead.whatsapp
      });

      if (error) throw error;

      toast({
        title: 'Lead convertido!',
        description: `${lead.nome} foi convertido em contato e deal`,
        action: (
          <Button
            size="sm"
            onClick={() => navigate(`/crm/deals`)}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Ver Deal
          </Button>
        )
      });

      refetch();
    } catch (error) {
      console.error('Error converting lead:', error);
      toast({
        title: 'Erro na conversão',
        description: 'Falha ao converter lead. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsConverting(null);
    }
  };

  const getOriginBadge = (origin: string) => {
    const colors = {
      'website': 'bg-blue-100 text-blue-800',
      'whatsapp': 'bg-green-100 text-green-800',
      'social': 'bg-purple-100 text-purple-800',
      'referral': 'bg-orange-100 text-orange-800',
      'campaign': 'bg-pink-100 text-pink-800',
    };
    
    const color = colors[origin as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={color}>
        {origin || 'Não informado'}
      </Badge>
    );
  };

  const getStatusBadge = (pausado: boolean) => {
    return pausado ? (
      <Badge variant="secondary">Pausado</Badge>
    ) : (
      <Badge variant="default">Ativo</Badge>
    );
  };

  if (isLoading) return <LoadingState type="list" title="Carregando leads..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
        <p className="text-gray-600">
          Converta leads em contatos e deals no pipeline de vendas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{leadStats?.total || 0}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{leadStats?.active || 0}</div>
                <div className="text-xs text-gray-600">Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{leadStats?.paused || 0}</div>
                <div className="text-xs text-gray-600">Pausados</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{leadStats?.recent || 0}</div>
                <div className="text-xs text-gray-600">Últimos 7d</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">{leadStats?.sources || 0}</div>
                <div className="text-xs text-gray-600">Fontes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="social">Redes Sociais</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="campaign">Campanha</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="paused">Pausados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Leads ({leads?.length || 0})
          </CardTitle>
          <CardDescription>
            Lista de leads aguardando conversão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!leads?.length ? (
            <EmptyState
              type="activities"
              title="Nenhum lead encontrado"
              description="Leads de diferentes fontes aparecerão aqui para conversão"
              actionLabel="Ajustar Filtros"
              onAction={() => {
                setSearchTerm('');
                setOriginFilter('all');
                setStatusFilter('all');
                setDateRange('all');
              }}
            />
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-600" />
                      {getStatusBadge(lead.pausado)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{lead.nome}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {lead.whatsapp}
                        </span>
                        {lead.dados?.source && getOriginBadge(lead.dados.source)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {locale.formatRelativeTime(lead.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleConvertLead(lead)}
                      disabled={isConverting === lead.id || lead.pausado}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      {isConverting === lead.id ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Convertendo...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Converter
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Help */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Como funciona a conversão?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-full p-2">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">1. Cria Contato</div>
                <div className="text-gray-600">
                  Lead vira contato na tabela legalflow.contacts
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 rounded-full p-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium">2. Cria Deal</div>
                <div className="text-gray-600">
                  Oportunidade no pipeline "sales" estágio "novo"
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 rounded-full p-2">
                <ArrowRight className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">3. Acompanhe</div>
                <div className="text-gray-600">
                  Deal aparece no kanban para acompanhamento
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMLeads;
