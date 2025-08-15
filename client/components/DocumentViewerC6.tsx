import React, { useState, useEffect } from "react";
import {
  Download,
  Eye,
  ExternalLink,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Share,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";

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

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  documents?: Document[];
}

export function DocumentViewerC6({
  document,
  isOpen,
  onClose,
  documents = [],
}: DocumentViewerProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const currentDocument = documents.length > 0 ? documents[currentIndex] : document;

  useEffect(() => {
    if (document && documents.length > 0) {
      const index = documents.findIndex(d => d.id === document.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [document, documents]);

  useEffect(() => {
    if (currentDocument && isOpen) {
      loadDocumentUrl(currentDocument);
    }
  }, [currentDocument, isOpen]);

  const loadDocumentUrl = async (doc: Document) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_path, 3600); // 1 hour

      if (error) throw error;
      setSignedUrl(data.signedUrl);
    } catch (error) {
      console.error("Error loading document:", error);
      toast({
        title: "Erro ao carregar documento",
        description: "Não foi possível abrir o documento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído",
        description: `${doc.file_name} foi baixado.`,
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o documento.",
        variant: "destructive",
      });
    }
  };

  const shareDocument = async (doc: Document) => {
    if (navigator.share && signedUrl) {
      try {
        await navigator.share({
          title: doc.file_name,
          text: `Documento: ${doc.file_name}`,
          url: signedUrl,
        });
      } catch (error) {
        // Fallback to copy URL
        copyToClipboard(signedUrl);
      }
    } else if (signedUrl) {
      copyToClipboard(signedUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copiado",
        description: "O link do documento foi copiado para a área de transferência.",
      });
    });
  };

  const printDocument = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  const navigateDocument = (direction: "prev" | "next") => {
    if (documents.length === 0) return;

    let newIndex = currentIndex;
    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : documents.length - 1;
    } else {
      newIndex = currentIndex < documents.length - 1 ? currentIndex + 1 : 0;
    }
    setCurrentIndex(newIndex);
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.max(25, Math.min(200, prev + delta)));
  };

  const rotateDocument = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="h-6 w-6 text-red-600" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon className="h-6 w-6 text-green-600" />;
      case "doc":
      case "docx":
        return <FileText className="h-6 w-6 text-blue-600" />;
      default:
        return <File className="h-6 w-6 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImage = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
  };

  const isPDF = (fileName: string) => {
    return fileName.toLowerCase().endsWith(".pdf");
  };

  if (!currentDocument) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-3">
            {getFileIcon(currentDocument.file_name)}
            <div>
              <DialogTitle className="text-lg">{currentDocument.file_name}</DialogTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{formatFileSize(currentDocument.file_size)}</span>
                {(currentDocument.numero_cnj || currentDocument.metadata?.numero_cnj) && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {currentDocument.numero_cnj || currentDocument.metadata?.numero_cnj}
                    </Badge>
                  </>
                )}
                {currentDocument.metadata?.document_type && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{currentDocument.metadata.document_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Navigation Controls */}
            {documents.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDocument("prev")}
                  disabled={documents.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 px-2">
                  {currentIndex + 1} de {documents.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDocument("next")}
                  disabled={documents.length <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}

            {/* Zoom Controls */}
            {(isImage(currentDocument.file_name) || isPDF(currentDocument.file_name)) && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => adjustZoom(-25)}
                  disabled={zoom <= 25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 px-2">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => adjustZoom(25)}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rotateDocument}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}

            {/* Action Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadDocument(currentDocument)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareDocument(currentDocument)}
            >
              <Share className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={printDocument}
            >
              <Printer className="h-4 w-4" />
            </Button>
            {signedUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(signedUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Document Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando documento...</span>
            </div>
          ) : signedUrl ? (
            <div className="h-full overflow-auto">
              {isImage(currentDocument.file_name) ? (
                <div className="flex justify-center p-4">
                  <img
                    src={signedUrl}
                    alt={currentDocument.file_name}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease",
                    }}
                    className="max-w-none"
                  />
                </div>
              ) : isPDF(currentDocument.file_name) ? (
                <iframe
                  src={`${signedUrl}#zoom=${zoom}`}
                  className="w-full h-full border-0"
                  style={{ 
                    minHeight: "70vh",
                    transform: `rotate(${rotation}deg)`,
                  }}
                  title={currentDocument.file_name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  {getFileIcon(currentDocument.file_name)}
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900">
                      Visualização não disponível
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Este tipo de arquivo não pode ser visualizado no navegador
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => downloadDocument(currentDocument)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar para visualizar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">
                  Erro ao carregar documento
                </h3>
                <p className="text-gray-600">
                  Não foi possível carregar o documento para visualização
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Document Info */}
        {currentDocument.metadata?.description && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
            <p className="text-gray-600 text-sm">
              {currentDocument.metadata.description}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
