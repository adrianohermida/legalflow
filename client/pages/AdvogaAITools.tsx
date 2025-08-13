import React, { useState } from 'react';
import { AdvogaAIToolsPanel } from '../components/AdvogaAIToolsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Zap, 
  History, 
  Settings, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye
} from 'lucide-react';
import { ToolResponse } from '../lib/advogaai-tools';
import { useToast } from '../hooks/use-toast';

interface ToolExecution {
  id: string;
  tool_name: string;
  executed_at: string;
  execution_time: number;
  success: boolean;
  result?: any;
  error?: string;
}

export function AdvogaAITools() {
  const [executionHistory, setExecutionHistory] = useState<ToolExecution[]>([]);
  const [selectedResult, setSelectedResult] = useState<ToolExecution | null>(null);
  
  const { toast } = useToast();

  const handleToolResult = (result: ToolResponse) => {
    const execution: ToolExecution = {
      id: Date.now().toString(),
      tool_name: 'Ferramenta AdvogaAI', // TODO: Get actual tool name
      executed_at: new Date().toISOString(),
      execution_time: result.execution_time || 0,
      success: result.success,
      result: result.data,
      error: result.error
    };
    
    setExecutionHistory(prev => [execution, ...prev]);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Resultado copiado para a área de transferência",
    });
  };

  const exportResult = (execution: ToolExecution) => {
    const dataStr = JSON.stringify(execution, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `advogaai_result_${execution.id}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand-600" />
            AdvogaAI Tools
          </h1>
          <p className="text-neutral-600 mt-1">
            Suite completa de ferramentas de IA para advocacia moderna
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            API v1 Ativa
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="tools" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <AdvogaAIToolsPanel onToolResult={handleToolResult} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {executionHistory.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <History className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 mb-2">
                  Nenhuma execução registrada
                </h3>
                <p className="text-neutral-500">
                  Execute uma ferramenta para ver o histórico aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {executionHistory.map((execution) => (
                <Card key={execution.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{execution.tool_name}</CardTitle>
                        <Badge 
                          variant={execution.success ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {execution.success ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Sucesso
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Erro
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <Clock className="w-3 h-3" />
                        {execution.execution_time}ms
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-600">
                        {formatDateTime(execution.executed_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedResult(execution)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                        {execution.success && execution.result && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(JSON.stringify(execution.result, null, 2))}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportResult(execution)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Exportar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {execution.error && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {execution.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações da API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Status da Conexão</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Conectado à API AdvogaAI v1</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Informações da API</h4>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <div>Endpoint: {import.meta.env.VITE_ADVOGAAI_TOOLS_URL || 'https://api.advogaai.com/v1'}</div>
                    <div>Versão: 1.0.0</div>
                    <div>Ferramentas disponíveis: 6</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Estatísticas de Uso</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-lg text-center">
                      <div className="text-lg font-semibold text-brand-600">
                        {executionHistory.length}
                      </div>
                      <div className="text-xs text-neutral-600">Total de Execuções</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {executionHistory.filter(e => e.success).length}
                      </div>
                      <div className="text-xs text-neutral-600">Execuções com Sucesso</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {selectedResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  Resultado da Execução
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setSelectedResult(null)}
                >
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Ferramenta:</strong> {selectedResult.tool_name}
                  </div>
                  <div>
                    <strong>Executado em:</strong> {formatDateTime(selectedResult.executed_at)}
                  </div>
                  <div>
                    <strong>Tempo de execução:</strong> {selectedResult.execution_time}ms
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedResult.success ? 'Sucesso' : 'Erro'}
                  </div>
                </div>
                
                {selectedResult.success && selectedResult.result && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Resultado:</h4>
                    <pre className="bg-neutral-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(selectedResult.result, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedResult.error && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600">Erro:</h4>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-red-700">
                      {selectedResult.error}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
