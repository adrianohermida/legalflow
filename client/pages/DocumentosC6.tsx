import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Edit2,
  Trash2,
  Search,
  Filter,
  Plus,
  FolderOpen,
  History,
  ScanText,
  Share,
  Lock,
  Unlock,
  Star,
  Copy,
  RotateCcw,
  Archive,
  BookOpen,
  Gavel,
  ExternalLink,
  Calendar,
  User,
  Building,
} from "lucide-react";
import { DocumentoUploaderC6 } from "../components/DocumentoUploaderC6";
import { DocumentViewerC6 } from "../components/DocumentViewerC6";
import { PecasAIManager } from "../components/PecasAIManager";
import { FlipbookViewerC6 } from "../components/FlipbookViewerC6";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  numero_cnj?: string;
  metadata?: {
    numero_cnj?: string;
    [key: string]: any;
  };
  created_at: string;
}

interface Peticao {
  id: string;
  numero_cnj?: string;
  tipo?: string;
  conteudo?: string;
  created_at: string;
}

interface DocumentUploadForm {
  title: string;
  description: string;
  numero_cnj?: string;
  document_type: string;
  tags: string[];
}

const DocumentosC6 = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("biblioteca");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFlipbookOpen, setIsFlipbookOpen] = useState(false);
  const [flipbookCNJ, setFlipbookCNJ] = useState("");
  const [uploadForm, setUploadForm] = useState<DocumentUploadForm>({
    title: "",
    description: "",
    numero_cnj: "",
    document_type: "outros",
    tags: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["documents-biblioteca", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`file_name.ilike.%${searchTerm}%,metadata->>numero_cnj.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: peticoes = [], isLoading: loadingPeticoes } = useQuery({
    queryKey: ["peticoes", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("peticoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`tipo.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%,conteudo.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: processoDocuments = [], isLoading: loadingProcessoDocs } = useQuery({
    queryKey: ["processo-documents", flipbookCNJ],
    queryFn: async () => {
      if (!flipbookCNJ) return [];
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .or(`numero_cnj.eq.${flipbookCNJ},metadata->>numero_cnj.eq.${flipbookCNJ}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!flipbookCNJ,
  });

  const { data: processoPeticoes = [] } = useQuery({
    queryKey: ["processo-peticoes", flipbookCNJ],
    queryFn: async () => {
      if (!flipbookCNJ) return [];
      
      const { data, error } = await supabase
        .from("peticoes")
        .select("*")
        .eq("numero_cnj", flipbookCNJ)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!flipbookCNJ,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async ({ file, form }: { file: File; form: DocumentUploadForm }) => {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `documents/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const metadata = {
        numero_cnj: form.numero_cnj || null,
        document_type: form.document_type,
        tags: form.tags,
        description: form.description,
      };

      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          file_name: form.title || file.name,
          file_path: filePath,
          file_size: file.size,
          numero_cnj: form.numero_cnj || null,
          metadata,
        })
        .select()
        .single();

      if (docError) throw docError;
      return docData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-biblioteca"] });
      setIsUploadOpen(false);
      setUploadForm({
        title: "",
        description: "",
        numero_cnj: "",
        document_type: "outros",
        tags: [],
      });
      toast({
        title: "Documento enviado com sucesso!",
        description: "O documento foi adicionado à biblioteca.",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o documento.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-biblioteca"] });
      toast({
        title: "Documento excluído",
        description: "O documento foi removido da biblioteca.",
      });
    },
  });

  // Handlers
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    uploadMutation.mutate({ file, form: uploadForm });
    setIsUploading(false);
  };

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o documento.",
        variant: "destructive",
      });
    }
  };

  const viewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      toast({
        title: "Erro ao visualizar",
        description: "Não foi possível abrir o documento.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-600" />;
      case "doc":
      case "docx":
        return <FileText className="h-8 w-8 text-blue-600" />;
      case "jpg":
      case "jpeg":
      case "png":
        return <FileText className="h-8 w-8 text-green-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📁 Documentos & Peças
          </h1>
          <p className="text-gray-600 mt-1">
            Entregáveis centralizados - Biblioteca, Peças IA e Flipbook por CNJ
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFlipbookOpen(true)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Flipbook CNJ
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar documentos, peças ou CNJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="biblioteca">
            <FolderOpen className="mr-2 h-4 w-4" />
            Biblioteca ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="pecas">
            <Gavel className="mr-2 h-4 w-4" />
            Peças IA ({peticoes.length})
          </TabsTrigger>
        </TabsList>

        {/* Biblioteca Tab */}
        <TabsContent value="biblioteca">
          <Card>
            <CardHeader>
              <CardTitle>Biblioteca - Uploads Livres</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="grid gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <div className="h-12 w-12 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents.length > 0 ? (
                <div className="grid gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        {getDocumentIcon(doc.file_name)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{doc.file_name}</h3>
                            {(doc.numero_cnj || doc.metadata?.numero_cnj) && (
                              <Badge variant="outline">
                                {doc.numero_cnj || doc.metadata?.numero_cnj}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>{formatDate(doc.created_at)}</span>
                            {doc.metadata?.document_type && (
                              <span className="capitalize">{doc.metadata.document_type}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsViewerOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Nenhum documento na biblioteca
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Faça upload do primeiro documento
                  </p>
                  <Button onClick={() => setIsUploadOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Documento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peças Tab */}
        <TabsContent value="pecas">
          <PecasAIManager searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>

      {/* Enhanced Upload Component */}
      <DocumentoUploaderC6
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          // Refresh documents
          queryClient.invalidateQueries({ queryKey: ["documents-biblioteca"] });
        }}
      />

      {/* Enhanced Document Viewer */}
      <DocumentViewerC6
        document={selectedDocument}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setSelectedDocument(null);
        }}
        documents={documents}
      />

      {/* Flipbook Viewer */}
      <FlipbookViewerC6
        isOpen={isFlipbookOpen}
        onClose={() => setIsFlipbookOpen(false)}
      />
    </div>
  );
};

export default DocumentosC6;
