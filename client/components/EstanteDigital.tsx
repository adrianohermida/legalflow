import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  BookOpen,
  FileText,
  Eye,
  Search,
  Filter,
  Upload,
  Download,
  Share2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  Calendar,
  FileIcon,
  Image,
  PaperclipIcon,
  FolderOpen,
  Trash2,
  Edit,
  Star,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { DocumentPreview } from "./DocumentPreview";
import { DocumentUploader } from "./DocumentUploader";

interface EstanteDigitalProps {
  numero_cnj?: string;
  cliente_cpfcnpj?: string;
  mode?: "full" | "embedded"; // full = página completa, embedded = widget no processo
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
  numero_cnj?: string;
  cliente_cpfcnpj?: string;
  tags: string[];
  categories: string[];
  version: number;
  is_latest_version: boolean;
  pages_count?: number;
  created_by: string;
  created_at: string;
  approved_at?: string;
}

interface Peticao {
  id: string;
  document_id: string;
  numero_cnj: string;
  numero_protocolo?: string;
  tipo_peca: string;
  instancia?: string;
  tribunal?: string;
  vara_forum?: string;
  data_protocolo?: string;
  data_juntada?: string;
  prazo_resposta?: string;
  situacao: string;
  document_title: string;
  document_status: string;
  file_name?: string;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: "petição", label: "Petição", icon: FileText },
  { value: "contrato", label: "Contrato", icon: PaperclipIcon },
  { value: "procuração", label: "Procuração", icon: FileIcon },
  { value: "documento_pessoal", label: "Documento Pessoal", icon: FileIcon },
  { value: "comprovante", label: "Comprovante", icon: FileIcon },
  { value: "laudo", label: "Laudo", icon: FileText },
  { value: "parecer", label: "Parecer", icon: FileText },
  { value: "sentença", label: "Sentença", icon: FileText },
  { value: "despacho", label: "Despacho", icon: FileText },
  { value: "ofício", label: "Ofício", icon: FileText },
  { value: "ata", label: "Ata", icon: FileText },
  { value: "protocolo", label: "Protocolo", icon: FileText },
  { value: "outros", label: "Outros", icon: FileIcon },
];

const STATUS_CONFIG = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  reprovado: { label: "Reprovado", color: "bg-red-100 text-red-700", icon: XCircle },
  em_revisao: { label: "Em Revisão", color: "bg-blue-100 text-blue-700", icon: Eye },
  arquivado: { label: "Arquivado", color: "bg-gray-100 text-gray-700", icon: FolderOpen },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

