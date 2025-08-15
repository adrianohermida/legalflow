import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Database,
  Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface DiagnosticResult {
  success: boolean;
  functions?: string[];
  error?: string;
  details?: any;
}

export function SchemaDiagnostics() {
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to test if a specific RPC function exists
  const testFunction = async (functionName: string): Promise<DiagnosticResult> => {
    try {
      const { data, error } = await lf.rpc(functionName as any);
      
      if (error) {
        // If error mentions function doesn't exist, that's our answer
        if (error.message?.includes("function") && error.message?.includes("does not exist")) {
          return {
            success: false,
            error: `Função ${functionName} não existe`,
            details: error
          };
        }
        // If it's a different error, the function exists but failed for another reason
        return {
          success: true,
          error: `Função ${functionName} existe mas falhou: ${error.message}`,
          details: error
        };
      }
      
      return {
        success: true,
        details: data
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        details: err
      };
    }
  };

  // Test SF-6 functions
  const testSF6 = async (): Promise<DiagnosticResult> => {
    const functions = [
      'sf6_verify_installation',
      'sf6_get_bridge_statistics', 
      'sf6_auto_create_activity_for_completed_task',
      'sf6_process_existing_completed_tasks',
      'sf6_cleanup_test_data'
    ];

    const results = [];
    for (const func of functions) {
      const result = await testFunction(func);
      results.push({ function: func, ...result });
    }

    const existingFunctions = results.filter(r => r.success).map(r => r.function);
    const missingFunctions = results.filter(r => !r.success).map(r => r.function);

    return {
      success: existingFunctions.length > 0,
      functions: existingFunctions,
      error: missingFunctions.length > 0 ? `Funções não encontradas: ${missingFunctions.join(', ')}` : undefined,
      details: results
    };
  };

  // Test SF-2 functions
  const testSF2 = async (): Promise<DiagnosticResult> => {
    const functions = [
      'sf2_create_sample_data',
      'sf2_create_process_chat_thread',
      'sf2_get_process_threads',
      'sf2_get_thread_messages',
      'sf2_add_thread_message',
      'sf2_quick_action_create_task'
    ];

    const results = [];
    for (const func of functions) {
      const result = await testFunction(func);
      results.push({ function: func, ...result });
    }

    const existingFunctions = results.filter(r => r.success).map(r => r.function);
    const missingFunctions = results.filter(r => !r.success).map(r => r.function);

    return {
      success: existingFunctions.length > 0,
      functions: existingFunctions,
      error: missingFunctions.length > 0 ? `Funções não encontradas: ${missingFunctions.join(', ')}` : undefined,
      details: results
    };
  };

  // Test SF-7 functions
  const testSF7 = async (): Promise<DiagnosticResult> => {
    const functions = [
      'sf7_verify_installation',
      'sf7_list_eventos_periodo',
      'sf7_create_evento_rapido',
      'sf7_eventos_proximos',
      'sf7_update_evento'
    ];

    const results = [];
    for (const func of functions) {
      const result = await testFunction(func);
      results.push({ function: func, ...result });
    }

    const existingFunctions = results.filter(r => r.success).map(r => r.function);
    const missingFunctions = results.filter(r => !r.success).map(r => r.function);

    return {
      success: existingFunctions.length > 0,
      functions: existingFunctions,
      error: missingFunctions.length > 0 ? `Funções não encontradas: ${missingFunctions.join(', ')}` : undefined,
      details: results
    };
  };

  // Query for available PostgreSQL functions
  const { data: availableFunctions, isLoading: isLoadingFunctions } = useQuery({
    queryKey: ["available-functions"],
    queryFn: async () => {
      const detectedFunctions: string[] = [];

      // Test common SF functions to see which ones exist
      const functionsToTest = [
        'sf6_verify_installation',
        'sf6_get_bridge_statistics',
        'sf2_create_sample_data',
        'sf2_create_process_chat_thread',
        'sf7_verify_installation',
        'sf7_create_evento_rapido'
      ];

      for (const funcName of functionsToTest) {
        try {
          const { error } = await lf.rpc(funcName as any);
          // If no "function does not exist" error, the function exists
          if (!error || !error.message?.includes("does not exist")) {
            detectedFunctions.push(funcName);
          }
        } catch (err: any) {
          // If error doesn't mention "does not exist", function exists
          if (!err.message?.includes("does not exist")) {
            detectedFunctions.push(funcName);
          }
        }
      }

      return detectedFunctions;
    },
  });

  const diagnosticTests = [
    {
      id: 'sf6',
      name: 'SF-6: Bridge Activities ↔ Tickets',
      test: testSF6,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      id: 'sf2', 
      name: 'SF-2: Chat Multi-thread',
      test: testSF2,
      color: 'bg-green-100 text-green-700'
    },
    {
      id: 'sf7',
      name: 'SF-7: Agenda TZ São Paulo', 
      test: testSF7,
      color: 'bg-purple-100 text-purple-700'
    }
  ];

  const runDiagnostic = async (testId: string, testFunction: () => Promise<DiagnosticResult>) => {
    setActiveTest(testId);
    try {
      const result = await testFunction();
      
      toast({
        title: `Diagnóstico ${testId.toUpperCase()}`,
        description: result.success 
          ? `✅ ${result.functions?.length || 0} funções encontradas`
          : `❌ ${result.error}`,
        variant: result.success ? "default" : "destructive"
      });

      console.log(`Resultado ${testId.toUpperCase()}:`, result);
    } catch (error: any) {
      toast({
        title: `Erro no diagnóstico ${testId.toUpperCase()}`,
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setActiveTest(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Diagnóstico de Schemas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Diagnóstico das instalações SQL:</strong></p>
                <p>Este painel testa se as funções RPC dos schemas estão acessíveis no banco de dados.</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Available Functions */}
          {availableFunctions && availableFunctions.length > 0 && (
            <div className="p-3 bg-neutral-50 rounded-lg">
              <h4 className="font-medium mb-2">Funções SF* Disponíveis:</h4>
              <div className="flex flex-wrap gap-1">
                {availableFunctions.map((func, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {func}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Tests */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {diagnosticTests.map((test) => (
              <Card key={test.id} className="border-2">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                    </div>
                    <Button
                      onClick={() => runDiagnostic(test.id, test.test)}
                      disabled={activeTest === test.id}
                      className="w-full"
                      variant="outline"
                    >
                      {activeTest === test.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Testar {test.id.toUpperCase()}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-xs text-neutral-500 space-y-1">
            <p><strong>Como interpretar os resultados:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>✅ <strong>Função encontrada:</strong> A função RPC existe e está acessível</li>
              <li>❌ <strong>Função não encontrada:</strong> A função RPC não existe ou não está acessível</li>
              <li>⚠️ <strong>Função existe mas falhou:</strong> A função existe mas retornou erro (normal em testes)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
