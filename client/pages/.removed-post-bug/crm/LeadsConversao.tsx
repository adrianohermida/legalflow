import React, { useState } from 'react';
import { 
  Users, 
  MessageCircle, 
  ArrowRight, 
  Filter, 
  Calendar, 
  Search,
  Phone,
  Clock,
  CheckCircle,
  Target,
  TrendingUp
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase, lf } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  dados: any;
  created_at: string;
  pausado: boolean;
}

const LeadsConversao = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('all');
  const [showPausados, setShowPausados] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [conversionResult, setConversionResult] = useState<any>(null);

  // Query para leads
  const { data: leads = [], isLoading, refetch } = useSupabaseQuery(
    ['leads', searchTerm, filterOrigem, filterPeriodo, showPausados],
    `
      SELECT 
        id, nome, whatsapp, dados, created_at, pausado
      FROM public.leads
      WHERE 
        ($1 = '' OR nome ILIKE '%' || $1 || '%' OR whatsapp ILIKE '%' || $1 || '%')
        AND ($2 = 'all' OR dados->>'source' = $2)
        AND ($3 = 'all' OR 
             ($3 = 'today' AND created_at >= CURRENT_DATE) OR
             ($3 = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
             ($3 = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days'))
        AND ($4 = false OR pausado = true)
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [searchTerm, filterOrigem, filterPeriodo, showPausados]
  );

  // Query para estatísticas de leads
  const { data: stats } = useSupabaseQuery(
    'leads-stats',
    `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE pausado = false) as ativos,
        COUNT(*) FILTER (WHERE pausado = true) as pausados,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as hoje,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as semana,
        COUNT(DISTINCT dados->>'source') as origens
      FROM public.leads
    `,
    []
  );

  // Query para origens disponíveis
  const { data: origens = [] } = useSupabaseQuery(
    'leads-origens',
    `
      SELECT 
        dados->>'source' as origem,
        COUNT(*) as count
      FROM public.leads
      WHERE dados->>'source' IS NOT NULL
      GROUP BY dados->>'source'
      ORDER BY count DESC
    `,
    []
  );

  // Converter lead em contato + deal
  const handleConvertLead = async (lead: Lead) => {
    setIsConverting(true);
    setSelectedLead(lead);

    try {
      // Chamar RPC de conversão
      const { data, error } = await lf.rpc('crm_convert_lead', {
        p_lead_whatsapp: lead.whatsapp
      });

      if (error) throw error;

      setConversionResult(data);

      toast({
        title: 'Lead convertido com sucesso!',
        description: `${lead.nome} foi convertido em contato e deal.`
      });

      refetch(); // Atualizar lista

    } catch (error) {
      console.error('Erro na conversão:', error);
      toast({
        title: 'Erro na conversão',
        description: 'Não foi possível converter o lead.',
        variant: 'destructive'
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Navegar para o deal criado
  const handleAbrirDeal = () => {
    if (conversionResult?.deal_id) {
      window.location.href = `/crm/deals?highlight=${conversionResult.deal_id}`;
    }
  };

  // Pausar/reativar lead
  const handleTogglePausar = async (leadId: string, pausado: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ pausado: !pausado })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: pausado ? 'Lead reativado' : 'Lead pausado',
        description: `Status do lead foi atualizado.`
      });

      refetch();

    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o lead.',
        variant: 'destructive'
      });
    }
  };

  const getOrigemBadge = (origem: string) => {
    switch (origem) {
      case 'whatsapp':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">WhatsApp</Badge>;
      case 'website':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Website</Badge>;
      case 'referral':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Indicação</Badge>;
      case 'social':
        return <Badge variant="secondary" className="bg-pink-100 text-pink-800">Redes Sociais</Badge>;
      default:
        return <Badge variant="outline">{origem || 'Desconhecida'}</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${Math.floor(diffInHours)} horas`;
    if (diffInHours < 168) return `Há ${Math.floor(diffInHours / 24)} dias`;
    return `Há ${Math.floor(diffInHours / 168)} semanas`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8" />
            Conversão de Leads
          </h1>
          <p className="text-gray-600 mt-1">
            Transforme leads em contatos e oportunidades de negócio
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Ativos</p>
                  <p className="text-2xl font-bold">{stats.ativos || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Pausados</p>
                  <p className="text-2xl font-bold">{stats.pausados || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Hoje</p>
                  <p className="text-2xl font-bold">{stats.hoje || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Semana</p>
                  <p className="text-2xl font-bold">{stats.semana || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-pink-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Origens</p>
                  <p className="text-2xl font-bold">{stats.origens || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterOrigem} onValueChange={setFilterOrigem}>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                {origens.map(origem => (
                  <SelectItem key={origem.origem} value={origem.origem}>
                    {origem.origem} ({origem.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-pausados"
                checked={showPausados}
                onChange={(e) => setShowPausados(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="show-pausados" className="text-sm">
                Mostrar pausados
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className={lead.pausado ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="font-medium">{lead.nome}</div>
                      {lead.dados?.interesse && (
                        <div className="text-xs text-gray-500">
                          Interesse: {lead.dados.interesse}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="font-mono">{lead.whatsapp}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getOrigemBadge(lead.dados?.source)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {formatTimeAgo(lead.created_at)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {lead.pausado ? (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          Pausado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-2">
                        {!lead.pausado && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertLead(lead)}
                            disabled={isConverting}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Converter
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePausar(lead.id, lead.pausado)}
                        >
                          {lead.pausado ? 'Reativar' : 'Pausar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Nenhum lead encontrado
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Tente ajustar os filtros de busca' : 'Aguardando novos leads'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Resultado da Conversão */}
      <Dialog open={!!conversionResult} onOpenChange={() => setConversionResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Lead Convertido com Sucesso!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">
                Conversão Realizada
              </h4>
              <p className="text-green-700 text-sm">
                O lead "{selectedLead?.nome}" foi convertido em:
              </p>
              <ul className="text-green-700 text-sm mt-2 space-y-1">
                <li>• Contato no CRM (ID: {conversionResult?.contact_id})</li>
                <li>• Deal no pipeline de vendas (ID: {conversionResult?.deal_id})</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAbrirDeal} className="flex-1">
                <ArrowRight className="h-4 w-4 mr-2" />
                Abrir Deal
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = `/crm/contatos/${conversionResult?.contact_id}`}
                className="flex-1"
              >
                Ver Contato
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsConversao;