export function EstanteDigital({ 
  numero_cnj, 
  cliente_cpfcnpj, 
  mode = "full" 
}: EstanteDigitalProps) {
  const [activeTab, setActiveTab] = useState("biblioteca");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showUploader, setShowUploader] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para listar documentos
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ["sf8-documents", numero_cnj, cliente_cpfcnpj, selectedType, selectedStatus, searchQuery],
    queryFn: async () => {
      const { data, error } = await lf.rpc("sf8_list_documents", {
        p_numero_cnj: numero_cnj || null,
        p_cliente_cpfcnpj: cliente_cpfcnpj || null,
        p_document_type: selectedType || null,
        p_status: selectedStatus || null,
        p_search_query: searchQuery || null,
        p_limit: mode === "embedded" ? 10 : 50,
      });
      if (error) throw error;
      return data as Document[];
    },
    staleTime: 30 * 1000,
  });

  // Query para listar peças
  const { data: peticoes, isLoading: loadingPeticoes } = useQuery({
    queryKey: ["sf8-peticoes", numero_cnj],
    queryFn: async () => {
      if (!numero_cnj) return [];
      const { data, error } = await lf.rpc("sf8_list_peticoes", {
        p_numero_cnj: numero_cnj,
        p_limit: mode === "embedded" ? 10 : 50,
      });
      if (error) throw error;
      return data as Peticao[];
    },
    enabled: !!numero_cnj,
    staleTime: 30 * 1000,
  });

  // Query para estatísticas
  const { data: stats } = useQuery({
    queryKey: ["sf8-statistics", numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf.rpc("sf8_get_statistics", {
        p_numero_cnj: numero_cnj || null,
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  // Mutation para aprovar/reprovar documento
  const approveMutation = useMutation({
    mutationFn: async ({ documentId, approved, notes }: {
      documentId: string;
      approved: boolean;
      notes?: string;
    }) => {
      const { data, error } = await lf.rpc("sf8_approve_document", {
        p_document_id: documentId,
        p_approved: approved,
        p_notes: notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["sf8-documents"] });
      queryClient.invalidateQueries({ queryKey: ["sf8-statistics"] });
      toast({
        title: approved ? "Documento Aprovado" : "Documento Reprovado",
        description: approved ? "Documento aprovado com sucesso" : "Documento reprovado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Aprovação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDocumentIcon = (fileType?: string) => {
    if (!fileType) return FileIcon;
    if (fileType.startsWith("image/")) return Image;
    if (fileType === "application/pdf") return FileText;
    return FileIcon;
  };

  const handlePreviewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowPreview(true);
  };

  const handleApproveDocument = (documentId: string, approved: boolean, notes?: string) => {
    approveMutation.mutate({ documentId, approved, notes });
  };

  // Componente para item de documento
  const DocumentItem = ({ document }: { document: Document }) => {
    const statusConfig = STATUS_CONFIG[document.status as keyof typeof STATUS_CONFIG];
    const IconComponent = getDocumentIcon(document.file_type);
    const typeConfig = DOCUMENT_TYPES.find(t => t.value === document.document_type);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                <IconComponent className="w-5 h-5 text-neutral-500" />
              </div>
              
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
                
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {typeConfig?.label || document.document_type}
                  </span>
                  
                  {document.file_size && (
                    <span>{formatFileSize(document.file_size)}</span>
                  )}
                  
                  {document.pages_count && (
                    <span>{document.pages_count} páginas</span>
                  )}
                  
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(document.created_at)}
                  </span>
                </div>
                
                {document.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {document.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {document.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{document.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-3">
              <Badge className={statusConfig.color}>
                <statusConfig.icon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePreviewDocument(document)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </DropdownMenuItem>
                  
                  {document.file_name && (
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </DropdownMenuItem>
                  
                  {document.status === "pendente" && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => handleApproveDocument(document.id, true)}
                        className="text-green-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={() => handleApproveDocument(document.id, false)}
                        className="text-red-600"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reprovar
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente para item de peça
  const PeticaoItem = ({ peticao }: { peticao: Peticao }) => {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <FileText className="w-5 h-5 text-blue-600 mt-1" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{peticao.document_title}</h4>
                  <Badge variant="outline" className="text-xs">{peticao.tipo_peca}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-neutral-600 mb-2">
                  {peticao.numero_protocolo && (
                    <div>
                      <span className="font-medium">Protocolo:</span> {peticao.numero_protocolo}
                    </div>
                  )}
                  
                  {peticao.tribunal && (
                    <div>
                      <span className="font-medium">Tribunal:</span> {peticao.tribunal}
                    </div>
                  )}
                  
                  {peticao.data_protocolo && (
                    <div>
                      <span className="font-medium">Protocolado:</span> {formatDate(peticao.data_protocolo)}
                    </div>
                  )}
                  
                  {peticao.prazo_resposta && (
                    <div>
                      <span className="font-medium">Prazo:</span> {formatDate(peticao.prazo_resposta)}
                    </div>
                  )}
                </div>
                
                <Badge 
                  className={
                    peticao.situacao === "protocolada" ? "bg-blue-100 text-blue-700" :
                    peticao.situacao === "juntada" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }
                >
                  {peticao.situacao}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Dados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Header com estatísticas
  const StatsHeader = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats?.total_documents || 0}</p>
              <p className="text-sm text-neutral-600">Documentos</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats?.total_peticoes || 0}</p>
              <p className="text-sm text-neutral-600">Peças</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{stats?.pending_approvals || 0}</p>
              <p className="text-sm text-neutral-600">Pendentes</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{formatFileSize(stats?.storage_usage)}</p>
              <p className="text-sm text-neutral-600">Armazenado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (mode === "embedded") {
    // Versão simplificada para embedding no processo
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Documentos Recentes
            </div>
            <Button size="sm" onClick={() => setShowUploader(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loadingDocs ? (
              <div className="text-center py-4 text-neutral-500">
                Carregando documentos...
              </div>
            ) : documents?.length ? (
              documents.slice(0, 5).map((doc) => (
                <DocumentItem key={doc.id} document={doc} />
              ))
            ) : (
              <div className="text-center py-4 text-neutral-500">
                Nenhum documento encontrado
              </div>
            )}
            
            {documents && documents.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  Ver todos os documentos
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        
        {showUploader && (
          <DocumentUploader
            numero_cnj={numero_cnj}
            cliente_cpfcnpj={cliente_cpfcnpj}
            onClose={() => setShowUploader(false)}
            onSuccess={() => {
              setShowUploader(false);
              queryClient.invalidateQueries({ queryKey: ["sf8-documents"] });
            }}
          />
        )}
      </Card>
    );
  }

  // Versão completa da Estante Digital
  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <StatsHeader />
      
      {/* Controles e filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={() => setShowUploader(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="biblioteca">
            <BookOpen className="w-4 h-4 mr-2" />
            Biblioteca
          </TabsTrigger>
          <TabsTrigger value="pecas">
            <FileText className="w-4 h-4 mr-2" />
            Peças
          </TabsTrigger>
          <TabsTrigger value="flipbook">
            <Eye className="w-4 h-4 mr-2" />
            Flipbook
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="biblioteca" className="space-y-4">
          {loadingDocs ? (
            <div className="text-center py-8 text-neutral-500">
              Carregando documentos...
            </div>
          ) : documents?.length ? (
            <div className="space-y-4">
              {documents.map((doc) => (
                <DocumentItem key={doc.id} document={doc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p>Nenhum documento encontrado</p>
              <p className="text-sm">Faça upload do primeiro documento</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pecas" className="space-y-4">
          {loadingPeticoes ? (
            <div className="text-center py-8 text-neutral-500">
              Carregando peças...
            </div>
          ) : peticoes?.length ? (
            <div className="space-y-4">
              {peticoes.map((peticao) => (
                <PeticaoItem key={peticao.id} peticao={peticao} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p>Nenhuma peça encontrada</p>
              <p className="text-sm">Cadastre a primeira peça processual</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="flipbook" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Eye className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium mb-2">Flipbook Preview</h3>
              <p className="text-neutral-600 mb-4">
                Visualização em flipbook dos documentos do processo
              </p>
              <p className="text-sm text-neutral-500">
                Em desenvolvimento - Preview fluido de documentos
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modais */}
      {showUploader && (
        <DocumentUploader
          numero_cnj={numero_cnj}
          cliente_cpfcnpj={cliente_cpfcnpj}
          onClose={() => setShowUploader(false)}
          onSuccess={() => {
            setShowUploader(false);
            queryClient.invalidateQueries({ queryKey: ["sf8-documents"] });
            queryClient.invalidateQueries({ queryKey: ["sf8-statistics"] });
          }}
        />
      )}
      
      {showPreview && selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
