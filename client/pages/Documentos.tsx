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
} from "lucide-react";
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
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { supabase, lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface Documento {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_path: string;
  content_type: string;
  status: "draft" | "active" | "archived";
  visibility: "public" | "private" | "restricted";
  category: string;
  tags: string[];
  description?: string;
  ocr_text?: string;
  ocr_status: "pending" | "processing" | "completed" | "failed";
  version: number;
  parent_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  processo_cnj?: string;
  cliente_cpfcnpj?: string;
  favorited: boolean;
  download_count: number;
  access_count: number;
}

const Documentos = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(
    null,
  );
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const {
    data: documentos = [],
    isLoading,
    refetch,
  } = useSupabaseQuery(
    "documentos-avancados",
    `
      SELECT 
        d.*,
        u.email as created_by_email,
        COUNT(DISTINCT dv.id) as version_count,
        COUNT(DISTINCT da.id) as access_count
      FROM legalflow.documentos d
      LEFT JOIN auth.users u ON u.id = d.created_by
      LEFT JOIN legalflow.documento_versions dv ON dv.document_id = d.id
      LEFT JOIN legalflow.documento_access da ON da.document_id = d.id
      WHERE d.status != 'deleted'
      GROUP BY d.id, u.email
      ORDER BY d.updated_at DESC
    `,
    [],
  );

  const { data: categorias = [] } = useSupabaseQuery(
    "documento-categorias",
    `
      SELECT 
        category as name,
        COUNT(*) as count
      FROM legalflow.documentos
      WHERE status != 'deleted'
      GROUP BY category
      ORDER BY count DESC
    `,
    [],
  );

  const { data: stats } = useSupabaseQuery(
    "documentos-stats",
    `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'draft') as drafts,
        COUNT(*) FILTER (WHERE status = 'archived') as archived,
        COUNT(*) FILTER (WHERE ocr_status = 'completed') as ocr_completed,
        SUM(file_size) as total_size,
        COUNT(*) FILTER (WHERE favorited = true) as favorited
      FROM legalflow.documentos
      WHERE status != 'deleted'
    `,
    [],
  );

  // Filtros
  const filteredDocumentos =
    documentos?.filter((doc) => {
      const matchesSearch =
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.ocr_text?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || doc.category === selectedCategory;
      const matchesStatus =
        selectedStatus === "all" || doc.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    }) || [];

  // Upload de arquivo
  const handleFileUpload = async (file: File, metadata: any) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload do arquivo para Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `documentos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          },
        });

      if (uploadError) throw uploadError;

      // 2. Criar registro no banco
      const { data: docData, error: docError } = await lf
        .from("documentos")
        .insert({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_path: filePath,
          content_type: file.type,
          status: metadata.status || "active",
          visibility: metadata.visibility || "private",
          category: metadata.category,
          description: metadata.description,
          tags: metadata.tags || [],
          processo_cnj: metadata.processo_cnj,
          cliente_cpfcnpj: metadata.cliente_cpfcnpj,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          version: 1,
          ocr_status:
            file.type.includes("pdf") || file.type.includes("image")
              ? "pending"
              : "completed",
        })
        .select()
        .single();

      if (docError) throw docError;

      // 3. Iniciar OCR se aplicável
      if (file.type.includes("pdf") || file.type.includes("image")) {
        await initiateOCR(docData.id, filePath);
      }

      toast({
        title: "Documento enviado com sucesso!",
        description: `${file.name} foi adicionado à biblioteca.`,
      });

      setIsUploadOpen(false);
      refetch();
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Iniciar OCR
  const initiateOCR = async (documentId: string, filePath: string) => {
    try {
      // Chamar função Edge para processar OCR
      const response = await fetch("/.netlify/functions/process-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, filePath }),
      });

      if (!response.ok) {
        throw new Error("Falha ao iniciar OCR");
      }

      // Atualizar status
      await lf
        .from("documentos")
        .update({ ocr_status: "processing" })
        .eq("id", documentId);
    } catch (error) {
      console.error("Erro ao iniciar OCR:", error);
      await lf
        .from("documentos")
        .update({ ocr_status: "failed" })
        .eq("id", documentId);
    }
  };

  // Favoritar documento
  const toggleFavorite = async (documentId: string, currentStatus: boolean) => {
    try {
      await lf
        .from("documentos")
        .update({ favorited: !currentStatus })
        .eq("id", documentId);

      refetch();
      toast({
        title: !currentStatus
          ? "Documento favoritado"
          : "Removido dos favoritos",
        description: "Documento atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o documento.",
        variant: "destructive",
      });
    }
  };

  // Download de documento
  const downloadDocument = async (documento: Documento) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(documento.file_path);

      if (error) throw error;

      // Criar link de download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = documento.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Incrementar contador de downloads
      await lf
        .from("documentos")
        .update({ download_count: documento.download_count + 1 })
        .eq("id", documento.id);

      refetch();
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o documento.",
        variant: "destructive",
      });
    }
  };

  // Criar nova versão
  const createNewVersion = async (originalDoc: Documento, file: File) => {
    try {
      const fileName = `${Date.now()}-v${originalDoc.version + 1}-${file.name}`;
      const filePath = `documentos/${fileName}`;

      // Upload da nova versão
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Criar nova versão
      const { error: versionError } = await lf.from("documentos").insert({
        ...originalDoc,
        id: undefined, // Novo ID será gerado
        file_name: file.name,
        file_size: file.size,
        file_path: filePath,
        parent_id: originalDoc.parent_id || originalDoc.id,
        version: originalDoc.version + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ocr_status:
          file.type.includes("pdf") || file.type.includes("image")
            ? "pending"
            : "completed",
      });

      if (versionError) throw versionError;

      toast({
        title: "Nova versão criada",
        description: `Versão ${originalDoc.version + 1} do documento foi criada.`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar nova versão.",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Ativo
          </Badge>
        );
      case "draft":
        return <Badge variant="outline">Rascunho</Badge>;
      case "archived":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Arquivado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOCRBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            OCR Concluído
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Processando
          </Badge>
        );
      case "pending":
        return <Badge variant="outline">OCR Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive">OCR Falhou</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📁 Gestão de Documentos
          </h1>
          <p className="text-gray-600 mt-1">
            Biblioteca avançada com versionamento, OCR e controle de acesso
          </p>
        </div>

        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ScanText className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Com OCR</p>
                <p className="text-2xl font-bold">
                  {stats?.ocr_completed || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Favoritos</p>
                <p className="text-2xl font-bold">{stats?.favorited || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Archive className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Armazenamento
                </p>
                <p className="text-2xl font-bold">
                  {stats?.total_size
                    ? formatFileSize(stats.total_size)
                    : "0 MB"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar documentos (nome, descrição, conteúdo OCR)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({filteredDocumentos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
          ) : filteredDocumentos.length > 0 ? (
            <div className="grid gap-4">
              {filteredDocumentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <FileText className="h-12 w-12 text-blue-600" />
                      {doc.favorited && (
                        <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{doc.file_name}</h3>
                        {getStatusBadge(doc.status)}
                        {getOCRBadge(doc.ocr_status)}
                        {doc.version > 1 && (
                          <Badge variant="outline">v{doc.version}</Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-1">
                        {doc.description || "Sem descrição"}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{doc.category}</span>
                        <span>{doc.download_count} downloads</span>
                        <span>Por {doc.created_by_email}</span>
                        <span>
                          {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(doc.id, doc.favorited)}
                    >
                      <Star
                        className={`h-4 w-4 ${doc.favorited ? "text-yellow-500 fill-current" : "text-gray-400"}`}
                      />
                    </Button>

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
                      onClick={() => {
                        // Implementar upload de nova versão
                        if (fileInputRef.current) {
                          fileInputRef.current.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) {
                              createNewVersion(doc, file);
                            }
                          };
                          fileInputRef.current.click();
                        }
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Nenhum documento encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "Tente ajustar os filtros de busca"
                  : "Faça upload do primeiro documento"}
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Documento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input oculto para upload de nova versão */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default Documentos;
