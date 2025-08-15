/**
 * Start Journey Modal - Flow D3
 * Behavior Goal: 1-click operationalization
 * Modal: Client (CPF/CNPJ) → filter Processes (CNJ); Template; Responsible (OAB); Start
 * RPC: legalflow.start_journey_instance(template_id, cpfcnpj, numero_cnj, oab)
 */

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, User, FileText, UserCheck, Calendar, Play, X, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/use-toast";
import { JourneyTemplate, JourneyInstance } from "../lib/journey-utils";

interface StartJourneyModalD3Props {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate?: JourneyTemplate | null;
  onSuccess?: (instance: JourneyInstance) => void;
}

interface Client {
  id: string;
  name: string;
  cpf_cnpj: string;
  email?: string;
  phone?: string;
  type: 'pessoa_fisica' | 'pessoa_juridica';
}

interface ProcessCase {
  id: string;
  numero_cnj: string;
  titulo: string;
  area: string;
  status: string;
  client_id: string;
  created_at: string;
}

interface Responsible {
  id: string;
  name: string;
  oab: string;
  email: string;
  specialty?: string;
}

export default function StartJourneyModalD3({
  isOpen,
  onClose,
  selectedTemplate,
  onSuccess
}: StartJourneyModalD3Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<ProcessCase | null>(null);
  const [selectedTemplate_internal, setSelectedTemplate_internal] = useState<JourneyTemplate | null>(selectedTemplate || null);
  const [selectedResponsible, setSelectedResponsible] = useState<Responsible | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Search clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients-search", clientSearch],
    queryFn: async () => {
      if (!clientSearch || clientSearch.length < 3) return [];
      
      // Mock data - replace with actual API call
      const mockClients: Client[] = [
        {
          id: "1",
          name: "Tech Solutions Ltda",
          cpf_cnpj: "12.345.678/0001-90",
          email: "contato@techsolutions.com",
          phone: "(11) 99999-9999",
          type: "pessoa_juridica"
        },
        {
          id: "2",
          name: "Maria Santos",
          cpf_cnpj: "987.654.321-00",
          email: "maria@email.com",
          phone: "(11) 88888-8888",
          type: "pessoa_fisica"
        },
        {
          id: "3",
          name: "João Silva Comércio",
          cpf_cnpj: "98.765.432/0001-10",
          email: "joao@comercio.com",
          type: "pessoa_juridica"
        }
      ];

      return mockClients.filter(client => 
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.cpf_cnpj.includes(clientSearch)
      );
    },
    enabled: clientSearch.length >= 3
  });

  // Fetch processes for selected client
  const { data: processes = [], isLoading: processesLoading } = useQuery({
    queryKey: ["client-processes", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      
      // Mock data - replace with actual API call
      const mockProcesses: ProcessCase[] = [
        {
          id: "1",
          numero_cnj: "5001234-56.2024.8.01.0001",
          titulo: "Ação de Cobrança",
          area: "Cível",
          status: "Em andamento",
          client_id: selectedClient.id,
          created_at: "2024-01-15T00:00:00Z"
        },
        {
          id: "2",
          numero_cnj: "5007890-12.2024.5.02.0001",
          titulo: "Reclamação Trabalhista",
          area: "Trabalhista",
          status: "Inicial",
          client_id: selectedClient.id,
          created_at: "2024-01-10T00:00:00Z"
        }
      ];

      return mockProcesses;
    },
    enabled: !!selectedClient
  });

  // Fetch available templates
  const { data: templates = [] } = useQuery({
    queryKey: ["journey-templates"],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockTemplates: JourneyTemplate[] = [
        {
          id: "1",
          name: "Abertura de Empresa",
          description: "Processo completo para abertura de empresa",
          area: "Empresarial",
          category: "Constituição",
          stage_count: 8,
          estimated_duration_days: 45,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
          created_by: "user-1",
          tags: ["empresarial", "abertura", "cnpj"]
        },
        {
          id: "2",
          name: "Processo Trabalhista",
          description: "Fluxo padrão para processos trabalhistas",
          area: "Trabalhista",
          category: "Contencioso",
          stage_count: 12,
          estimated_duration_days: 90,
          is_active: true,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
          created_by: "user-1",
          tags: ["trabalhista", "processo", "tst"]
        }
      ];
      return mockTemplates;
    }
  });

  // Fetch available responsibles
  const { data: responsibles = [] } = useQuery({
    queryKey: ["responsibles"],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockResponsibles: Responsible[] = [
        {
          id: "1",
          name: "Dr. João Silva",
          oab: "SP123456",
          email: "joao@escritorio.com",
          specialty: "Empresarial"
        },
        {
          id: "2",
          name: "Dra. Ana Costa",
          oab: "SP789012",
          email: "ana@escritorio.com",
          specialty: "Trabalhista"
        },
        {
          id: "3",
          name: "Dr. Carlos Santos",
          oab: "SP456789",
          email: "carlos@escritorio.com",
          specialty: "Cível"
        }
      ];
      return mockResponsibles;
    }
  });

  // Start journey mutation
  const startJourneyMutation = useMutation({
    mutationFn: async (data: {
      template_id: string;
      cpf_cnpj: string;
      numero_cnj?: string;
      responsible_oab: string;
      start_date: string;
    }) => {
      // Mock RPC call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newInstance: JourneyInstance = {
        id: `instance-${Date.now()}`,
        template_id: data.template_id,
        template_name: selectedTemplate_internal?.name || "",
        client_cpf_cnpj: data.cpf_cnpj,
        client_name: selectedClient?.name || "",
        numero_cnj: data.numero_cnj,
        responsible_oab: data.responsible_oab,
        responsible_name: selectedResponsible?.name || "",
        status: "active",
        progress_pct: 0,
        next_action: "🚀 Iniciar primeira etapa",
        started_at: data.start_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return newInstance;
    },
    onSuccess: (instance) => {
      toast({
        title: "Jornada iniciada com sucesso!",
        description: `Jornada "${selectedTemplate_internal?.name}" foi iniciada para ${selectedClient?.name}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["journey-instances"] });
      
      if (onSuccess) {
        onSuccess(instance);
      }
      
      handleClose();
    },
    onError: () => {
      toast({
        title: "Erro ao iniciar jornada",
        description: "Ocorreu um erro ao iniciar a jornada. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setClientSearch('');
      setSelectedClient(null);
      setSelectedProcess(null);
      setSelectedTemplate_internal(selectedTemplate || null);
      setSelectedResponsible(null);
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, selectedTemplate]);

  const handleClose = () => {
    onClose();
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleStartJourney = () => {
    if (!selectedClient || !selectedTemplate_internal || !selectedResponsible) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    startJourneyMutation.mutate({
      template_id: selectedTemplate_internal.id,
      cpf_cnpj: selectedClient.cpf_cnpj,
      numero_cnj: selectedProcess?.numero_cnj,
      responsible_oab: selectedResponsible.oab,
      start_date: startDate
    });
  };

  const canProceedStep1 = selectedClient;
  const canProceedStep2 = selectedTemplate_internal;
  const canProceedStep3 = selectedResponsible;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Iniciar Nova Jornada
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-8 h-1 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Client */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">1. Selecionar Cliente</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Busque pelo nome ou CPF/CNPJ do cliente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-search">Buscar Cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-search"
                    placeholder="Digite nome ou CPF/CNPJ..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {clientsLoading && clientSearch.length >= 3 && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}

              {clients.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clients.map((client) => (
                    <Card 
                      key={client.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedClient?.id === client.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedClient(client)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{client.name}</h4>
                            <p className="text-sm text-gray-600">{client.cpf_cnpj}</p>
                            {client.email && (
                              <p className="text-xs text-gray-500">{client.email}</p>
                            )}
                          </div>
                          <Badge variant={client.type === 'pessoa_juridica' ? 'default' : 'secondary'}>
                            {client.type === 'pessoa_juridica' ? 'PJ' : 'PF'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedClient && (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertDescription>
                    Cliente selecionado: <strong>{selectedClient.name}</strong> ({selectedClient.cpf_cnpj})
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 2: Select Process (Optional) and Template */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">2. Processo e Template</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Vincule a jornada a um processo (opcional) e escolha o template
                </p>
              </div>

              {/* Processes */}
              <div className="space-y-2">
                <Label>Processo (Opcional)</Label>
                {processesLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : processes.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <Card 
                      className={`cursor-pointer transition-colors ${
                        !selectedProcess ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedProcess(null)}
                    >
                      <CardContent className="p-3">
                        <span className="text-sm text-gray-600">Não vincular a processo</span>
                      </CardContent>
                    </Card>
                    {processes.map((process) => (
                      <Card 
                        key={process.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedProcess?.id === process.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProcess(process)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-sm">{process.titulo}</h5>
                              <p className="text-xs text-gray-600">{process.numero_cnj}</p>
                            </div>
                            <Badge variant="outline">{process.area}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">Nenhum processo encontrado para este cliente</p>
                )}
              </div>

              <Separator />

              {/* Templates */}
              <div className="space-y-2">
                <Label>Template da Jornada *</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate_internal?.id === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTemplate_internal(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{template.area}</Badge>
                              <span className="text-xs text-gray-500">
                                {template.stage_count} etapas • {template.estimated_duration_days} dias
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Responsible */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">3. Responsável</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Escolha o advogado responsável pela jornada
                </p>
              </div>

              <div className="space-y-2">
                <Label>Advogado Responsável *</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {responsibles.map((responsible) => (
                    <Card 
                      key={responsible.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedResponsible?.id === responsible.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedResponsible(responsible)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{responsible.name}</h4>
                            <p className="text-sm text-gray-600">OAB: {responsible.oab}</p>
                            <p className="text-xs text-gray-500">{responsible.email}</p>
                          </div>
                          {responsible.specialty && (
                            <Badge variant="secondary">{responsible.specialty}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review and Start */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">4. Revisão e Início</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Revise os dados e confirme o início da jornada
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo da Jornada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Cliente:</span>
                      <br />
                      {selectedClient?.name}
                      <br />
                      <span className="text-gray-600">{selectedClient?.cpf_cnpj}</span>
                    </div>
                    <div>
                      <span className="font-medium">Template:</span>
                      <br />
                      {selectedTemplate_internal?.name}
                      <br />
                      <span className="text-gray-600">{selectedTemplate_internal?.estimated_duration_days} dias estimados</span>
                    </div>
                    <div>
                      <span className="font-medium">Responsável:</span>
                      <br />
                      {selectedResponsible?.name}
                      <br />
                      <span className="text-gray-600">OAB: {selectedResponsible?.oab}</span>
                    </div>
                    <div>
                      <span className="font-medium">Processo:</span>
                      <br />
                      {selectedProcess ? selectedProcess.numero_cnj : 'Não vinculado'}
                      <br />
                      {selectedProcess && (
                        <span className="text-gray-600">{selectedProcess.titulo}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="start-date">Data de Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Passo {step} de 4
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
            )}
            {step < 4 ? (
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
              >
                Próximo
              </Button>
            ) : (
              <Button 
                onClick={handleStartJourney}
                disabled={startJourneyMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                {startJourneyMutation.isPending ? 'Iniciando...' : 'Iniciar Jornada'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
