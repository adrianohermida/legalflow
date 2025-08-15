import React, { useState, useEffect } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Gavel,
  Calendar,
  Building,
  User,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Grid,
  List,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";
import { DocumentViewerC6 } from "./DocumentViewerC6";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  numero_cnj?: string;
  metadata?: {
    numero_cnj?: string;
    document_type?: string;
    description?: string;
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
  tribunal?: string;
  vara_forum?: string;
  status?: string;
}

interface FlipbookItem {
  id: string;
  type: "document" | "peticao";
  title: string;
  subtitle?: string;
  date: string;
  cnj?: string;
  document?: Document;
  peticao?: Peticao;
  preview?: string;
}

interface FlipbookViewerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCNJ?: string;
}

export function FlipbookViewerC6({
  isOpen,
  onClose,
  initialCNJ,
}: FlipbookViewerProps) {
  const { toast } = useToast();

  // States
  const [cnj, setCNJ] = useState(initialCNJ || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<FlipbookItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [filterType, setFilterType] = useState<
    "all" | "documents" | "peticoes"
  >("all");

  const itemsPerPage = 12;

  // Queries
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["flipbook-documents", cnj],
    queryFn: async () => {
      if (!cnj) return [];

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .or(`numero_cnj.eq.${cnj},metadata->>numero_cnj.eq.${cnj}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!cnj,
  });

  const { data: peticoes = [], isLoading: loadingPeticoes } = useQuery({
    queryKey: ["flipbook-peticoes", cnj],
    queryFn: async () => {
      if (!cnj) return [];

      const { data, error } = await supabase
        .from("peticoes")
        .select("*")
        .eq("numero_cnj", cnj)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!cnj,
  });

  // Process items for flipbook display
  const flipbookItems: FlipbookItem[] = React.useMemo(() => {
    const items: FlipbookItem[] = [];

    // Add documents
    if (filterType === "all" || filterType === "documents") {
      documents.forEach((doc) => {
        items.push({
          id: `doc-${doc.id}`,
          type: "document",
          title: doc.file_name,
          subtitle:
            doc.metadata?.description || `${formatFileSize(doc.file_size)}`,
          date: doc.created_at,
          cnj: doc.numero_cnj || doc.metadata?.numero_cnj,
          document: doc,
        });
      });
    }

    // Add petitions
    if (filterType === "all" || filterType === "peticoes") {
      peticoes.forEach((peticao) => {
        items.push({
          id: `pet-${peticao.id}`,
          type: "peticao",
          title: peticao.tipo || "Petição",
          subtitle: peticao.tribunal || peticao.vara_forum,
          date: peticao.created_at,
          cnj: peticao.numero_cnj,
          peticao,
        });
      });
    }

    // Filter by search term
    let filtered = items;
    if (searchTerm) {
      filtered = items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "name":
          comparison = a.title.localeCompare(b.title);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [documents, peticoes, searchTerm, sortBy, sortOrder, filterType]);

  // Pagination
  const totalPages = Math.ceil(flipbookItems.length / itemsPerPage);
  const currentItems = flipbookItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [cnj, searchTerm, sortBy, sortOrder, filterType]);

  // Handlers
  const handleItemClick = (item: FlipbookItem) => {
    setSelectedItem(item);
    if (item.type === "document") {
      setIsViewerOpen(true);
    } else {
      // Handle petition view
      viewPeticaoContent(item.peticao!);
    }
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

  const viewPeticaoContent = (peticao: Peticao) => {
    // Create a temporary window to display petition content
    const newWindow = window.open("", "_blank", "width=800,height=600");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${peticao.tipo || "Petição"}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .content { white-space: pre-wrap; }
            .metadata { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${peticao.tipo || "Petição"}</h1>
            ${peticao.numero_cnj ? `<p>Processo: ${peticao.numero_cnj}</p>` : ""}
            ${peticao.tribunal ? `<p>Tribunal: ${peticao.tribunal}</p>` : ""}
          </div>
          <div class="content">${peticao.conteudo || ""}</div>
          <div class="metadata">
            <p>Criado em: ${formatDate(peticao.created_at)}</p>
            ${peticao.vara_forum ? `<p>Vara/Fórum: ${peticao.vara_forum}</p>` : ""}
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getItemIcon = (item: FlipbookItem) => {
    if (item.type === "document") {
      const ext = item.title.split(".").pop()?.toLowerCase();
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
    } else {
      return <Gavel className="h-8 w-8 text-purple-600" />;
    }
  };

  const isLoading = loadingDocs || loadingPeticoes;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Flipbook - Documentos por CNJ
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite o número CNJ do processo"
                    value={cnj}
                    onChange={(e) => setCNJ(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (!cnj) {
                        toast({
                          title: "CNJ requerido",
                          description:
                            "Digite um número CNJ para buscar documentos.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Buscar nos documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="documents">Documentos</SelectItem>
                    <SelectItem value="peticoes">Peças</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="type">Tipo</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  {sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setViewMode(viewMode === "grid" ? "list" : "grid")
                  }
                >
                  {viewMode === "grid" ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <Grid className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Content */}
            {!cnj ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Flipbook de Documentos
                </h3>
                <p className="text-gray-500">
                  Digite um número CNJ para visualizar todos os documentos e
                  peças do processo
                </p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-32 rounded-lg mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : flipbookItems.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Nenhum documento encontrado
                </h3>
                <p className="text-gray-500">
                  Não há documentos ou peças para o CNJ: {cnj}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentItems.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleItemClick(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="flex items-center justify-center w-16 h-16 bg-gray-50 rounded-lg">
                          {getItemIcon(item)}
                        </div>
                        <h4
                          className="font-medium text-sm truncate w-full"
                          title={item.title}
                        >
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-500 truncate w-full">
                          {item.subtitle}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type === "document" ? "Doc" : "Peça"}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatDate(item.date)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center space-x-3">
                      {getItemIcon(item)}
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-gray-500">{item.subtitle}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <Badge variant="outline" className="text-xs">
                            {item.type === "document" ? "Documento" : "Peça"}
                          </Badge>
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.document && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadDocument(item.document!);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {currentPage * itemsPerPage + 1} a{" "}
                  {Math.min(
                    (currentPage + 1) * itemsPerPage,
                    flipbookItems.length,
                  )}{" "}
                  de {flipbookItems.length} itens
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 py-2 px-3">
                    Página {currentPage + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                    }
                    disabled={currentPage === totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      {selectedItem?.document && (
        <DocumentViewerC6
          document={selectedItem.document}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedItem(null);
          }}
          documents={documents}
        />
      )}
    </>
  );
}
