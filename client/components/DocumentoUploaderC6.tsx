import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Image,
  Paperclip,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface DocumentUploadForm {
  title: string;
  description: string;
  numero_cnj?: string;
  document_type: string;
  tags: string[];
  categoria?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface DocumentUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultCNJ?: string;
}

const DOCUMENT_TYPES = [
  { value: "peticao", label: "Petição" },
  { value: "contrato", label: "Contrato" },
  { value: "procuracao", label: "Procuração" },
  { value: "documento_pessoal", label: "Documento Pessoal" },
  { value: "comprovante", label: "Comprovante" },
  { value: "laudo", label: "Laudo" },
  { value: "parecer", label: "Parecer" },
  { value: "sentenca", label: "Sentença" },
  { value: "despacho", label: "Despacho" },
  { value: "oficio", label: "Ofício" },
  { value: "ata", label: "Ata" },
  { value: "protocolo", label: "Protocolo" },
  { value: "outros", label: "Outros" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
];

export function DocumentoUploaderC6({
  isOpen,
  onClose,
  onSuccess,
  defaultCNJ,
}: DocumentUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const [form, setForm] = useState<DocumentUploadForm>({
    title: "",
    description: "",
    numero_cnj: defaultCNJ || "",
    document_type: "outros",
    tags: [],
    categoria: "",
  });

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [tagInput, setTagInput] = useState("");

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileData: {
      file: FileWithPreview;
      form: DocumentUploadForm;
    }) => {
      const { file, form } = fileData;
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `documents/${fileName}`;

      // Upload to Supabase Storage with progress tracking
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            setUploadProgress((prev) => ({ ...prev, [file.id]: percentage }));
          },
        });

      if (uploadError) throw uploadError;

      // Create document record
      const metadata = {
        numero_cnj: form.numero_cnj || null,
        document_type: form.document_type,
        tags: form.tags,
        description: form.description,
        categoria: form.categoria,
        original_name: file.name,
        file_type: file.type,
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

      return { docData, uploadData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-biblioteca"] });
      toast({
        title: "Upload concluído!",
        description: "Documento(s) enviado(s) com sucesso.",
      });
      resetForm();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o(s) documento(s).",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      numero_cnj: defaultCNJ || "",
      document_type: "outros",
      tags: [],
      categoria: "",
    });
    setFiles([]);
    setUploadProgress({});
    setTagInput("");
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Tipo de arquivo não suportado";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande (máximo 50MB)";
    }
    return null;
  };

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles: FileWithPreview[] = [];
      const errors: string[] = [];

      Array.from(newFiles).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
          return;
        }

        const fileWithPreview: FileWithPreview = Object.assign(file, {
          id: `${Date.now()}-${Math.random()}`,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        });

        validFiles.push(fileWithPreview);
      });

      if (errors.length > 0) {
        toast({
          title: "Alguns arquivos foram rejeitados",
          description: errors.join(", "),
          variant: "destructive",
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);

      // Auto-fill title if single file and no title set
      if (validFiles.length === 1 && !form.title) {
        setForm((prev) => ({
          ...prev,
          title: validFiles[0].name.replace(/\.[^/.]+$/, ""),
        }));
      }
    },
    [form.title, toast],
  );

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return updated;
    });
    setUploadProgress((prev) => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }

    if (!form.title) {
      toast({
        title: "Título obrigatório",
        description: "Digite um título para o documento.",
        variant: "destructive",
      });
      return;
    }

    // Upload each file
    for (const file of files) {
      await uploadMutation.mutateAsync({ file, form });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf"))
      return <FileText className="h-6 w-6 text-red-600" />;
    if (type.includes("image"))
      return <Image className="h-6 w-6 text-green-600" />;
    if (type.includes("word"))
      return <FileText className="h-6 w-6 text-blue-600" />;
    return <Paperclip className="h-6 w-6 text-gray-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📁 Novo Documento - Biblioteca</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </h3>
            <p className="text-gray-600 mb-4">
              PDF, DOC, DOCX, TXT, JPG, PNG (máx. 50MB cada)
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Selecionar Arquivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">
                Arquivos Selecionados ({files.length})
              </h4>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {uploadProgress[file.id] !== undefined && (
                      <div className="w-24">
                        <Progress
                          value={uploadProgress[file.id]}
                          className="h-2"
                        />
                      </div>
                    )}
                    {uploadProgress[file.id] === 100 ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : uploadProgress[file.id] !== undefined ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nome do documento"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descrição opcional do documento"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="numero_cnj">CNJ do Processo</Label>
              <Input
                id="numero_cnj"
                value={form.numero_cnj}
                onChange={(e) =>
                  setForm({ ...form, numero_cnj: e.target.value })
                }
                placeholder="0000000-00.0000.0.00.0000"
              />
            </div>

            <div>
              <Label htmlFor="document_type">Tipo do Documento</Label>
              <Select
                value={form.document_type}
                onValueChange={(value) =>
                  setForm({ ...form, document_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
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

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
                placeholder="Ex: Contratos, Comprovantes"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <div className="flex space-x-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Adicionar tag"
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                files.length === 0 || !form.title || uploadMutation.isPending
              }
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar{" "}
                  {files.length > 1 ? `${files.length} Arquivos` : "Arquivo"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
