import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  BookOpen,
  FileText,
  Upload,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Tag,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { EstanteDigital } from "./EstanteDigital";
import { DocumentUploader } from "./DocumentUploader";

interface ProcessDocumentsListProps {
  numero_cnj: string;
  cliente_cpfcnpj?: string;
  showUploadButton?: boolean;
  maxItems?: number;
}

interface Document {
  id: string;
  title: string;
  description?: string;
  document_type: string;
  status: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  tags: string[];
  version: number;
  pages_count?: number;
  created_at: string;
  approved_at?: string;
}

const STATUS_CONFIG = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  reprovado: { label: "Reprovado", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  em_revisao: { label: "Em Revisão", color: "bg-blue-100 text-blue-700", icon: Eye },
  arquivado: { label: "Arquivado", color: "bg-gray-100 text-gray-700", icon: FileText },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

export function ProcessDocumentsList({ 
  numero_cnj, 
  cliente_cpfcnpj,
  showUploadButton = true,
  maxItems = 5
}: ProcessDocumentsListProps) {
  const [showEstante, setShowEstante] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // Query para documentos recentes do processo
  const { data: recentDocuments, isLoading } = useQuery({
    queryKey: ["sf8-process-documents", numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf.rpc("sf8_list_documents", {
        p_numero_cnj: numero_cnj,
        p_limit: maxItems + 2, // Buscar um pouco mais para mostrar se há mais
      });
      if (error) throw error;
      return data as Document[];
    },
    staleTime: 30 * 1000,
  });

  // Query para estatísticas do processo
  const { data: stats } = useQuery({
    queryKey: ["sf8-process-stats", numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf.rpc("sf8_get_statistics", {
        p_numero_cnj: numero_cnj,
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDocumentIcon = (fileType?: string) => {
    if (!fileType) return FileText;
    if (fileType.startsWith("image/")) return Eye;
    if (fileType === "application/pdf") return FileText;
    return FileText;
  };

  const DocumentItem = ({ document, isCompact = false }: { 
    document: Document; 
    isCompact?: boolean;
  }) => {
    const statusConfig = STATUS_CONFIG[document.status as keyof typeof STATUS_CONFIG];
    const IconComponent = getDocumentIcon(document.file_type);

    if (isCompact) {
      return (
        <div className="flex items-center gap-3 py-2 hover:bg-neutral-50 rounded">
          <IconComponent className="w-4 h-4 text-neutral-500" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{document.title}</span>
              {document.version > 1 && (
                <Badge variant="outline" className="text-xs">v{document.version}</Badge>
              )}
            </div>
            
            <div className="text-xs text-neutral-500">
              {formatDate(document.created_at)}
              {document.file_size && ` • ${formatFileSize(document.file_size)}`}
            </div>
          </div>
          
          <Badge className={`${statusConfig.color} text-xs`}>
            {statusConfig.label}
          </Badge>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-3 p-3 border rounded-lg hover:shadow-sm transition-shadow">
        <IconComponent className="w-5 h-5 text-neutral-500 mt-1" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{document.title}</h4>
            {document.version > 1 && (
              <Badge variant="outline" className="text-xs">v{document.version}</Badge>
            )}
          </div>
          
          {document.description && (
            <p className="text-xs text-neutral-600 mb-2 line-clamp-2">
              {document.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(document.created_at)}
            </span>
            
            {document.file_size && (
              <span>{formatFileSize(document.file_size)}</span>
            )}
            
            {document.pages_count && (
              <span>{document.pages_count} pág.</span>
            )}
          </div>
          
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {document.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Tag className="w-2 h-2 mr-1" />
                  {tag}
                </Badge>
              ))}
              {document.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{document.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge className={statusConfig.color}>
            <statusConfig.icon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Documentos do Processo
              {stats && (
                <Badge variant="secondary">
                  {stats.total_documents || 0}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {showUploadButton && (
                <Button size="sm" onClick={() => setShowUploader(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              )}
              
              <Dialog open={showEstante} onOpenChange={setShowEstante}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Abrir Estante
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-7xl max-h-[90vh] p-0">
                  <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Estante Digital - {numero_cnj}</DialogTitle>
                    <DialogDescription>
                      Biblioteca completa de documentos, peças e flipbook do processo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-6 pt-0 max-h-[80vh] overflow-y-auto">
                    <EstanteDigital 
                      numero_cnj={numero_cnj}
                      cliente_cpfcnpj={cliente_cpfcnpj}
                      mode="full"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Estatísticas rápidas */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-neutral-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {Object.values(stats.by_status || {}).reduce((a: any, b: any) => 
                    (typeof a === 'number' && typeof b === 'number') ? a + b : 0, 0
                  )}
                </div>
                <div className="text-xs text-neutral-600">Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {stats.total_peticoes || 0}
                </div>
                <div className="text-xs text-neutral-600">Peças</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {formatFileSize(stats.storage_usage || 0)}
                </div>
                <div className="text-xs text-neutral-600">Tamanho</div>
              </div>
            </div>
          )}
          
          {/* Lista de documentos */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4 text-neutral-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p>Carregando documentos...</p>
              </div>
            ) : recentDocuments?.length ? (
              <>
                {recentDocuments.slice(0, maxItems).map((doc) => (
                  <DocumentItem key={doc.id} document={doc} />
                ))}
                
                {recentDocuments.length > maxItems && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowEstante(true)}
                    >
                      Ver mais {recentDocuments.length - maxItems} documento(s)
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-neutral-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p className="font-medium">Nenhum documento encontrado</p>
                <p className="text-sm">Faça upload do primeiro documento</p>
                {showUploadButton && (
                  <Button 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setShowUploader(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Documento
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          {recentDocuments && recentDocuments.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-xs text-neutral-500">
                Atualizado {recentDocuments[0] ? formatDate(recentDocuments[0].created_at) : "—"}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEstante(true)}
                  className="text-xs"
                >
                  Ver todos
                </Button>
                
                {stats?.pending_approvals > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.pending_approvals} pendente(s)
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de upload */}
      {showUploader && (
        <DocumentUploader
          numero_cnj={numero_cnj}
          cliente_cpfcnpj={cliente_cpfcnpj}
          onClose={() => setShowUploader(false)}
          onSuccess={() => {
            setShowUploader(false);
            // Invalidar queries para atualizar a lista
          }}
        />
      )}
    </>
  );
}
