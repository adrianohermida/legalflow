import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
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
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  MessageSquare,
  Eye,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface DocumentUpload {
  id: string;
  document_id?: string;
  stage_instance_id?: string;
  numero_cnj?: string;
  original_filename: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  status: string;
  progress_percentage: number;
  requires_approval: boolean;
  approved_by?: string;
  approval_notes?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_by: string;
  created_at: string;
  metadata?: any;
}

interface DocumentApprovalSystemProps {
  numero_cnj?: string;
  stage_instance_id?: string;
  mode?: "full" | "widget";
}

const STATUS_CONFIG = {
  uploading: {
    label: "Carregando",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  uploaded: {
    label: "Aguardando",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  processing: {
    label: "Processando",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  approved: {
    label: "Aprovado",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejeitado",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  failed: {
    label: "Falha",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
};

export function DocumentApprovalSystem({
  numero_cnj,
  stage_instance_id,
  mode = "full",
}: DocumentApprovalSystemProps) {
  const [selectedUpload, setSelectedUpload] = useState<DocumentUpload | null>(
    null,
  );
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para listar uploads pendentes de aprovação
  const { data: pendingUploads, isLoading } = useQuery({
    queryKey: ["sf8-pending-uploads", numero_cnj, stage_instance_id],
    queryFn: async () => {
      const { data, error } = await lf
        .from("document_uploads")
        .select("*")
        .eq("requires_approval", true)
        .in("status", ["uploaded", "processing"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filtrar por critério se fornecido
      let filtered = data;
      if (numero_cnj) {
        filtered = filtered.filter(
          (upload) => upload.numero_cnj === numero_cnj,
        );
      }
      if (stage_instance_id) {
        filtered = filtered.filter(
          (upload) => upload.stage_instance_id === stage_instance_id,
        );
      }

      return filtered as DocumentUpload[];
    },
    staleTime: 30 * 1000,
  });

  // Query para histórico de aprovações
  const { data: approvalHistory } = useQuery({
    queryKey: ["sf8-approval-history", numero_cnj, stage_instance_id],
    queryFn: async () => {
      const { data, error } = await lf
        .from("document_uploads")
        .select("*")
        .eq("requires_approval", true)
        .in("status", ["approved", "rejected"])
        .order("approved_at", { ascending: false })
        .limit(mode === "widget" ? 5 : 20);

      if (error) throw error;

      let filtered = data;
      if (numero_cnj) {
        filtered = filtered.filter(
          (upload) => upload.numero_cnj === numero_cnj,
        );
      }
      if (stage_instance_id) {
        filtered = filtered.filter(
          (upload) => upload.stage_instance_id === stage_instance_id,
        );
      }

      return filtered as DocumentUpload[];
    },
    staleTime: 60 * 1000,
  });

  // Mutation para aprovar documento
  const approveMutation = useMutation({
    mutationFn: async ({
      uploadId,
      notes,
    }: {
      uploadId: string;
      notes?: string;
    }) => {
      // Atualizar upload
      const { error: uploadError } = await lf
        .from("document_uploads")
        .update({
          status: "approved",
          approved_by: (await lf.auth.getUser()).data.user?.id,
          approval_notes: notes,
          approved_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

      if (uploadError) throw uploadError;

      // Buscar upload para obter document_id
      const { data: upload, error: getError } = await lf
        .from("document_uploads")
        .select("document_id")
        .eq("id", uploadId)
        .single();

      if (getError) throw getError;

      // Aprovar documento relacionado se existir
      if (upload.document_id) {
        const { error: docError } = await lf
          .from("documents")
          .update({
            status: "aprovado",
            approved_by: (await lf.auth.getUser()).data.user?.id,
            approved_at: new Date().toISOString(),
          })
          .eq("id", upload.document_id);

        if (docError) throw docError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sf8-pending-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["sf8-approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["sf8-documents"] });
      setSelectedUpload(null);
      setApprovalNotes("");
      toast({
        title: "Documento Aprovado",
        description: "O documento foi aprovado com sucesso",
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

  // Mutation para rejeitar documento
  const rejectMutation = useMutation({
    mutationFn: async ({
      uploadId,
      reason,
    }: {
      uploadId: string;
      reason: string;
    }) => {
      // Atualizar upload
      const { error: uploadError } = await lf
        .from("document_uploads")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", uploadId);

      if (uploadError) throw uploadError;

      // Buscar upload para obter document_id
      const { data: upload, error: getError } = await lf
        .from("document_uploads")
        .select("document_id")
        .eq("id", uploadId)
        .single();

      if (getError) throw getError;

      // Reprovar documento relacionado se existir
      if (upload.document_id) {
        const { error: docError } = await lf
          .from("documents")
          .update({
            status: "reprovado",
          })
          .eq("id", upload.document_id);

        if (docError) throw docError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sf8-pending-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["sf8-approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["sf8-documents"] });
      setSelectedUpload(null);
      setRejectionReason("");
      toast({
        title: "Documento Rejeitado",
        description: "O documento foi rejeitado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Rejeição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const UploadItem = ({
    upload,
    showActions = true,
  }: {
    upload: DocumentUpload;
    showActions?: boolean;
  }) => {
    const statusConfig =
      STATUS_CONFIG[upload.status as keyof typeof STATUS_CONFIG];

    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <FileText className="w-5 h-5 text-neutral-500 mt-1" />

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate mb-1">
                  {upload.original_filename}
                </h4>

                <div className="space-y-1 text-xs text-neutral-600">
                  {upload.file_size && (
                    <div>{formatFileSize(upload.file_size)}</div>
                  )}

                  {upload.numero_cnj && (
                    <div>Processo: {upload.numero_cnj}</div>
                  )}

                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(upload.created_at)}
                  </div>

                  {upload.approval_notes && (
                    <div className="flex items-start gap-1 mt-2">
                      <MessageSquare className="w-3 h-3 mt-0.5" />
                      <span className="text-green-600">
                        {upload.approval_notes}
                      </span>
                    </div>
                  )}

                  {upload.rejection_reason && (
                    <div className="flex items-start gap-1 mt-2">
                      <MessageSquare className="w-3 h-3 mt-0.5" />
                      <span className="text-red-600">
                        {upload.rejection_reason}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-3">
              <Badge className={statusConfig.color}>
                <statusConfig.icon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>

              {showActions && upload.status === "uploaded" && (
                <div className="flex items-center gap-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setSelectedUpload(upload)}
                        className="h-7 px-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Aprovar Documento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja aprovar o documento "
                          {upload.original_filename}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Observações (opcional)
                        </label>
                        <Textarea
                          placeholder="Adicione observações sobre a aprovação..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                        />
                      </div>

                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setApprovalNotes("")}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            approveMutation.mutate({
                              uploadId: upload.id,
                              notes: approvalNotes,
                            })
                          }
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Aprovar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUpload(upload)}
                        className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejeitar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rejeitar Documento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja rejeitar o documento "
                          {upload.original_filename}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Motivo da rejeição *
                        </label>
                        <Textarea
                          placeholder="Explique o motivo da rejeição..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          required
                        />
                      </div>

                      <AlertDialogFooter>
                        <AlertDialogCancel
                          onClick={() => setRejectionReason("")}
                        >
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            rejectMutation.mutate({
                              uploadId: upload.id,
                              reason: rejectionReason,
                            })
                          }
                          disabled={
                            rejectMutation.isPending || !rejectionReason.trim()
                          }
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Rejeitar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (mode === "widget") {
    // Versão widget para usar em outras páginas
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Aprovações Pendentes
            </div>
            {pendingUploads && pendingUploads.length > 0 && (
              <Badge variant="secondary">{pendingUploads.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-neutral-500">
              Carregando...
            </div>
          ) : pendingUploads?.length ? (
            <div className="space-y-3">
              {pendingUploads.slice(0, 3).map((upload) => (
                <UploadItem key={upload.id} upload={upload} />
              ))}
              {pendingUploads.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    Ver todas as aprovações
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-neutral-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>Tudo aprovado!</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Versão completa
  return (
    <div className="space-y-6">
      {/* Uploads pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Aprovações Pendentes
            {pendingUploads && pendingUploads.length > 0 && (
              <Badge variant="secondary">{pendingUploads.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-neutral-500">
              Carregando uploads pendentes...
            </div>
          ) : pendingUploads?.length ? (
            <div className="space-y-4">
              {pendingUploads.map((upload) => (
                <UploadItem key={upload.id} upload={upload} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Tudo aprovado!</p>
              <p className="text-sm">
                Não há documentos pendentes de aprovação
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de aprovações */}
      {approvalHistory && approvalHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Histórico de Aprovações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvalHistory.map((upload) => (
                <UploadItem
                  key={upload.id}
                  upload={upload}
                  showActions={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
