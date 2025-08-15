import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Tag, Hash } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface ProcessTag {
  numero_cnj: string;
  tag: string;
  created_by?: string;
  created_at: string;
}

interface ProcessoTagsProps {
  numeroCnj: string;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  maxVisible?: number;
}

const TAG_COLORS = [
  {
    name: "Cinza",
    value: "gray",
    class: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  },
  {
    name: "Azul",
    value: "blue",
    class: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  {
    name: "Verde",
    value: "green",
    class: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  {
    name: "Amarelo",
    value: "yellow",
    class: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  },
  {
    name: "Laranja",
    value: "orange",
    class: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  },
  {
    name: "Vermelho",
    value: "red",
    class: "bg-red-100 text-red-800 hover:bg-red-200",
  },
  {
    name: "Roxo",
    value: "purple",
    class: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  },
  {
    name: "Rosa",
    value: "pink",
    class: "bg-pink-100 text-pink-800 hover:bg-pink-200",
  },
];

const PREDEFINED_TAGS = [
  "Urgente",
  "Alta Prioridade",
  "Aguardando Cliente",
  "Documentos Pendentes",
  "Recurso",
  "Execução",
  "Trabalhista",
  "Cível",
  "Criminal",
  "Tributário",
  "Previdenciário",
  "Família",
  "Consumidor",
  "Imobiliário",
  "Empresarial",
];

export default function ProcessoTags({
  numeroCnj,
  readonly = false,
  size = "md",
  maxVisible = 3,
}: ProcessoTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState("gray");

  // Query to fetch process tags
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["processo-tags", numeroCnj],
    queryFn: async () => {
      // First try to get from JSONB data field
      const { data: processo, error: processoError } = await supabase
        .from("processos")
        .select("data")
        .eq("numero_cnj", numeroCnj)
        .single();

      if (processoError) throw processoError;

      // Extract tags from JSONB data field
      const tagsFromData = processo?.data?.tags || [];

      // Convert to consistent format
      return tagsFromData.map((tag: any) => {
        if (typeof tag === "string") {
          return {
            numero_cnj: numeroCnj,
            tag: tag,
            created_at: new Date().toISOString(),
          };
        }
        return {
          numero_cnj: numeroCnj,
          tag: tag.name || tag.tag,
          color: tag.color || "gray",
          created_at: tag.created_at || new Date().toISOString(),
        };
      });
    },
  });

  // Mutation to add tag
  const addTagMutation = useMutation({
    mutationFn: async ({ tag, color }: { tag: string; color: string }) => {
      // Get current processo data
      const { data: processo, error: getError } = await supabase
        .from("processos")
        .select("data")
        .eq("numero_cnj", numeroCnj)
        .single();

      if (getError) throw getError;

      // Update tags in JSONB data field
      const currentTags = processo?.data?.tags || [];
      const newTagObj = {
        name: tag,
        color,
        created_at: new Date().toISOString(),
      };

      // Check if tag already exists
      const tagExists = currentTags.some(
        (t: any) => (typeof t === "string" ? t : t.name || t.tag) === tag,
      );

      if (tagExists) {
        throw new Error("Tag já existe neste processo");
      }

      const updatedTags = [...currentTags, newTagObj];
      const updatedData = {
        ...processo.data,
        tags: updatedTags,
      };

      const { error: updateError } = await supabase
        .from("processos")
        .update({ data: updatedData })
        .eq("numero_cnj", numeroCnj);

      if (updateError) throw updateError;

      return newTagObj;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Tag adicionada ao processo!" });
      queryClient.invalidateQueries({ queryKey: ["processo-tags", numeroCnj] });
      queryClient.invalidateQueries({ queryKey: ["processo", numeroCnj] });
      setNewTag("");
      setShowDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar tag",
        variant: "destructive",
      });
    },
  });

  // Mutation to remove tag
  const removeTagMutation = useMutation({
    mutationFn: async (tagToRemove: string) => {
      // Get current processo data
      const { data: processo, error: getError } = await supabase
        .from("processos")
        .select("data")
        .eq("numero_cnj", numeroCnj)
        .single();

      if (getError) throw getError;

      // Remove tag from JSONB data field
      const currentTags = processo?.data?.tags || [];
      const updatedTags = currentTags.filter(
        (t: any) =>
          (typeof t === "string" ? t : t.name || t.tag) !== tagToRemove,
      );

      const updatedData = {
        ...processo.data,
        tags: updatedTags,
      };

      const { error: updateError } = await supabase
        .from("processos")
        .update({ data: updatedData })
        .eq("numero_cnj", numeroCnj);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Tag removida do processo!" });
      queryClient.invalidateQueries({ queryKey: ["processo-tags", numeroCnj] });
      queryClient.invalidateQueries({ queryKey: ["processo", numeroCnj] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover tag",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    addTagMutation.mutate({ tag: newTag.trim(), color: selectedColor });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const getTagColor = (tagData: any) => {
    const color =
      typeof tagData === "string" ? "gray" : tagData.color || "gray";
    const colorConfig =
      TAG_COLORS.find((c) => c.value === color) || TAG_COLORS[0];
    return colorConfig.class;
  };

  const getTagName = (tagData: any) => {
    return typeof tagData === "string" ? tagData : tagData.name || tagData.tag;
  };

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = Math.max(0, tags.length - maxVisible);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visibleTags.map((tag: any, index: number) => (
        <Badge
          key={`${getTagName(tag)}-${index}`}
          variant="secondary"
          className={`${getTagColor(tag)} flex items-center gap-1 ${
            size === "sm"
              ? "text-xs px-2 py-0"
              : size === "lg"
                ? "text-sm px-3 py-1"
                : "text-xs px-2 py-1"
          }`}
        >
          <Hash className={`${size === "sm" ? "w-2 h-2" : "w-3 h-3"}`} />
          {getTagName(tag)}
          {!readonly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTagMutation.mutate(getTagName(tag));
              }}
              className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
            >
              <X className={`${size === "sm" ? "w-2 h-2" : "w-3 h-3"}`} />
            </button>
          )}
        </Badge>
      ))}

      {hiddenCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-gray-500"
            >
              +{hiddenCount}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-wrap gap-1">
              {tags.slice(maxVisible).map((tag: any, index: number) => (
                <Badge
                  key={`hidden-${getTagName(tag)}-${index}`}
                  variant="secondary"
                  className={`${getTagColor(tag)} flex items-center gap-1 text-xs`}
                >
                  <Hash className="w-3 h-3" />
                  {getTagName(tag)}
                  {!readonly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTagMutation.mutate(getTagName(tag));
                      }}
                      className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {!readonly && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-1 text-gray-500 hover:text-gray-700 ${
                size === "sm" ? "h-5 px-2 text-xs" : "h-6 px-2 text-xs"
              }`}
            >
              <Plus className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`} />
              Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Adicionar Tag
              </DialogTitle>
              <DialogDescription>
                Adicione uma tag para categorizar este processo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="tag-input">Nome da tag</Label>
                <Input
                  id="tag-input"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite o nome da tag..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tags sugeridas</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {PREDEFINED_TAGS.map((predefinedTag) => (
                    <Button
                      key={predefinedTag}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setNewTag(predefinedTag)}
                    >
                      {predefinedTag}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label>Cor da tag</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColor === color.value
                          ? "border-gray-900"
                          : "border-gray-200"
                      } ${color.class.split(" ")[0]} hover:scale-110 transition-transform`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || addTagMutation.isPending}
                >
                  {addTagMutation.isPending
                    ? "Adicionando..."
                    : "Adicionar Tag"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
