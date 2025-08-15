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
  RefreshCw,
  FileText,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface SchemaStatus {
  schema: string;
  functions_tested: string[];
  functions_found: string[];
  functions_missing: string[];
  installation_complete: boolean;
  error?: string;
}

interface VerificationResult {
  success: boolean;
  schemas: SchemaStatus[];
  overall_status: "complete" | "partial" | "missing";
  recommended_files: string[];
}

export function SchemaVerificationHelper() {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const { toast } = useToast();

  // Lista de funções que devem existir para cada schema
  const SCHEMA_FUNCTIONS = {
    "SF-6": [
      "sf6_verify_installation",
      "sf6_get_bridge_statistics",
      "sf6_auto_create_activity_for_completed_task",
      "sf6_process_existing_completed_tasks",
      "sf6_cleanup_test_data",
    ],
    "SF-2": [
      "sf2_create_process_chat_thread",
      "sf2_get_process_threads",
      "sf2_get_thread_messages",
      "sf2_add_thread_message",
      "sf2_quick_action_create_task",
      "sf2_create_sample_data",
    ],
    "SF-7": [
      "sf7_verify_installation",
      "sf7_list_eventos_periodo",
      "sf7_create_evento_rapido",
      "sf7_eventos_proximos",
      "sf7_update_evento",
    ],
  };

  const verifyAllSchemas = useMutation({
    mutationFn: async (): Promise<VerificationResult> => {
      const results: SchemaStatus[] = [];
      let recommendedFiles: string[] = [];

      // Testar cada schema
      for (const [schemaName, functions] of Object.entries(SCHEMA_FUNCTIONS)) {
        const schemaResult: SchemaStatus = {
          schema: schemaName,
          functions_tested: functions,
          functions_found: [],
          functions_missing: [],
          installation_complete: false,
        };

        // Testar cada função do schema
        for (const functionName of functions) {
          try {
            const { error } = await lf.rpc(functionName as any);
            
            // Se não houve erro de "função não existe", a função está disponível
            if (!error || !error.message?.includes("does not exist")) {
              schemaResult.functions_found.push(functionName);
            } else {
              schemaResult.functions_missing.push(functionName);
            }
          } catch (err: any) {
            // Se erro é sobre função não existir, adicionar como missing
            if (err.message?.includes("does not exist") || err.message?.includes("function")) {
              schemaResult.functions_missing.push(functionName);
            } else {
              // Outros erros indicam que a função existe mas falhou na execução
              schemaResult.functions_found.push(functionName);
            }
          }
        }

        // Determinar se instalação está completa
        schemaResult.installation_complete = schemaResult.functions_missing.length === 0;

        // Recomendar arquivo se há funções faltando
        if (schemaResult.functions_missing.length > 0) {
          const fileMap = {
            "SF-6": "SF6_SUPABASE_RPC_FIXED.sql",
            "SF-2": "SF2_CHAT_MULTITHREAD_RPC_FIXED.sql", 
            "SF-7": "SF7_AGENDA_RPC_FIXED.sql",
          };
          recommendedFiles.push(fileMap[schemaName as keyof typeof fileMap]);
        }

        results.push(schemaResult);
      }

      // Determinar status geral
      const completeSchemas = results.filter(r => r.installation_complete).length;
      const totalSchemas = results.length;
      
      let overall_status: "complete" | "partial" | "missing";
      if (completeSchemas === totalSchemas) {
        overall_status = "complete";
      } else if (completeSchemas > 0) {
        overall_status = "partial";
      } else {
        overall_status = "missing";
      }

      return {
        success: true,
        schemas: results,
        overall_status,
        recommended_files: recommendedFiles,
      };
    },
    onSuccess: (result) => {
      setVerificationResult(result);
      
      const completeCount = result.schemas.filter(s => s.installation_complete).length;
      const totalCount = result.schemas.length;
      
      toast({
        title: "Verificação de Schemas Concluída",
        description: `${completeCount}/${totalCount} schemas instalados corretamente`,
        variant: result.overall_status === "complete" ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Verificação",
        description: error.message || "Falha ao verificar os schemas",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: SchemaStatus) => {
    if (status.installation_complete) return "bg-green-100 text-green-700";
    if (status.functions_found.length > 0) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getStatusIcon = (status: SchemaStatus) => {
    if (status.installation_complete) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Diagnóstico Completo de Schemas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-600">
          Verifica se todos os schemas (SF-6, SF-2, SF-7) estão instalados corretamente e identifica quais arquivos SQL precisam ser executados.
        </p>

        <Button
          onClick={() => verifyAllSchemas.mutate()}
          disabled={verifyAllSchemas.isPending}
          className="w-full"
          style={{ backgroundColor: "var(--brand-700)", color: "white" }}
        >
          {verifyAllSchemas.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Verificar Todos os Schemas
        </Button>

        {verificationResult && (
          <div className="space-y-4">
            {/* Status Geral */}
            <Alert>
              <div className="flex items-center gap-2">
                {verificationResult.overall_status === "complete" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Status Geral:</strong>{" "}
                      {verificationResult.overall_status === "complete" && "✅ Todos os schemas instalados"}
                      {verificationResult.overall_status === "partial" && "⚠️ Instalação parcial"}
                      {verificationResult.overall_status === "missing" && "❌ Schemas não instalados"}
                    </p>
                    
                    {verificationResult.recommended_files.length > 0 && (
                      <div>
                        <p><strong>Arquivos a executar:</strong></p>
                        <ul className="list-disc pl-4">
                          {verificationResult.recommended_files.map((file, idx) => (
                            <li key={idx}>
                              <code className="bg-orange-100 px-1 rounded text-xs">{file}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>

            {/* Detalhes por Schema */}
            <div className="space-y-3">
              <h4 className="font-medium">Detalhes por Schema:</h4>
              {verificationResult.schemas.map((schema, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(schema)}
                      <span className="font-medium">{schema.schema}</span>
                    </div>
                    <Badge className={getStatusColor(schema)}>
                      {schema.functions_found.length}/{schema.functions_tested.length} funções
                    </Badge>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    {schema.functions_found.length > 0 && (
                      <div>
                        <span className="text-green-600">✅ Encontradas:</span>{" "}
                        <span className="text-green-700">
                          {schema.functions_found.join(", ")}
                        </span>
                      </div>
                    )}
                    
                    {schema.functions_missing.length > 0 && (
                      <div>
                        <span className="text-red-600">❌ Faltando:</span>{" "}
                        <span className="text-red-700">
                          {schema.functions_missing.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Próximos Passos */}
            {verificationResult.overall_status !== "complete" && (
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Próximos passos:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1 text-sm">
                      <li>Baixe os arquivos SQL recomendados acima</li>
                      <li>Abra o Supabase SQL Editor</li>
                      <li>Execute cada arquivo SQL na ordem</li>
                      <li>Volte aqui e execute a verificação novamente</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
