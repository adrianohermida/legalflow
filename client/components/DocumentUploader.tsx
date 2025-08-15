import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import {
  Upload,
  X,
  FileIcon,
  Image,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface DocumentUploaderProps {
  numero_cnj?: string;
  cliente_cpfcnpj?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  documentId?: string;
}

const DOCUMENT_TYPES = [
  { value: "petição", label: "Petição" },
  { value: "contrato", label: "Contrato" },
  { value: "procuração", label: "Procuração" },
  { value: "documento_pessoal", label: "Documento Pessoal" },
  { value: "comprovante", label: "Comprovante" },
  { value: "laudo", label: "Laudo" },
  { value: "parecer", label: "Parecer" },
  { value: "sentença", label: "Sentença" },
  { value: "despacho", label: "Despacho" },
  { value: "ofício", label: "Ofício" },
  { value: "ata", label: "Ata" },
  { value: "protocolo", label: "Protocolo" },
  { value: "outros", label: "Outros" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

export function DocumentUploader({ 
  numero_cnj, 
  cliente_cpfcnpj, 
  onClose, 
  onSuccess 
}: DocumentUploaderProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Mutation para preparar upload
  const prepareUploadMutation = useMutation({
    mutationFn: async (params: {
      numero_cnj: string;
      filename: string;
      title: string;
      document_type: string;
    }) => {
      const { data, error } = await lf.rpc("sf8_prepare_document_upload", {
        p_numero_cnj: params.numero_cnj,
        p_filename: params.filename,
        p_title: params.title,
        p_document_type: params.document_type,
        p_bucket: "documents",
      });
      if (error) throw error;
      return data;
    },
  });

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return Image;
    if (file.type === "application/pdf") return FileText;
    return FileIcon;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande. Máximo ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Tipo de arquivo não permitido";
    }
    
    return null;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const newFiles: FileUpload[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);
      
      newFiles.push({
        file,
        progress: 0,
        status: error ? "error" : "pending",
        error: error || undefined,
      });
    }
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileUpload: FileUpload, index: number) => {
    try {
      // Atualizar status para uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: "uploading", progress: 0 } : f
      ));

      // Preparar upload
      const uploadData = await prepareUploadMutation.mutateAsync({
        numero_cnj: numero_cnj || "",
        filename: fileUpload.file.name,
        title: title || fileUpload.file.name,
        document_type: documentType || "outros",
      });

      // Simular progresso (implementar upload real aqui)
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, progress } : f
        ));
      }

      // Upload para o Supabase Storage
      const { error: uploadError } = await lf.storage
        .from("documents")
        .upload(uploadData.file_path, fileUpload.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Atualizar documento com informações do arquivo
      const { error: updateError } = await lf
        .from("documents")
        .update({
          file_size: fileUpload.file.size,
          file_type: fileUpload.file.type,
          status: "aprovado", // Auto-aprovar por enquanto
          description: description || null,
          tags: tags ? tags.split(",").map(tag => tag.trim()) : [],
        })
        .eq("id", uploadData.document_id);

      if (updateError) throw updateError;

      // Marcar como sucesso
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: "success", 
          progress: 100,
          documentId: uploadData.document_id 
        } : f
      ));

    } catch (error: any) {
      console.error("Erro no upload:", error);
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: "error", 
          error: error.message || "Erro no upload"
        } : f
      ));
    }
  };

  const handleUploadAll = async () => {
    if (!documentType) {
      toast({
        title: "Tipo de documento obrigatório",
        description: "Selecione o tipo de documento antes de fazer upload",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(f => f.status === "pending");
    
    // Upload todos os arquivos em paralelo
    const uploadPromises = validFiles.map((fileUpload, originalIndex) => {
      const fileIndex = files.findIndex(f => f === fileUpload);
      return uploadFile(fileUpload, fileIndex);
    });

    await Promise.all(uploadPromises);

    // Verificar se todos os uploads foram bem-sucedidos
    const hasErrors = files.some(f => f.status === "error");
    
    if (!hasErrors) {
      toast({
        title: "Upload concluído",
        description: `${validFiles.length} arquivo(s) enviado(s) com sucesso`,
      });
      onSuccess();
    } else {
      toast({
        title: "Upload parcialmente concluído",
        description: "Alguns arquivos falharam no upload",
        variant: "destructive",
      });
    }
  };

  const canUpload = files.some(f => f.status === "pending") && documentType;
  const hasSuccessfulUploads = files.some(f => f.status === "success");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Documentos</DialogTitle>
          <DialogDescription>
            Envie documentos para {numero_cnj ? `o processo ${numero_cnj}` : "a biblioteca"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome do documento"
              />
            </div>
            
            <div>
              <Label htmlFor="document_type">Tipo *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do documento"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Separadas por vírgula: contrato, importante, revisão"
            />
          </div>

          {/* Área de drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? "border-primary bg-primary/5" 
                : "border-neutral-300 hover:border-neutral-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p className="text-lg font-medium mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-neutral-600 mb-4">
              PDF, imagens, Word, Excel - até {formatFileSize(MAX_FILE_SIZE)}
            </p>
            <Button variant="outline">
              Selecionar Arquivos
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* Lista de arquivos */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos selecionados</Label>
              {files.map((fileUpload, index) => {
                const Icon = getFileIcon(fileUpload.file);
                
                return (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Icon className="w-5 h-5 text-neutral-500" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {fileUpload.file.name}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {formatFileSize(fileUpload.file.size)}
                      </p>
                      
                      {fileUpload.status === "uploading" && (
                        <Progress 
                          value={fileUpload.progress} 
                          className="h-2 mt-1" 
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {fileUpload.status === "pending" && (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                      
                      {fileUpload.status === "uploading" && (
                        <Badge variant="secondary">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {fileUpload.progress}%
                        </Badge>
                      )}
                      
                      {fileUpload.status === "success" && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sucesso
                        </Badge>
                      )}
                      
                      {fileUpload.status === "error" && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                      
                      {fileUpload.status !== "uploading" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {hasSuccessfulUploads ? "Fechar" : "Cancelar"}
          </Button>
          
          {canUpload && (
            <Button 
              onClick={handleUploadAll}
              disabled={prepareUploadMutation.isPending}
            >
              {prepareUploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
