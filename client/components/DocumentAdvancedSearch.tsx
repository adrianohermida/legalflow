import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import {
  Search,
  Filter,
  X,
  FileText,
  Calendar,
  Tag,
  User,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Eye,
  Star,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { lf } from "../lib/supabase";

interface SearchFilters {
  query: string;
  document_types: string[];
  statuses: string[];
  tags: string[];
  date_from?: string;
  date_to?: string;
  file_types: string[];
  min_size?: number;
  max_size?: number;
}

interface SortOptions {
  field: "created_at" | "title" | "file_size" | "relevance";
  direction: "asc" | "desc";
}

interface DocumentAdvancedSearchProps {
  numero_cnj?: string;
  cliente_cpfcnpj?: string;
  onResults: (documents: any[]) => void;
  defaultFilters?: Partial<SearchFilters>;
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

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "em_revisao", label: "Em Revisão" },
  { value: "arquivado", label: "Arquivado" },
  { value: "vencido", label: "Vencido" },
];

const FILE_TYPES = [
  { value: "application/pdf", label: "PDF" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "application/msword", label: "Word" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word (novo)" },
  { value: "application/vnd.ms-excel", label: "Excel" },
  { value: "text/plain", label: "Texto" },
];

export function DocumentAdvancedSearch({ 
  numero_cnj, 
  cliente_cpfcnpj, 
  onResults,
  defaultFilters = {}
}: DocumentAdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    document_types: [],
    statuses: [],
    tags: [],
    file_types: [],
    ...defaultFilters,
  });
  
  const [sort, setSort] = useState<SortOptions>({
    field: "created_at",
    direction: "desc",
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Query para buscar documentos
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["sf8-search", filters, sort, numero_cnj, cliente_cpfcnpj],
    queryFn: async () => {
      // Se há query de texto, usar busca full-text
      if (filters.query.trim()) {
        const { data, error } = await lf.rpc("sf8_search_documents", {
          p_search_query: filters.query,
          p_numero_cnj: numero_cnj || null,
          p_document_types: filters.document_types.length > 0 ? filters.document_types : null,
          p_limit: 100,
        });
        if (error) throw error;
        return data || [];
      }
      
      // Caso contrário, usar listagem com filtros
      const { data, error } = await lf.rpc("sf8_list_documents", {
        p_numero_cnj: numero_cnj || null,
        p_cliente_cpfcnpj: cliente_cpfcnpj || null,
        p_document_type: filters.document_types.length === 1 ? filters.document_types[0] : null,
        p_status: filters.statuses.length === 1 ? filters.statuses[0] : null,
        p_search_query: null,
        p_tags: filters.tags.length > 0 ? filters.tags : null,
        p_limit: 100,
      });
      if (error) throw error;
      
      let results = data || [];
      
      // Aplicar filtros adicionais no cliente
      if (filters.document_types.length > 1) {
        results = results.filter(doc => filters.document_types.includes(doc.document_type));
      }
      
      if (filters.statuses.length > 1) {
        results = results.filter(doc => filters.statuses.includes(doc.status));
      }
      
      if (filters.file_types.length > 0) {
        results = results.filter(doc => 
          doc.file_type && filters.file_types.includes(doc.file_type)
        );
      }
      
      if (filters.date_from) {
        results = results.filter(doc => 
          new Date(doc.created_at) >= new Date(filters.date_from!)
        );
      }
      
      if (filters.date_to) {
        results = results.filter(doc => 
          new Date(doc.created_at) <= new Date(filters.date_to!)
        );
      }
      
      if (filters.min_size) {
        results = results.filter(doc => 
          doc.file_size && doc.file_size >= filters.min_size!
        );
      }
      
      if (filters.max_size) {
        results = results.filter(doc => 
          doc.file_size && doc.file_size <= filters.max_size!
        );
      }
      
      // Aplicar ordenação
      results.sort((a, b) => {
        let comparison = 0;
        
        switch (sort.field) {
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "file_size":
            comparison = (a.file_size || 0) - (b.file_size || 0);
            break;
          case "relevance":
            comparison = (a.relevance || 0) - (b.relevance || 0);
            break;
          case "created_at":
          default:
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }
        
        return sort.direction === "desc" ? -comparison : comparison;
      });
      
      return results;
    },
    enabled: true,
  });

  // Sempre chamar onResults quando os resultados mudarem
  React.useEffect(() => {
    if (searchResults) {
      onResults(searchResults);
    }
  }, [searchResults, onResults]);

  // Query para sugestões de tags
  const { data: availableTags } = useQuery({
    queryKey: ["sf8-available-tags", numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from("documents")
        .select("tags")
        .not("tags", "eq", "[]");
        
      if (error) throw error;
      
      const allTags = new Set<string>();
      data.forEach(doc => {
        if (doc.tags) {
          doc.tags.forEach((tag: string) => allTags.add(tag));
        }
      });
      
      return Array.from(allTags).sort();
    },
  });

  const updateFilters = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      document_types: [],
      statuses: [],
      tags: [],
      file_types: [],
    });
  };

  const hasActiveFilters = () => {
    return filters.query || 
           filters.document_types.length > 0 ||
           filters.statuses.length > 0 ||
           filters.tags.length > 0 ||
           filters.file_types.length > 0 ||
           filters.date_from ||
           filters.date_to ||
           filters.min_size ||
           filters.max_size;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Busca Avançada
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {sort.direction === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  Ordenar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Label>Ordenar por</Label>
                  <Select 
                    value={sort.field} 
                    onValueChange={(value: any) => setSort(prev => ({ ...prev, field: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Data de criação</SelectItem>
                      <SelectItem value="title">Título</SelectItem>
                      <SelectItem value="file_size">Tamanho</SelectItem>
                      {filters.query && (
                        <SelectItem value="relevance">Relevância</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="desc"
                      checked={sort.direction === "desc"}
                      onCheckedChange={(checked) => 
                        setSort(prev => ({ 
                          ...prev, 
                          direction: checked ? "desc" : "asc" 
                        }))
                      }
                    />
                    <Label htmlFor="desc">Decrescente</Label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Busca principal */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Buscar em títulos, descrições e conteúdo..."
              value={filters.query}
              onChange={(e) => updateFilters("query", e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={showAdvanced ? "bg-neutral-100" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          
          {hasActiveFilters() && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {/* Filtros ativos */}
        {hasActiveFilters() && (
          <div className="flex flex-wrap gap-2">
            {filters.document_types.map(type => (
              <Badge key={type} variant="secondary" className="cursor-pointer">
                {DOCUMENT_TYPES.find(t => t.value === type)?.label}
                <X 
                  className="w-3 h-3 ml-1" 
                  onClick={() => toggleArrayFilter("document_types", type)}
                />
              </Badge>
            ))}
            
            {filters.statuses.map(status => (
              <Badge key={status} variant="secondary" className="cursor-pointer">
                {STATUS_OPTIONS.find(s => s.value === status)?.label}
                <X 
                  className="w-3 h-3 ml-1" 
                  onClick={() => toggleArrayFilter("statuses", status)}
                />
              </Badge>
            ))}
            
            {filters.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="cursor-pointer">
                #{tag}
                <X 
                  className="w-3 h-3 ml-1" 
                  onClick={() => toggleArrayFilter("tags", tag)}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* Painel de filtros avançados */}
        {showAdvanced && (
          <div className="border rounded-lg p-4 bg-neutral-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tipos de documento */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tipos de Documento</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {DOCUMENT_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={filters.document_types.includes(type.value)}
                        onCheckedChange={() => toggleArrayFilter("document_types", type.value)}
                      />
                      <Label htmlFor={`type-${type.value}`} className="text-sm">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map(status => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.statuses.includes(status.value)}
                        onCheckedChange={() => toggleArrayFilter("statuses", status.value)}
                      />
                      <Label htmlFor={`status-${status.value}`} className="text-sm">
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tags</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableTags?.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={() => toggleArrayFilter("tags", tag)}
                      />
                      <Label htmlFor={`tag-${tag}`} className="text-sm">
                        #{tag}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Período de data */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Período</Label>
                <div className="space-y-2">
                  <Input
                    type="date"
                    placeholder="Data inicial"
                    value={filters.date_from || ""}
                    onChange={(e) => updateFilters("date_from", e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Data final"
                    value={filters.date_to || ""}
                    onChange={(e) => updateFilters("date_to", e.target.value)}
                  />
                </div>
              </div>

              {/* Tamanho do arquivo */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tamanho do Arquivo</Label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Tamanho mínimo (bytes)"
                    value={filters.min_size || ""}
                    onChange={(e) => updateFilters("min_size", e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="Tamanho máximo (bytes)"
                    value={filters.max_size || ""}
                    onChange={(e) => updateFilters("max_size", e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-neutral-600">
              {isLoading ? (
                "Buscando..."
              ) : (
                `${searchResults?.length || 0} documento(s) encontrado(s)`
              )}
            </div>
          </div>
          
          {/* Os resultados serão exibidos pelo componente pai */}
        </div>
      </CardContent>
    </Card>
  );
}
