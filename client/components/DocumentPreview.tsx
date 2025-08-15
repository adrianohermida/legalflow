import React, { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  FileIcon,
  Eye,
  Maximize,
} from "lucide-react";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface DocumentPreviewProps {
  document: {
    id: string;
    title: string;
    file_name?: string;
    file_path?: string;
    file_type?: string;
    file_size?: number;
    pages_count?: number;
    status: string;
    document_type: string;
    tags: string[];
    created_at: string;
  };
  onClose: () => void;
}

export function DocumentPreview({ document, onClose }: DocumentPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { toast } = useToast();

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return FileIcon;
    if (fileType.startsWith("image/")) return Image;
    if (fileType === "application/pdf") return FileText;
    return FileIcon;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreviewUrl = async () => {
    if (!document.file_path) return null;

    try {
      // Gerar URL temporária do Supabase Storage
      const { data, error } = await lf.storage
        .from("documents")
        .createSignedUrl(document.file_path, 3600); // 1 hora

      if (error) {
        console.error("Erro ao gerar URL:", error);
        setPreviewError("Erro ao carregar documento");
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      setPreviewError("Erro ao carregar documento");
      return null;
    }
  };

  const handleDownload = async () => {
    if (!document.file_path) {
      toast({
        title: "Erro no download",
        description: "Arquivo não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await lf.storage
        .from("documents")
        .download(document.file_path);

      if (error) throw error;

      // Criar link de download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = document.file_name || "documento";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado",
      });
    } catch (error: any) {
      console.error("Erro no download:", error);
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    // Implementar compartilhamento
    toast({
      title: "Compartilhamento",
      description: "Recurso em desenvolvimento",
    });
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const nextPage = () => {
    if (document.pages_count && currentPage < document.pages_count) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const canShowPreview = () => {
    if (!document.file_type) return false;

    // Tipos suportados para preview
    const supportedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
    ];

    return supportedTypes.includes(document.file_type);
  };

  const PreviewContent = () => {
    if (previewError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-neutral-50">
          <div className="text-center">
            <FileIcon className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <p className="text-lg font-medium text-neutral-600 mb-2">
              Erro ao carregar preview
            </p>
            <p className="text-sm text-neutral-500">{previewError}</p>
            <Button variant="outline" onClick={handleDownload} className="mt-4">
              <Download className="w-4 h-4 mr-2" />
              Baixar arquivo
            </Button>
          </div>
        </div>
      );
    }

    if (!canShowPreview()) {
      const IconComponent = getFileIcon(document.file_type);

      return (
        <div className="flex-1 flex items-center justify-center bg-neutral-50">
          <div className="text-center">
            <IconComponent className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <p className="text-lg font-medium text-neutral-600 mb-2">
              Preview não disponível
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              Tipo de arquivo: {document.file_type}
            </p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Baixar para visualizar
            </Button>
          </div>
        </div>
      );
    }

    // Aqui seria implementado o preview real baseado no tipo de arquivo
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Eye className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <p className="text-lg font-medium text-neutral-600 mb-2">
            Preview do documento
          </p>
          <p className="text-sm text-neutral-500 mb-4">
            {document.file_type} - {formatFileSize(document.file_size)}
          </p>
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">
              Em desenvolvimento: Preview fluido para {document.file_type}
            </p>
            <Button onClick={handleDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Baixar arquivo
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(document.file_type)({
              className: "w-5 h-5 text-neutral-500",
            })}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{document.title}</h3>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{document.file_name}</span>
                {document.file_size && (
                  <span>• {formatFileSize(document.file_size)}</span>
                )}
                {document.pages_count && (
                  <span>• {document.pages_count} páginas</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={
                document.status === "aprovado"
                  ? "bg-green-100 text-green-700"
                  : document.status === "pendente"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }
            >
              {document.status}
            </Badge>
          </div>
        </div>

        {/* Toolbar de controles */}
        {canShowPreview() && (
          <div className="flex items-center justify-between p-2 border-b bg-neutral-50">
            <div className="flex items-center gap-2">
              {/* Controles de página */}
              {document.pages_count && document.pages_count > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-sm px-2">
                    {currentPage} de {document.pages_count}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage >= document.pages_count}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Controles de zoom */}
              <Button variant="ghost" size="sm" onClick={zoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>

              <span className="text-sm px-2 min-w-[60px] text-center">
                {zoom}%
              </span>

              <Button variant="ghost" size="sm" onClick={zoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={rotate}>
                <RotateCw className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Área de preview */}
        <div className="flex-1 overflow-hidden" style={{ height: "500px" }}>
          <PreviewContent />
        </div>

        {/* Footer com informações e ações */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>Tipo: {document.document_type}</span>
              <span>Criado: {formatDate(document.created_at)}</span>
              {document.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <span>Tags:</span>
                  {document.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {document.tags.length > 3 && (
                    <span>+{document.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>

              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>

              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
