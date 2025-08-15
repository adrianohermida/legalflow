/**
 * Global Search Palette - Flow B1
 * Busca global (Cmd/Ctrl-K) com bindings:
 * - processos(numero_cnj)
 * - clientes(cpfcnpj|nome)
 * - publicacoes
 * - movimentacoes
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; // public schema
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import {
  Search,
  FileText,
  Users,
  Inbox,
  Activity,
  ArrowRight,
  Clock,
  Calendar,
  DollarSign,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface GlobalSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "advogado" | "cliente";
}

interface SearchResult {
  id: string;
  type: "processo" | "cliente" | "publicacao" | "movimentacao";
  title: string;
  subtitle: string;
  description?: string;
  href: string;
  icon: React.ComponentType<any>;
  metadata?: {
    [key: string]: any;
  };
}

interface SearchCategory {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  placeholder: string;
}

const searchCategories: SearchCategory[] = [
  {
    key: "processos",
    label: "Processos",
    icon: FileText,
    placeholder: "Buscar por número CNJ...",
  },
  {
    key: "clientes",
    label: "Clientes",
    icon: Users,
    placeholder: "Buscar por CPF/CNPJ ou nome...",
  },
  {
    key: "publicacoes",
    label: "Publicações",
    icon: Inbox,
    placeholder: "Buscar em publicações...",
  },
  {
    key: "movimentacoes",
    label: "Movimentações",
    icon: Activity,
    placeholder: "Buscar movimentações...",
  },
];

export function GlobalSearchPalette({
  isOpen,
  onClose,
  userType,
}: GlobalSearchPaletteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("processos");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setResults([]);
      setSelectedIndex(0);
      setSelectedCategory("processos");
    }
  }, [isOpen]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (term: string, category: string) => {
      if (!term.trim() || term.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await performSearch(term, category);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Erro na busca:", error);
        toast({
          title: "Erro na Busca",
          description: "Ocorreu um erro ao realizar a busca. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [],
  );

  // Trigger search when term or category changes
  useEffect(() => {
    debouncedSearch(searchTerm, selectedCategory);
  }, [searchTerm, selectedCategory, debouncedSearch]);

  // Perform search based on category and bindings
  const performSearch = async (
    term: string,
    category: string,
  ): Promise<SearchResult[]> => {
    const searchResults: SearchResult[] = [];

    try {
      switch (category) {
        case "processos":
          // Search processos by numero_cnj
          const { data: processos, error: processosError } = await supabase
            .from("processos")
            .select(
              "numero_cnj, titulo_polo_ativo, titulo_polo_passivo, tribunal_sigla, created_at",
            )
            .or(`numero_cnj.ilike.%${term}%`)
            .limit(10);

          if (!processosError && processos) {
            processos.forEach((processo) => {
              searchResults.push({
                id: `processo-${processo.numero_cnj}`,
                type: "processo",
                title: processo.numero_cnj,
                subtitle: `${processo.titulo_polo_ativo} vs ${processo.titulo_polo_passivo}`,
                description: processo.tribunal_sigla,
                href: `/processos-v2/${encodeURIComponent(processo.numero_cnj)}`,
                icon: FileText,
                metadata: {
                  tribunal: processo.tribunal_sigla,
                  created_at: processo.created_at,
                },
              });
            });
          }
          break;

        case "clientes":
          // Search clientes by cpfcnpj or nome
          const { data: clientes, error: clientesError } = await supabase
            .from("clientes")
            .select("cpfcnpj, nome, whatsapp, created_at")
            .or(`cpfcnpj.ilike.%${term}%, nome.ilike.%${term}%`)
            .limit(10);

          if (!clientesError && clientes) {
            clientes.forEach((cliente) => {
              searchResults.push({
                id: `cliente-${cliente.cpfcnpj}`,
                type: "cliente",
                title: cliente.nome || "Cliente sem nome",
                subtitle: cliente.cpfcnpj,
                description: cliente.whatsapp
                  ? `WhatsApp: ${cliente.whatsapp}`
                  : undefined,
                href: `/clientes?search=${encodeURIComponent(cliente.cpfcnpj)}`,
                icon: Users,
                metadata: {
                  cpfcnpj: cliente.cpfcnpj,
                  whatsapp: cliente.whatsapp,
                  created_at: cliente.created_at,
                },
              });
            });
          }
          break;

        case "publicacoes":
          // Search publicacoes
          const { data: publicacoes, error: publicacoesError } = await supabase
            .from("publicacoes")
            .select("id, numero_cnj, data_publicacao, created_at")
            .or(`numero_cnj.ilike.%${term}%`)
            .order("data_publicacao", { ascending: false })
            .limit(10);

          if (!publicacoesError && publicacoes) {
            publicacoes.forEach((publicacao) => {
              const dataPublicacao = publicacao.data_publicacao
                ? new Date(publicacao.data_publicacao).toLocaleDateString()
                : "Data não informada";

              searchResults.push({
                id: `publicacao-${publicacao.id}`,
                type: "publicacao",
                title: `Publicação - ${publicacao.numero_cnj || "CNJ não informado"}`,
                subtitle: `Publicado em ${dataPublicacao}`,
                description: publicacao.numero_cnj
                  ? `Processo: ${publicacao.numero_cnj}`
                  : undefined,
                href: `/inbox-v2?search=${encodeURIComponent(term)}`,
                icon: Inbox,
                metadata: {
                  numero_cnj: publicacao.numero_cnj,
                  data_publicacao: publicacao.data_publicacao,
                  created_at: publicacao.created_at,
                },
              });
            });
          }
          break;

        case "movimentacoes":
          // Search movimentacoes
          const { data: movimentacoes, error: movimentacoesError } =
            await supabase
              .from("movimentacoes")
              .select("id, numero_cnj, data_movimentacao, created_at")
              .or(`numero_cnj.ilike.%${term}%`)
              .order("data_movimentacao", { ascending: false })
              .limit(10);

          if (!movimentacoesError && movimentacoes) {
            movimentacoes.forEach((movimentacao) => {
              const dataMovimentacao = movimentacao.data_movimentacao
                ? new Date(movimentacao.data_movimentacao).toLocaleDateString()
                : "Data não informada";

              searchResults.push({
                id: `movimentacao-${movimentacao.id}`,
                type: "movimentacao",
                title: `Movimentação - ${movimentacao.numero_cnj || "CNJ não informado"}`,
                subtitle: `Movimentação em ${dataMovimentacao}`,
                description: movimentacao.numero_cnj
                  ? `Processo: ${movimentacao.numero_cnj}`
                  : undefined,
                href: `/processos-v2/${encodeURIComponent(movimentacao.numero_cnj || "")}`,
                icon: Activity,
                metadata: {
                  numero_cnj: movimentacao.numero_cnj,
                  data_movimentacao: movimentacao.data_movimentacao,
                  created_at: movimentacao.created_at,
                },
              });
            });
          }
          break;
      }
    } catch (error) {
      console.error(`Erro na busca de ${category}:`, error);
    }

    return searchResults;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "Tab":
        e.preventDefault();
        const currentIndex = searchCategories.findIndex(
          (cat) => cat.key === selectedCategory,
        );
        const nextIndex = (currentIndex + 1) % searchCategories.length;
        setSelectedCategory(searchCategories[nextIndex].key);
        break;
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    onClose();
  };

  // Get current category info
  const currentCategory = searchCategories.find(
    (cat) => cat.key === selectedCategory,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mt-24 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center p-4 border-b">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentCategory?.placeholder || "Buscar..."}
            className="flex-1 border-0 focus:ring-0 text-lg"
          />
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b">
          {searchCategories.map((category) => {
            const Icon = category.icon;
            const isActive = category.key === selectedCategory;

            return (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={cn(
                  "flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-brand-700 text-brand-700 bg-brand-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-700 mr-2" />
              <span className="text-gray-600">Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => {
                const Icon = result.icon;
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "flex items-center px-4 py-3 cursor-pointer transition-colors",
                      isSelected
                        ? "bg-brand-50 border-r-2 border-brand-700"
                        : "hover:bg-gray-50",
                    )}
                  >
                    <Icon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {result.title}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {result.subtitle}
                      </div>
                      {result.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {result.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {result.type}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Search className="w-8 h-8 mb-2" />
              <p>Nenhum resultado encontrado</p>
              <p className="text-sm">Tente buscar por outros termos</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Search className="w-8 h-8 mb-2" />
              <p>Digite pelo menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 text-xs text-gray-500 border-t">
          <div className="flex items-center space-x-4">
            <span>↓↑ Navegar</span>
            <span>↵ Abrir</span>
            <span>Tab Alternar categoria</span>
          </div>
          <span>ESC Fechar</span>
        </div>
      </div>
    </div>
  );
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
