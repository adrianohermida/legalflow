import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'pending' | 'running';
  message?: string;
  details?: any;
}

const AdminIntegrity = () => {
  const [results, setResults] = useState<StepResult[]>([
    { step: 'Foreign Keys', status: 'pending' },
    { step: 'Índices de Performance', status: 'pending' },
    { step: 'Views de Validação', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateStepStatus = (stepIndex: number, status: StepResult['status'], message?: string, details?: any) => {
    setResults(prev => prev.map((result, index) => 
      index === stepIndex 
        ? { ...result, status, message, details }
        : result
    ));
  };

  const executeStep = async (stepNumber: number, endpoint: string, stepIndex: number) => {
    updateStepStatus(stepIndex, 'running', 'Executando...');
    
    try {
      const response = await fetch(`/.netlify/functions/integrity-step${stepNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        updateStepStatus(stepIndex, 'success', data.message, data.results);
      } else {
        updateStepStatus(stepIndex, 'error', data.error || 'Erro desconhecido', data.details);
      }
    } catch (error) {
      updateStepStatus(stepIndex, 'error', 'Erro de conexão', error);
    }
  };

  const executeAllSteps = async () => {
    setIsRunning(true);
    
    try {
      // Step 1: Foreign Keys
      await executeStep(1, 'integrity-step1', 0);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo

      // Step 2: Índices
      await executeStep(2, 'integrity-step2', 1);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo

      // Step 3: Views
      await executeStep(3, 'integrity-step3', 2);
      
    } catch (error) {
      console.error('Erro durante execução:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Executando</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          🔧 Correções de Integridade do Banco
        </h1>
        <p className="text-gray-600 mt-2">
          Execute as correções de integridade identificadas na auditoria do sistema
        </p>
      </div>

      <div className="grid gap-6">
        {/* Painel de Controle */}
        <Card>
          <CardHeader>
            <CardTitle>Painel de Controle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={executeAllSteps}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  'Executar Todas as Correções'
                )}
              </Button>

              {!isRunning && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => executeStep(1, 'integrity-step1', 0)}
                    disabled={results[0].status === 'running'}
                  >
                    Step 1 apenas
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => executeStep(2, 'integrity-step2', 1)}
                    disabled={results[1].status === 'running'}
                  >
                    Step 2 apenas
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => executeStep(3, 'integrity-step3', 2)}
                    disabled={results[2].status === 'running'}
                  >
                    Step 3 apenas
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultados dos Steps */}
        <div className="grid gap-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    Step {index + 1}: {result.step}
                  </CardTitle>
                  {getStatusBadge(result.status)}
                </div>
              </CardHeader>
              <CardContent>
                {result.message && (
                  <p className="text-sm text-gray-600 mb-3">
                    {result.message}
                  </p>
                )}

                {result.details && Array.isArray(result.details) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalhes:</h4>
                    <div className="grid gap-2">
                      {result.details.map((detail: any, detailIndex: number) => (
                        <div 
                          key={detailIndex}
                          className={`p-2 rounded text-xs border ${
                            detail.status === 'success' 
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {detail.step || detail.index || detail.name}
                            </span>
                            <Badge 
                              variant={detail.status === 'success' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {detail.status}
                            </Badge>
                          </div>
                          {detail.error && (
                            <p className="mt-1 text-xs opacity-80">
                              {detail.error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>ℹ️ Informações sobre as Correções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Step 1 - Foreign Keys</h4>
              <p className="text-sm text-gray-600">
                Adiciona constraints de chaves estrangeiras ausentes para garantir integridade referencial
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Step 2 - Índices de Performance</h4>
              <p className="text-sm text-gray-600">
                Cria índices compostos e de texto para otimizar queries frequentes
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Step 3 - Views de Validação</h4>
              <p className="text-sm text-gray-600">
                Cria views e funções para monitoramento contínuo da integridade dos dados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminIntegrity;
