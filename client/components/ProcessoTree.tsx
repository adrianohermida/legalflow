import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Plus,
  GitBranch,
  FileText,
  Scale,
  Clock,
  Building,
  Users,
  Tag,
  Link2,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatCNJ } from "../lib/utils";
import ProcessoTags from "./ProcessoTags";

interface ProcessoNode {
  numero_cnj: string;
  tribunal_sigla: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
  parent_numero_cnj?: string;
  tipo_processo: string;
  data: any;
  children?: ProcessoNode[];
  level: number;
  instancia?: string;
  area?: string;
  classe?: string;
  created_at: string;
}

interface ProcessoTreeProps {
  numeroCnj: string;
  showActions?: boolean;
  maxDepth?: number;
}

const TIPO_PROCESSO_CONFIG = {
  principal: {
    label: "Principal",
    icon: FileText,
    color: "bg-blue-100 text-blue-800",
    description: "Processo principal",
  },
  incidente: {
    label: "Incidente",
    icon: GitBranch,
    color: "bg-purple-100 text-purple-800",
    description: "Processo incidental",
  },
  recurso: {
    label: "Recurso",
    icon: Scale,
    color: "bg-orange-100 text-orange-800",
    description: "Recurso interposto",
  },
  execucao: {
    label: "Execução",
    icon: Clock,
    color: "bg-green-100 text-green-800",
    description: "Processo de execução",
  },
  cautelar: {
    label: "Cautelar",
    icon: Users,
    color: "bg-red-100 text-red-800",
    description: "Medida cautelar",
  },
  conexo: {
    label: "Conexo",
    icon: Link2,
    color: "bg-yellow-100 text-yellow-800",
    description: "Processo conexo",
  },
};

