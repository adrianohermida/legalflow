import React, { useState, useEffect, useCallback } from "react";
import { Search, FileText, User, Ticket, Calendar } from "lucide-react";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useGlobalSearch } from "../hooks/useOptimizedQueries";
import { debounce } from "lodash";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  category: string;
}

interface OptimizedGlobalSearchProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

const OptimizedGlobalSearch = ({
  onSelect,
  placeholder = "Buscar processos, clientes, contatos...",
  className = "",
}: OptimizedGlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Debounce da query para evitar muitas requisições
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, 300),
    [],
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  const { data: results, isLoading } = useGlobalSearch(debouncedQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 2);
  };

  const handleSelectResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    onSelect?.(result);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "processo":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "cliente":
      case "contact":
        return <User className="h-4 w-4 text-green-600" />;
      case "ticket":
        return <Ticket className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Processo":
        return "bg-blue-100 text-blue-800";
      case "Cliente":
      case "Contato":
        return "bg-green-100 text-green-800";
      case "Ticket":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-2"></div>
                Buscando...
              </div>
            )}

            {!isLoading &&
              results &&
              results.length === 0 &&
              debouncedQuery.length >= 2 && (
                <div className="p-4 text-center text-gray-500">
                  Nenhum resultado encontrado para "{debouncedQuery}"
                </div>
              )}

            {!isLoading && results && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}-${index}`}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectResult(result)}
                  >
                    {getResultIcon(result.type)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {result.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getCategoryColor(result.category)}`}
                        >
                          {result.category}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-500 truncate">
                        {result.type === "processo" && `CNJ: ${result.id}`}
                        {result.type === "cliente" && `CPF/CNPJ: ${result.id}`}
                        {result.type === "contact" && `ID: ${result.id}`}
                        {result.type === "ticket" && `Ticket #${result.id}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {debouncedQuery.length >= 2 && (
              <div className="border-t px-4 py-2 text-xs text-gray-500 bg-gray-50">
                💡 Busca otimizada com índices trigram para melhor performance
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overlay para fechar */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default OptimizedGlobalSearch;
