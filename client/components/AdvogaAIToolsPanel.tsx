import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import {
  Brain,
  FileText,
  Calculator,
  Search,
  Clock as TimelineIcon,
  Scale,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { 
  AdvogaAITool, 
  ToolRequest, 
  ToolResponse, 
  advogaAIToolsClient,
  ADVOGAAI_TOOLS 
} from '../lib/advogaai-tools';
import { cn } from '../lib/utils';

interface AdvogaAIToolsPanelProps {
  context?: {
    numero_cnj?: string;
    cliente_cpfcnpj?: string;
    thread_link_id?: string;
  };
  onToolResult?: (result: ToolResponse) => void;
}

export function AdvogaAIToolsPanel({ context, onToolResult }: AdvogaAIToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<AdvogaAITool | null>(null);
  const [toolParameters, setToolParameters] = useState<Record<string, any>>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();

  // P2.12 - Mutation para executar ferramenta
  const executeToolMutation = useMutation({
    mutationFn: async (request: ToolRequest) => {
      return advogaAIToolsClient.executeTool(request);
    },
    onSuccess: (result: ToolResponse) => {
      if (result.success) {
        toast({
          title: "Ferramenta executada com sucesso",
          description: `Tempo de execução: ${result.execution_time}ms`,
        });
        onToolResult?.(result);
        setIsDialogOpen(false);
        setSelectedTool(null);
        setToolParameters({});
      } else {
        toast({
          title: "Erro na execução",
          description: result.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro de comunicação",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'peticion': return <FileText className="w-4 h-4" />;
      case 'analysis': return <Brain className="w-4 h-4" />;
      case 'research': return <Search className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'timeline': return <TimelineIcon className="w-4 h-4" />;
      case 'calculation': return <Calculator className="w-4 h-4" />;
      default: return <Scale className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'peticion': return 'bg-blue-100 text-blue-800';
      case 'analysis': return 'bg-purple-100 text-purple-800';
      case 'research': return 'bg-green-100 text-green-800';
      case 'document': return 'bg-orange-100 text-orange-800';
      case 'timeline': return 'bg-indigo-100 text-indigo-800';
      case 'calculation': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'peticion': return 'Petições';
      case 'analysis': return 'Análise';
      case 'research': return 'Pesquisa';
      case 'document': return 'Documentos';
      case 'timeline': return 'Timeline';
      case 'calculation': return 'Cálculo';
      default: return 'Outros';
    }
  };

  const filteredTools = activeCategory === 'all' 
    ? ADVOGAAI_TOOLS 
    : ADVOGAAI_TOOLS.filter(tool => tool.category === activeCategory);

  const categories = ['all', ...Array.from(new Set(ADVOGAAI_TOOLS.map(t => t.category)))];

  const handleExecuteTool = () => {
    if (!selectedTool) return;

    const request: ToolRequest = {
      tool_id: selectedTool.id,
      parameters: toolParameters,
      context
    };

    executeToolMutation.mutate(request);
  };

  const renderParameterInput = (param: any) => {
    const value = toolParameters[param.name] || '';
    
    const updateParameter = (newValue: any) => {
      setToolParameters(prev => ({
        ...prev,
        [param.name]: newValue
      }));
    };

    if (param.validation?.enum) {
      return (
        <Select
          value={value}
          onValueChange={updateParameter}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Selecione ${param.description}`} />
          </SelectTrigger>
          <SelectContent>
            {param.validation.enum.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    switch (param.type) {
      case 'boolean':
        return (
          <Select
            value={value.toString()}
            onValueChange={(val) => updateParameter(val === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateParameter(parseFloat(e.target.value) || 0)}
            placeholder={param.description}
          />
        );
      
      case 'array':
        return (
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : value}
            onChange={(e) => updateParameter(e.target.value.split('\n').filter(Boolean))}
            placeholder="Um item por linha"
            rows={3}
          />
        );
      
      case 'object':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                updateParameter(JSON.parse(e.target.value));
              } catch {
                updateParameter(e.target.value);
              }
            }}
            placeholder="JSON object"
            rows={4}
          />
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateParameter(e.target.value)}
            placeholder={param.description}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-600" />
            AdvogaAI Tools v1
          </h2>
          <p className="text-neutral-600 text-sm mt-1">
            Ferramentas de IA especializadas para otimizar seu trabalho jurídico
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="flex items-center gap-1"
          >
            {category !== 'all' && getCategoryIcon(category)}
            {category === 'all' ? 'Todas' : getCategoryName(category)}
          </Button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(tool.category)}
                  <CardTitle className="text-sm">{tool.name}</CardTitle>
                </div>
                <Badge className={cn("text-xs", getCategoryColor(tool.category))}>
                  v{tool.version}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-neutral-600 mb-3 line-clamp-2">
                {tool.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <Clock className="w-3 h-3" />
                  {tool.parameters.length} parâmetros
                </div>
                
                <Dialog open={isDialogOpen && selectedTool?.id === tool.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTool(tool);
                        setToolParameters({});
                        // Pré-preencher com contexto
                        if (context?.numero_cnj && tool.parameters.some(p => p.name === 'numero_cnj')) {
                          setToolParameters(prev => ({ ...prev, numero_cnj: context.numero_cnj }));
                        }
                      }}
                      style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Executar
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {getCategoryIcon(tool.category)}
                        {tool.name}
                      </DialogTitle>
                      <p className="text-sm text-neutral-600">{tool.description}</p>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Context Info */}
                      {context && (
                        <div className="p-3 bg-neutral-50 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Contexto Atual</h4>
                          <div className="space-y-1 text-xs">
                            {context.numero_cnj && (
                              <div>Processo: {context.numero_cnj}</div>
                            )}
                            {context.cliente_cpfcnpj && (
                              <div>Cliente: {context.cliente_cpfcnpj}</div>
                            )}
                            {context.thread_link_id && (
                              <div>Conversa: {context.thread_link_id}</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Parameters */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Parâmetros</h4>
                        {tool.parameters.map((param) => (
                          <div key={param.name} className="space-y-2">
                            <Label className="text-xs">
                              {param.name}
                              {param.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <p className="text-xs text-neutral-600">{param.description}</p>
                            {renderParameterInput(param)}
                          </div>
                        ))}
                      </div>
                      
                      {/* Execute Button */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          disabled={executeToolMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleExecuteTool}
                          disabled={executeToolMutation.isPending}
                          style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}
                        >
                          {executeToolMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Executando...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Executar Ferramenta
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-600 mb-2">
            Nenhuma ferramenta encontrada
          </h3>
          <p className="text-neutral-500">
            Não há ferramentas disponíveis para esta categoria.
          </p>
        </div>
      )}
    </div>
  );
}