export default function ProcessoTree({
  numeroCnj,
  showActions = true,
  maxDepth = 3,
}: ProcessoTreeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([numeroCnj]),
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProcessoCnj, setNewProcessoCnj] = useState("");
  const [newProcessoTipo, setNewProcessoTipo] = useState<string>("incidente");
  const [newProcessoDescricao, setNewProcessoDescricao] = useState("");

  // Query to fetch process tree
  const { data: processTree = [], isLoading } = useQuery({
    queryKey: ["processo-tree", numeroCnj],
    queryFn: async () => {
      // First, check if we have hierarchy columns
      try {
        // Get the main process and try to find related processes
        const { data: mainProcess, error: mainError } = await supabase
          .from("processos")
          .select("*")
          .eq("numero_cnj", numeroCnj)
          .single();

        if (mainError) throw mainError;

        // For now, we'll simulate a tree structure using the JSONB data field
        // In production, you would add parent_numero_cnj column and query the full tree
        const tree: ProcessoNode[] = [];

        // Add main process as root
        const mainNode: ProcessoNode = {
          ...mainProcess,
          tipo_processo: mainProcess.data?.tipo_processo || "principal",
          instancia: mainProcess.data?.capa?.instancia,
          area: mainProcess.data?.capa?.area,
          classe: mainProcess.data?.capa?.classe,
          level: 0,
          children: [],
        };

        tree.push(mainNode);

        // Check for related processes stored in JSONB data
        const relatedProcesses = mainProcess.data?.processos_relacionados || [];

        for (const related of relatedProcesses) {
          try {
            const { data: relatedProcess } = await supabase
              .from("processos")
              .select("*")
              .eq("numero_cnj", related.numero_cnj)
              .single();

            if (relatedProcess) {
              const relatedNode: ProcessoNode = {
                ...relatedProcess,
                parent_numero_cnj: numeroCnj,
                tipo_processo: related.tipo || "incidente",
                instancia: relatedProcess.data?.capa?.instancia,
                area: relatedProcess.data?.capa?.area,
                classe: relatedProcess.data?.capa?.classe,
                level: 1,
                children: [],
              };

              mainNode.children?.push(relatedNode);
            }
          } catch (error) {
            console.warn(
              `Failed to fetch related process ${related.numero_cnj}:`,
              error,
            );
          }
        }

        return tree;
      } catch (error) {
        console.error("Error fetching process tree:", error);
        return [];
      }
    },
  });

  // Mutation to add related process
  const addRelatedProcessMutation = useMutation({
    mutationFn: async ({
      parentCnj,
      childCnj,
      tipo,
      descricao,
    }: {
      parentCnj: string;
      childCnj: string;
      tipo: string;
      descricao: string;
    }) => {
      // First, check if child process exists
      const { data: childProcess, error: childError } = await supabase
        .from("processos")
        .select("*")
        .eq("numero_cnj", childCnj)
        .single();

      if (childError) {
        throw new Error(
          "Processo filho não encontrado. Certifique-se de que o CNJ está correto.",
        );
      }

      // Get parent process
      const { data: parentProcess, error: parentError } = await supabase
        .from("processos")
        .select("data")
        .eq("numero_cnj", parentCnj)
        .single();

      if (parentError) throw parentError;

      // Update parent process with new relationship
      const currentRelated = parentProcess.data?.processos_relacionados || [];

      // Check if relationship already exists
      const relationExists = currentRelated.some(
        (r: any) => r.numero_cnj === childCnj,
      );
      if (relationExists) {
        throw new Error("Este processo já está relacionado.");
      }

      const newRelated = [
        ...currentRelated,
        {
          numero_cnj: childCnj,
          tipo: tipo,
          descricao: descricao,
          created_at: new Date().toISOString(),
        },
      ];

      const updatedData = {
        ...parentProcess.data,
        processos_relacionados: newRelated,
      };

      const { error: updateError } = await supabase
        .from("processos")
        .update({ data: updatedData })
        .eq("numero_cnj", parentCnj);

      if (updateError) throw updateError;

      return { parentCnj, childCnj, tipo, descricao };
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Processo relacionado adicionado!",
      });
      queryClient.invalidateQueries({ queryKey: ["processo-tree", numeroCnj] });
      setShowAddDialog(false);
      setNewProcessoCnj("");
      setNewProcessoDescricao("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar processo relacionado",
        variant: "destructive",
      });
    },
  });

  const toggleNode = (cnj: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(cnj)) {
      newExpanded.delete(cnj);
    } else {
      newExpanded.add(cnj);
    }
    setExpandedNodes(newExpanded);
  };

  const copyToClipboard = async (cnj: string) => {
    try {
      await navigator.clipboard.writeText(cnj);
      toast({
        title: "Copiado!",
        description: `CNJ ${cnj} copiado para a área de transferência`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar CNJ",
        variant: "destructive",
      });
    }
  };

  const renderProcessNode = (node: ProcessoNode, index: number) => {
    const isExpanded = expandedNodes.has(node.numero_cnj);
    const hasChildren = node.children && node.children.length > 0;
    const config =
      TIPO_PROCESSO_CONFIG[
        node.tipo_processo as keyof typeof TIPO_PROCESSO_CONFIG
      ] || TIPO_PROCESSO_CONFIG.principal;
    const IconComponent = config.icon;

    return (
      <div key={node.numero_cnj} className="space-y-2">
        <Card
          className={`transition-all duration-200 hover:shadow-md ${
            node.numero_cnj === numeroCnj
              ? "ring-2 ring-blue-500 ring-opacity-50"
              : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Tree connector */}
              <div className="flex items-center">
                {node.level > 0 && (
                  <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 mr-2" />
                )}
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleNode(node.numero_cnj)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                )}
                {!hasChildren && node.level > 0 && <div className="w-6 h-6" />}
              </div>

              {/* Process info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="w-4 h-4 text-gray-600" />
                  <Badge variant="secondary" className={config.color}>
                    {config.label}
                  </Badge>
                  {node.instancia && (
                    <Badge variant="outline" className="text-xs">
                      {node.instancia}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-blue-600">
                      {formatCNJ(node.numero_cnj)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(node.numero_cnj)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  <p className="text-sm text-gray-900 font-medium">
                    {node.titulo_polo_ativo} × {node.titulo_polo_passivo}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {node.tribunal_sigla && (
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {node.tribunal_sigla}
                      </div>
                    )}
                    {node.area && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {node.area}
                      </div>
                    )}
                    {node.classe && <span>{node.classe}</span>}
                  </div>

                  {/* Process tags */}
                  <div className="mt-2">
                    <ProcessoTags
                      numeroCnj={node.numero_cnj}
                      size="sm"
                      maxVisible={2}
                      readonly={node.numero_cnj !== numeroCnj}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      window.open(`/processos/${node.numero_cnj}`, "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="ml-6 space-y-2">
            {node.children?.map((child, childIndex) =>
              renderProcessNode(child, childIndex),
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Árvore Processual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Árvore Processual
          </CardTitle>
          {showActions && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Relacionar Processo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Relacionar Processo</DialogTitle>
                  <DialogDescription>
                    Adicione um processo relacionado à árvore processual
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cnj-input">Número CNJ</Label>
                    <Input
                      id="cnj-input"
                      value={newProcessoCnj}
                      onChange={(e) => setNewProcessoCnj(e.target.value)}
                      placeholder="0000000-00.0000.0.00.0000"
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo-select">Tipo de Relação</Label>
                    <Select
                      value={newProcessoTipo}
                      onValueChange={setNewProcessoTipo}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_PROCESSO_CONFIG).map(
                          ([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="w-4 h-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="descricao-input">
                      Descrição (opcional)
                    </Label>
                    <Textarea
                      id="descricao-input"
                      value={newProcessoDescricao}
                      onChange={(e) => setNewProcessoDescricao(e.target.value)}
                      placeholder="Descreva a relação entre os processos..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (newProcessoCnj.trim()) {
                          addRelatedProcessMutation.mutate({
                            parentCnj: numeroCnj,
                            childCnj: newProcessoCnj.trim(),
                            tipo: newProcessoTipo,
                            descricao: newProcessoDescricao,
                          });
                        }
                      }}
                      disabled={
                        !newProcessoCnj.trim() ||
                        addRelatedProcessMutation.isPending
                      }
                    >
                      {addRelatedProcessMutation.isPending
                        ? "Adicionando..."
                        : "Adicionar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {processTree.length > 0 ? (
          <div className="space-y-2">
            {processTree.map((node, index) => renderProcessNode(node, index))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum processo relacionado encontrado</p>
            {showActions && (
              <p className="text-sm mt-2">
                Use o botão "Relacionar Processo" para adicionar processos à
                árvore
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
