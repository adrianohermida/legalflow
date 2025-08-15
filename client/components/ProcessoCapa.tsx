import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  Building, 
  Users, 
  Scale,
  Clock,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { supabase } from '../lib/supabase';
import { formatCNJ, formatDate } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProcessoTags from './ProcessoTags';
import ProcessoTree from './ProcessoTree';

interface ProcessoCapaProps {
  numeroCnj: string;
}

interface PrintOptions {
  includeMovimentacoes: boolean;
  includePublicacoes: boolean;
  includeAudiencias: boolean;
  includeArvoreProcessos: boolean;
  includePartes: boolean;
  includeDocumentos: boolean;
  periodo: 'todos' | '30dias' | '90dias' | '1ano';
}

export default function ProcessoCapa({ numeroCnj }: ProcessoCapaProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    includeMovimentacoes: false,
    includePublicacoes: false,
    includeAudiencias: false,
    includeArvoreProcessos: true,
    includePartes: true,
    includeDocumentos: false,
    periodo: '30dias'
  });

  // Query para dados do processo
  const { data: processo } = useQuery({
    queryKey: ['processo', numeroCnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processos')
        .select('*')
        .eq('numero_cnj', numeroCnj)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Query para partes do processo
  const { data: partes = [] } = useQuery({
    queryKey: ['partes', numeroCnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partes_processo')
        .select('*')
        .eq('numero_cnj', numeroCnj);
      
      if (error) throw error;
      return data || [];
    },
    enabled: printOptions.includePartes
  });

  // Query para movimentações (se incluídas)
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-print', numeroCnj, printOptions.periodo],
    queryFn: async () => {
      let query = supabase
        .from('movimentacoes')
        .select('*')
        .eq('numero_cnj', numeroCnj)
        .order('data_movimentacao', { ascending: false });

      // Aplicar filtro de período
      if (printOptions.periodo !== 'todos') {
        const days = {
          '30dias': 30,
          '90dias': 90,
          '1ano': 365
        }[printOptions.periodo];
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        query = query.gte('data_movimentacao', cutoffDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: printOptions.includeMovimentacoes
  });

  // Query para publicações (se incluídas)
  const { data: publicacoes = [] } = useQuery({
    queryKey: ['publicacoes-print', numeroCnj, printOptions.periodo],
    queryFn: async () => {
      let query = supabase
        .from('publicacoes')
        .select('*')
        .eq('numero_cnj', numeroCnj)
        .order('data_publicacao', { ascending: false });

      // Aplicar filtro de período
      if (printOptions.periodo !== 'todos') {
        const days = {
          '30dias': 30,
          '90dias': 90,
          '1ano': 365
        }[printOptions.periodo];
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        query = query.gte('data_publicacao', cutoffDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: printOptions.includePublicacoes
  });

  const generateTitle = () => {
    if (!processo) return 'Processo';
    
    const cnj = processo.numero_cnj;
    const poloAtivo = processo.titulo_polo_ativo || 'Autor';
    const poloPassivo = processo.titulo_polo_passivo || 'Réu';
    
    // Lógica para "e outros"
    const formatPolo = (polo: string) => {
      // Se contém vírgula ou "e", provavelmente tem múltiplas partes
      if (polo.includes(',') || polo.includes(' e ')) {
        const primeiraParte = polo.split(/[,e]/)[0].trim();
        return `${primeiraParte} e outros`;
      }
      return polo;
    };

    return `${cnj} (${formatPolo(poloAtivo)} × ${formatPolo(poloPassivo)})`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Implementar geração de PDF
    // Pode usar bibliotecas como jsPDF ou Puppeteer no backend
    console.log('Download PDF functionality to be implemented');
  };

  if (!processo) {
    return (
      <Button variant="outline" disabled>
        <Printer className="w-4 h-4 mr-2" />
        Gerar Capa
      </Button>
    );
  }

  return (
    <>
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Gerar Capa
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Opções de Impressão</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Incluir seções:</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="arvore"
                    checked={printOptions.includeArvoreProcessos}
                    onCheckedChange={(checked) => 
                      setPrintOptions(prev => ({ ...prev, includeArvoreProcessos: !!checked }))
                    }
                  />
                  <Label htmlFor="arvore">Árvore de processos</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="partes"
                    checked={printOptions.includePartes}
                    onCheckedChange={(checked) => 
                      setPrintOptions(prev => ({ ...prev, includePartes: !!checked }))
                    }
                  />
                  <Label htmlFor="partes">Partes do processo</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="movimentacoes"
                    checked={printOptions.includeMovimentacoes}
                    onCheckedChange={(checked) => 
                      setPrintOptions(prev => ({ ...prev, includeMovimentacoes: !!checked }))
                    }
                  />
                  <Label htmlFor="movimentacoes">Histórico de movimentações</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="publicacoes"
                    checked={printOptions.includePublicacoes}
                    onCheckedChange={(checked) => 
                      setPrintOptions(prev => ({ ...prev, includePublicacoes: !!checked }))
                    }
                  />
                  <Label htmlFor="publicacoes">Publicações</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="audiencias"
                    checked={printOptions.includeAudiencias}
                    onCheckedChange={(checked) => 
                      setPrintOptions(prev => ({ ...prev, includeAudiencias: !!checked }))
                    }
                  />
                  <Label htmlFor="audiencias">Audiências</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print version - hidden on screen, visible when printing */}
      <div ref={printRef} className="print:block hidden">
        <div className="print-page">
          {/* Header with logo */}
          <div className="flex items-center justify-between mb-8 border-b-2 border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              {/* Logo placeholder - replace with actual logo */}
              <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ESCRITÓRIO DE ADVOCACIA</h1>
                <p className="text-sm text-gray-600">OAB/SP 000.000</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          </div>

          {/* Process title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">CAPA DO PROCESSO</h2>
            <h3 className="text-lg font-medium text-gray-800">{generateTitle()}</h3>
          </div>

          {/* Process data */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4 text-lg border-b border-gray-300 pb-2">
                Dados Processuais
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Tribunal:</span>
                  <span>{processo.tribunal_sigla || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Área:</span>
                  <span>{processo.data?.capa?.area || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Classe:</span>
                  <span>{processo.data?.capa?.classe || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Assunto:</span>
                  <span>{processo.data?.capa?.assunto || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Instância:</span>
                  <span>{processo.data?.capa?.instancia || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Valor da Causa:</span>
                  <span>{processo.data?.capa?.valor_causa?.valor || '-'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-lg border-b border-gray-300 pb-2">
                Informações Adicionais
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Data de Distribuição:</span>
                  <span>{formatDate(processo.data?.capa?.data_distribuicao) || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Data de Ajuizamento:</span>
                  <span>{formatDate(processo.data?.capa?.data_ajuizamento) || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Situação:</span>
                  <span>{processo.data?.capa?.situacao || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span>{processo.data?.capa?.status || '-'}</span>
                </div>
              </div>
              
              {/* Tags */}
              <div className="mt-4">
                <h5 className="font-medium mb-2">Tags:</h5>
                <ProcessoTags numeroCnj={numeroCnj} readonly size="sm" />
              </div>
            </div>
          </div>

          {/* Process tree */}
          {printOptions.includeArvoreProcessos && (
            <div className="mb-8 page-break-inside-avoid">
              <h4 className="font-bold mb-4 text-lg border-b border-gray-300 pb-2">
                Árvore de Processos
              </h4>
              <ProcessoTree numeroCnj={numeroCnj} showActions={false} />
            </div>
          )}

          {/* Parties */}
          {printOptions.includePartes && partes.length > 0 && (
            <div className="mb-8 page-break-inside-avoid">
              <h4 className="font-bold mb-4 text-lg border-b border-gray-300 pb-2">
                Partes do Processo
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {['ATIVO', 'PASSIVO', 'ADVOGADO'].map(polo => {
                  const partesDestePolo = partes.filter(p => p.polo === polo);
                  if (partesDestePolo.length === 0) return null;
                  
                  return (
                    <div key={polo} className="text-sm">
                      <h5 className="font-medium mb-2">{polo === 'ATIVO' ? 'Polo Ativo' : polo === 'PASSIVO' ? 'Polo Passivo' : 'Advogados'}:</h5>
                      <ul className="space-y-1 ml-4">
                        {partesDestePolo.map((parte, index) => (
                          <li key={index}>
                            <strong>{parte.nome}</strong>
                            {parte.cpfcnpj && <span className="text-gray-600"> - {parte.cpfcnpj}</span>}
                            {parte.papel && <span className="text-gray-600"> ({parte.papel})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Movimentações */}
          {printOptions.includeMovimentacoes && movimentacoes.length > 0 && (
            <div className="mb-8 page-break-inside-avoid">
              <h4 className="font-bold mb-4 text-lg border-b border-gray-300 pb-2">
                Histórico de Movimentações
              </h4>
              <div className="space-y-2 text-sm">
                {movimentacoes.slice(0, 20).map((mov, index) => (
                  <div key={index} className="border-l-2 border-gray-300 pl-3">
                    <div className="font-medium">
                      {formatDate(mov.data_movimentacao)}
                    </div>
                    <div className="text-gray-700">
                      {mov.data?.resumo || mov.data?.texto || 'Movimentação processual'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publicações */}
          {printOptions.includePublicacoes && publicacoes.length > 0 && (
            <div className="mb-8 page-break-inside-avoid">
              <h4 className="font-bold mb-4 text-lg border-b border-gray-300 pb-2">
                Publicações
              </h4>
              <div className="space-y-2 text-sm">
                {publicacoes.slice(0, 20).map((pub, index) => (
                  <div key={index} className="border-l-2 border-blue-300 pl-3">
                    <div className="font-medium">
                      {formatDate(pub.data_publicacao)}
                    </div>
                    <div className="text-gray-700">
                      {pub.data?.resumo || pub.data?.texto || 'Publicação'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
            <p>Este documento foi gerado automaticamente pelo sistema de gestão processual</p>
            <p>Documento confidencial - uso interno do escritório</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .print-page {
              max-width: none;
              margin: 0;
              padding: 20mm;
              font-size: 12pt;
              line-height: 1.4;
            }

            .page-break-inside-avoid {
              break-inside: avoid;
            }

            /* Hide everything except print content */
            body > *:not(.print\\:block) {
              display: none !important;
            }

            .print\\:block {
              display: block !important;
            }
          }
        `
      }} />
    </>
  );
}
