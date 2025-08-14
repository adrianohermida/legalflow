import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Calendar, FileText, Eye, Link, Trash2, Plus, Filter, Search, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { supabase } from '../lib/supabase';
import { format, isAfter, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../hooks/use-toast';

interface TimelineEvent {
  tipo: 'movimentacao' | 'publicacao';
  numero_cnj: string;
  data: string;
  conteudo: string;
  source_id: string;
  metadata: any;
}

interface ProcessoTimelineUnificadaProps {
  numeroCnj: string;
}

interface UnlinkedPublication {
  id: number;
  data: any;
  data_publicacao: string;
  numero_cnj: string | null;
}

export default function ProcessoTimelineUnificada({ numeroCnj }: ProcessoTimelineUnificadaProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [viewMode, setViewMode] = useState<'recent' | 'complete'>('recent');
  const [showCompleteHistoryModal, setShowCompleteHistoryModal] = useState(false);
  const [showLinkPublicationModal, setShowLinkPublicationModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movimentacao' | 'publicacao'>('all');
  const [selectedPublication, setSelectedPublication] = useState<UnlinkedPublication | null>(null);
  const [processoSearchTerm, setProcessoSearchTerm] = useState('');

  const thirtyDaysAgo = subDays(new Date(), 30);

  // Recent timeline query (last 30 days)
  const { data: recentTimeline = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['timeline-recent', numeroCnj, filterType, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('vw_timeline_processo')
        .select('*')
        .eq('numero_cnj', numeroCnj)
        .gte('data', thirtyDaysAgo.toISOString())
        .order('data', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('tipo', filterType);
      }

      if (searchTerm) {
        query = query.ilike('conteudo', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: viewMode === 'recent'
  });

  // Complete timeline query with pagination
  const { data: completeTimelineData, isLoading: isLoadingComplete } = useQuery({
    queryKey: ['timeline-complete', numeroCnj, currentPage, pageSize, filterType, searchTerm],
    queryFn: async () => {
      const startIndex = (currentPage - 1) * pageSize;
      
      let query = supabase
        .from('vw_timeline_processo')
        .select('*', { count: 'exact' })
        .eq('numero_cnj', numeroCnj)
        .order('data', { ascending: false })
        .range(startIndex, startIndex + pageSize - 1);

      if (filterType !== 'all') {
        query = query.eq('tipo', filterType);
      }

      if (searchTerm) {
        query = query.ilike('conteudo', `%${searchTerm}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: showCompleteHistoryModal
  });

  // Unlinked publications query
  const { data: unlinkedPublications = [] } = useQuery({
    queryKey: ['unlinked-publications', processoSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from('publicacoes')
        .select('*')
        .is('numero_cnj', null)
        .order('data_publicacao', { ascending: false })
        .limit(50);

      if (processoSearchTerm) {
        query = query.or(`data->>resumo.ilike.%${processoSearchTerm}%,data->>texto.ilike.%${processoSearchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: showLinkPublicationModal
  });

  // Link publication mutation
  const linkPublicationMutation = useMutation({
    mutationFn: async ({ publicationId, cnj }: { publicationId: number; cnj: string }) => {
      const { error } = await supabase
        .from('publicacoes')
        .update({ numero_cnj: cnj })
        .eq('id', publicationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Publicação vinculada ao processo com sucesso!"
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-recent'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-complete'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-publications'] });
      setShowLinkPublicationModal(false);
      setSelectedPublication(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao vincular publicação. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Get the appropriate timeline data based on view mode
  const timelineData = useMemo(() => {
    if (viewMode === 'recent') {
      return recentTimeline;
    }
    return completeTimelineData?.data || [];
  }, [viewMode, recentTimeline, completeTimelineData]);

  const isLoading = viewMode === 'recent' ? isLoadingRecent : isLoadingComplete;

  // Event type icon mapping
  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case 'movimentacao':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'publicacao':
        return <FileText className="w-4 h-4 text-green-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  // Event type badge styling
  const getEventBadge = (tipo: string) => {
    switch (tipo) {
      case 'movimentacao':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Movimentação</Badge>;
      case 'publicacao':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Publicação</Badge>;
      default:
        return <Badge variant="outline">Evento</Badge>;
    }
  };

  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Timeline event component
  const TimelineEventCard = ({ event }: { event: TimelineEvent }) => (
    <Card key={`${event.tipo}-${event.source_id}`} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getEventIcon(event.tipo)}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            {getEventBadge(event.tipo)}
            <span className="text-sm text-gray-500">
              {formatEventDate(event.data)}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {event.conteudo}
          </p>
          {event.metadata && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Eye className="w-3 h-3 mr-1" />
                Detalhes
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (isLoading && viewMode === 'recent') {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-4 h-4 rounded mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="w-20 h-5" />
                  <Skeleton className="w-32 h-4" />
                </div>
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-3/4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Timeline do Processo</h2>
          <p className="text-sm text-gray-600">
            {viewMode === 'recent' 
              ? `Exibindo eventos dos últimos 30 dias (${timelineData.length} eventos)`
              : 'Histórico completo'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('recent')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Recentes (30d)
          </Button>
          
          <Dialog open={showCompleteHistoryModal} onOpenChange={setShowCompleteHistoryModal}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setViewMode('complete');
                  setCurrentPage(1);
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Ver histórico completo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Histórico Completo - Timeline do Processo</DialogTitle>
              </DialogHeader>
              
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Buscar no histórico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="movimentacao">Movimentações</SelectItem>
                    <SelectItem value="publicacao">Publicações</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline content */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoadingComplete ? (
                  [...Array(5)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-4 h-4 rounded mt-1" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Skeleton className="w-20 h-5" />
                            <Skeleton className="w-32 h-4" />
                          </div>
                          <Skeleton className="w-full h-4" />
                          <Skeleton className="w-3/4 h-4" />
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <>
                    {timelineData.map((event) => (
                      <TimelineEventCard key={`${event.tipo}-${event.source_id}`} event={event} />
                    ))}
                    
                    {timelineData.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum evento encontrado</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Pagination */}
              {completeTimelineData && completeTimelineData.totalPages > 1 && (
                <div className="border-t pt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={completeTimelineData.totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters for recent view */}
      {viewMode === 'recent' && (
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="movimentacao">Movimentações</SelectItem>
              <SelectItem value="publicacao">Publicações</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showLinkPublicationModal} onOpenChange={setShowLinkPublicationModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link className="w-4 h-4 mr-2" />
                Vincular publicação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Vincular Publicação ao Processo</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Buscar publicações não vinculadas..."
                    value={processoSearchTerm}
                    onChange={(e) => setProcessoSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 max-h-96">
                  {unlinkedPublications.map((pub) => (
                    <Card key={pub.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">
                              {pub.data_publicacao ? formatEventDate(pub.data_publicacao) : 'Data não informada'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {pub.data?.resumo || pub.data?.texto || 'Conteúdo não disponível'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            linkPublicationMutation.mutate({
                              publicationId: pub.id,
                              cnj: numeroCnj
                            });
                          }}
                          disabled={linkPublicationMutation.isPending}
                        >
                          <Link className="w-4 h-4 mr-1" />
                          Vincular
                        </Button>
                      </div>
                    </Card>
                  ))}
                  
                  {unlinkedPublications.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma publicação não vinculada encontrada</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Timeline events */}
      <div className="space-y-3">
        {timelineData.map((event) => (
          <TimelineEventCard key={`${event.tipo}-${event.source_id}`} event={event} />
        ))}
        
        {timelineData.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-sm">
              {viewMode === 'recent' 
                ? 'Não há eventos nos últimos 30 dias para este processo.'
                : 'Não há eventos no histórico para este processo.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
