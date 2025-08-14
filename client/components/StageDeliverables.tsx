import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  File,
  Check,
  X,
  Eye,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Switch } from "./ui/switch";
import { toast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";

interface DocumentRequirement {
  id: string;
  template_stage_id: string;
  name: string;
  required: boolean;
  file_types: string[];
  max_size_mb: number;
  uploads?: DocumentUpload[];
}

interface DocumentUpload {
  id: string;
  stage_instance_id: string;
  document_requirement_id?: string;
  filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  status: "pending" | "approved" | "rejected";
  uploaded_by: string;
  uploaded_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface StageInstance {
  id: string;
  template_stage_id: string;
  status: string;
  title?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes("pdf"))
    return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType.includes("image"))
    return <File className="w-4 h-4 text-blue-500" />;
  if (fileType.includes("word") || fileType.includes("doc"))
    return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-neutral-500" />;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          Aprovado
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          Rejeitado
        </Badge>
      );
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          Aguardando
        </Badge>
      );
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FileUploadArea: React.FC<{
  requirement: DocumentRequirement;
  stageInstanceId: string;
  onUploadComplete: () => void;
}> = ({ requirement, stageInstanceId, onUploadComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate file type
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
      if (!requirement.file_types.includes(fileExtension)) {
        throw new Error(
          `Tipo de arquivo não permitido. Aceitos: ${requirement.file_types.join(", ")}`,
        );
      }

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > requirement.max_size_mb) {
        throw new Error(
          `Arquivo muito grande. Máximo: ${requirement.max_size_mb}MB`,
        );
      }

      // Create storage path (in a real app, you'd upload to Supabase Storage)
      const storagePath = `uploads/${stageInstanceId}/${Date.now()}_${file.name}`;

      // Insert upload record
      const { data, error } = await lf
        .from("document_uploads")
        .insert({
          stage_instance_id: stageInstanceId,
          document_requirement_id: requirement.id,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Upload realizado",
        description: "Arquivo enviado com sucesso.",
      });
      onUploadComplete();
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    uploadMutation.mutate(file);
    setTimeout(() => setUploading(false), 1000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const existingUploads = requirement.uploads || [];
  const hasApprovedUpload = existingUploads.some(
    (u) => u.status === "approved",
  );

  if (hasApprovedUpload) {
    return null; // Don't show upload area if already approved
  }

  return (
    <div className="space-y-3">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-neutral-300 hover:border-neutral-400"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-neutral-900 mb-1">
          Clique para enviar ou arraste arquivos aqui
        </p>
        <p className="text-xs text-neutral-500">
          Aceitos: {requirement.file_types.join(", ")} • Máximo:{" "}
          {requirement.max_size_mb}MB
        </p>
        {uploading && (
          <div className="mt-3">
            <Progress value={70} className="h-2" />
            <p className="text-xs text-neutral-500 mt-1">Enviando...</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={requirement.file_types.map((type) => `.${type}`).join(",")}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </div>
  );
};

const ReviewUploadDialog: React.FC<{
  upload: DocumentUpload;
  onReview: () => void;
}> = ({ upload, onReview }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"approved" | "rejected">("approved");
  const [notes, setNotes] = useState("");

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await lf
        .from("document_uploads")
        .update({
          status,
          review_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", upload.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Revisão concluída",
        description: `Documento ${status === "approved" ? "aprovado" : "rejeitado"}.`,
      });
      setOpen(false);
      onReview();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar revisão: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          Revisar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getFileIcon(upload.file_type)}
              <span className="font-medium">{upload.filename}</span>
            </div>
            <div className="text-xs text-neutral-500">
              {formatFileSize(upload.file_size)} • Enviado em{" "}
              {new Date(upload.uploaded_at).toLocaleDateString("pt-BR")}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status da Revisão</Label>
            <Select
              value={status}
              onValueChange={(value: "approved" | "rejected") =>
                setStatus(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Aprovar Documento</SelectItem>
                <SelectItem value="rejected">Rejeitar Documento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione comentários sobre a revisão..."
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => reviewMutation.mutate()}
            disabled={reviewMutation.isPending}
            className="flex-1"
          >
            {reviewMutation.isPending ? "Salvando..." : "Confirmar Revisão"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AddRequirementDialog: React.FC<{
  templateStageId: string;
  onAdd: () => void;
}> = ({ templateStageId, onAdd }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    required: true,
    file_types: ["pdf"],
    max_size_mb: 10,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await lf.from("document_requirements").insert({
        template_stage_id: templateStageId,
        name: formData.name,
        required: formData.required,
        file_types: formData.file_types,
        max_size_mb: formData.max_size_mb,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Requisito adicionado",
        description: "Novo requisito de documento criado.",
      });
      setOpen(false);
      setFormData({
        name: "",
        required: true,
        file_types: ["pdf"],
        max_size_mb: 10,
      });
      onAdd();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao adicionar requisito: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Requisito
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Requisito de Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Documento</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: RG do requerente"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.required}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, required: checked })
              }
            />
            <Label>Documento obrigatório</Label>
          </div>

          <div className="space-y-2">
            <Label>Tipos de arquivo aceitos</Label>
            <Input
              value={formData.file_types.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  file_types: e.target.value.split(",").map((t) => t.trim()),
                })
              }
              placeholder="pdf, jpg, png, doc"
            />
          </div>

          <div className="space-y-2">
            <Label>Tamanho máximo (MB)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.max_size_mb}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_size_mb: parseInt(e.target.value) || 10,
                })
              }
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!formData.name.trim() || addMutation.isPending}
            className="flex-1"
          >
            {addMutation.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const StageDeliverables: React.FC<{
  stageInstance: StageInstance;
  canManageRequirements?: boolean;
}> = ({ stageInstance, canManageRequirements = false }) => {
  const queryClient = useQueryClient();

  // Load document requirements for this stage
  const {
    data: requirements,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["document-requirements", stageInstance.template_stage_id],
    queryFn: async () => {
      const { data: reqs, error } = await lf
        .from("document_requirements")
        .select("*")
        .eq("template_stage_id", stageInstance.template_stage_id)
        .order("name");

      if (error) throw error;

      // Load uploads for each requirement
      const reqsWithUploads = await Promise.all(
        reqs.map(async (req) => {
          const { data: uploads, error: uploadsError } = await lf
            .from("document_uploads")
            .select("*")
            .eq("stage_instance_id", stageInstance.id)
            .eq("document_requirement_id", req.id)
            .order("uploaded_at", { ascending: false });

          if (uploadsError) throw uploadsError;
          return { ...req, uploads };
        }),
      );

      return reqsWithUploads as DocumentRequirement[];
    },
  });

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({
      queryKey: ["document-requirements", stageInstance.template_stage_id],
    });
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-neutral-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 rounded"></div>
            <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requirements || requirements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Entregáveis da Etapa</CardTitle>
            {canManageRequirements && (
              <AddRequirementDialog
                templateStageId={stageInstance.template_stage_id}
                onAdd={handleRefresh}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-medium text-neutral-900 mb-2">
              Nenhum documento necessário
            </h3>
            <p className="text-neutral-600 text-sm">
              Esta etapa não possui requisitos de documentos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRequirements = requirements.length;
  const completedRequirements = requirements.filter((req) =>
    req.uploads?.some((upload) => upload.status === "approved"),
  ).length;
  const progressPercentage =
    totalRequirements > 0
      ? (completedRequirements / totalRequirements) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Entregáveis da Etapa</CardTitle>
          {canManageRequirements && (
            <AddRequirementDialog
              templateStageId={stageInstance.template_stage_id}
              onAdd={handleRefresh}
            />
          )}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-neutral-600">Progresso dos Documentos</span>
            <span className="font-medium">
              {completedRequirements} de {totalRequirements}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {requirements.map((requirement) => {
          const uploads = requirement.uploads || [];
          const approvedUpload = uploads.find((u) => u.status === "approved");
          const pendingUploads = uploads.filter((u) => u.status === "pending");
          const rejectedUploads = uploads.filter(
            (u) => u.status === "rejected",
          );

          return (
            <div key={requirement.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-neutral-900">
                      {requirement.name}
                    </h4>
                    {requirement.required && (
                      <Badge variant="secondary" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Aceitos: {requirement.file_types.join(", ")} • Máximo:{" "}
                    {requirement.max_size_mb}MB
                  </p>
                </div>

                {approvedUpload ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completo
                  </Badge>
                ) : pendingUploads.length > 0 ? (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    <Clock className="w-3 h-3 mr-1" />
                    Em Análise
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </div>

              {/* Approved Upload */}
              {approvedUpload && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        {approvedUpload.filename}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Aprovado em{" "}
                    {new Date(approvedUpload.reviewed_at!).toLocaleDateString(
                      "pt-BR",
                    )}
                  </p>
                </div>
              )}

              {/* Pending Uploads */}
              {pendingUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(upload.file_type)}
                      <div>
                        <span className="text-sm font-medium">
                          {upload.filename}
                        </span>
                        <p className="text-xs text-neutral-500">
                          {formatFileSize(upload.file_size)} •{" "}
                          {new Date(upload.uploaded_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ReviewUploadDialog
                        upload={upload}
                        onReview={handleRefresh}
                      />
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Rejected Uploads */}
              {rejectedUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-600" />
                      <div>
                        <span className="text-sm font-medium text-red-900">
                          {upload.filename}
                        </span>
                        <p className="text-xs text-red-600">
                          Rejeitado •{" "}
                          {upload.review_notes || "Documento não conforme"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload Area */}
              {!approvedUpload && (
                <FileUploadArea
                  requirement={requirement}
                  stageInstanceId={stageInstance.id}
                  onUploadComplete={handleRefresh}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default StageDeliverables;
