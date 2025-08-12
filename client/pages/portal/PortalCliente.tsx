import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { 
  BookOpen, 
  FileText, 
  Upload, 
  Calendar, 
  CheckCircle, 
  Clipboard,
  Clock,
  Play,
  AlertCircle,
  ExternalLink,
  Download
} from 'lucide-react';
import { StageType } from '../../types/journey';

// Mock journey instance data
const mockJourneyInstance = {
  id: '1',
  template_name: 'Onboarding Trabalhista',
  cliente_nome: 'João Silva',
  progress_pct: 40,
  status: 'active' as const,
  current_stage_id: '2',
  stages: [
    {
      id: '1',
      stage_name: 'Orientação Inicial',
      stage_type: 'lesson' as StageType,
      sequence_order: 1,
      status: 'completed' as const,
      completed_at: '2024-02-01T10:00:00Z',
      description: 'Vídeo introdutório sobre direitos trabalhistas'
    },
    {
      id: '2',
      stage_name: 'Upload de Documentos',
      stage_type: 'upload' as StageType,
      sequence_order: 2,
      status: 'in_progress' as const,
      started_at: '2024-02-02T09:00:00Z',
      due_date: '2024-02-05T17:00:00Z',
      description: 'Envie sua carteira de trabalho e documentos pessoais'
    },
    {
      id: '3',
      stage_name: 'Formulário de Análise',
      stage_type: 'form' as StageType,
      sequence_order: 3,
      status: 'pending' as const,
      description: 'Questionário detalhado sobre sua situação trabalhista'
    },
    {
      id: '4',
      stage_name: 'Reunião Estratégica',
      stage_type: 'meeting' as StageType,
      sequence_order: 4,
      status: 'pending' as const,
      description: 'Reunião para definir estratégia do caso'
    },
    {
      id: '5',
      stage_name: 'Aprovação Final',
      stage_type: 'gate' as StageType,
      sequence_order: 5,
      status: 'pending' as const,
      description: 'Revisão e aprovação do plano de ação'
    }
  ]
};

const getStageIcon = (type: StageType) => {
  switch (type) {
    case 'lesson': return <BookOpen className="h-5 w-5" />;
    case 'form': return <FileText className="h-5 w-5" />;
    case 'upload': return <Upload className="h-5 w-5" />;
    case 'meeting': return <Calendar className="h-5 w-5" />;
    case 'gate': return <CheckCircle className="h-5 w-5" />;
    case 'task': return <Clipboard className="h-5 w-5" />;
    default: return <Clipboard className="h-5 w-5" />;
  }
};

const getStageActionButton = (stage: any) => {
  if (stage.status === 'completed') {
    return (
      <Badge className="bg-success-100 text-success-700">
        <CheckCircle className="h-3 w-3 mr-1" />
        Concluído
      </Badge>
    );
  }

  if (stage.status === 'pending') {
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Aguardando
      </Badge>
    );
  }

  // in_progress
  switch (stage.stage_type) {
    case 'lesson':
      return (
        <Button size="sm">
          <Play className="h-3 w-3 mr-1" />
          Assistir Aula
        </Button>
      );
    case 'form':
      return (
        <Button size="sm">
          <FileText className="h-3 w-3 mr-1" />
          Preencher Formulário
        </Button>
      );
    case 'upload':
      return (
        <Button size="sm">
          <Upload className="h-3 w-3 mr-1" />
          Enviar Documentos
        </Button>
      );
    case 'meeting':
      return (
        <Button size="sm">
          <Calendar className="h-3 w-3 mr-1" />
          Agendar Reunião
        </Button>
      );
    case 'gate':
      return (
        <Badge className="bg-warning-100 text-warning-700">
          <Clock className="h-3 w-3 mr-1" />
          Em Análise
        </Badge>
      );
    default:
      return (
        <Button size="sm">
          <Clipboard className="h-3 w-3 mr-1" />
          Ver Tarefa
        </Button>
      );
  }
};

const getStageDetails = (stage: any) => {
  switch (stage.stage_type) {
    case 'lesson':
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{stage.description}</p>
          <div className="bg-brand-50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Conteúdo da Aula</h5>
            <ul className="text-sm space-y-1">
              <li>• Introdução aos direitos trabalhistas</li>
              <li>• Como identificar irregularidades</li>
              <li>• Próximos passos do processo</li>
            </ul>
            <div className="mt-3">
              <Button size="sm" className="mr-2">
                <Play className="h-3 w-3 mr-1" />
                Assistir Vídeo (15 min)
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Material de Apoio
              </Button>
            </div>
          </div>
        </div>
      );
    
    case 'upload':
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{stage.description}</p>
          <div className="bg-brand-50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Documentos Necessários</h5>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Carteira de Trabalho (frente e verso)
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                RG e CPF
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Comprovante de residência
              </li>
            </ul>
            <div className="mt-3">
              <Button size="sm">
                <Upload className="h-3 w-3 mr-1" />
                Enviar Documentos
              </Button>
            </div>
          </div>
        </div>
      );
    
    case 'form':
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{stage.description}</p>
          <div className="bg-success-50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Informações a Preencher</h5>
            <ul className="text-sm space-y-1">
              <li>• Histórico profissional detalhado</li>
              <li>• Situações irregulares identificadas</li>
              <li>• Documentação de horas extras</li>
              <li>• Outras questões trabalhistas</li>
            </ul>
            <div className="mt-3">
              <Button size="sm">
                <FileText className="h-3 w-3 mr-1" />
                Abrir Formulário
              </Button>
            </div>
          </div>
        </div>
      );
    
    case 'meeting':
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{stage.description}</p>
          <div className="bg-warning-50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Agendar Reunião</h5>
            <p className="text-sm mb-3">
              Reunião de 1 hora para discutir a estratégia do seu caso com base na análise dos documentos.
            </p>
            <div className="space-y-2">
              <Button size="sm">
                <Calendar className="h-3 w-3 mr-1" />
                Ver Horários Disponíveis
              </Button>
              <Button size="sm" variant="outline">
                <ExternalLink className="h-3 w-3 mr-1" />
                Reunião Online
              </Button>
            </div>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{stage.description}</p>
        </div>
      );
  }
};

export function PortalCliente() {
  const { instanceId } = useParams();
  const [openStage, setOpenStage] = useState<string | undefined>(mockJourneyInstance.current_stage_id);

  // In real app, would fetch journey instance by ID
  const journeyInstance = mockJourneyInstance;

  const currentStage = journeyInstance.stages.find(s => s.id === journeyInstance.current_stage_id);
  const isOverdue = currentStage?.due_date && new Date(currentStage.due_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {journeyInstance.template_name}
              </h1>
              <p className="text-gray-600 mt-1">
                Portal do Cliente - {journeyInstance.cliente_nome}
              </p>
            </div>
            <Badge
              className={journeyInstance.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-700'}
            >
              {journeyInstance.status === 'active' ? 'Em Andamento' : 'Pausado'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Progresso da Jornada
            </CardTitle>
            <CardDescription>
              Acompanhe seu progresso e próximas etapas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progresso Geral</span>
                <span>{journeyInstance.progress_pct}% concluído</span>
              </div>
              <Progress value={journeyInstance.progress_pct} className="h-2" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {journeyInstance.stages.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Concluídas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {journeyInstance.stages.filter(s => s.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-gray-600">Em Andamento</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {journeyInstance.stages.filter(s => s.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Action Alert */}
        {currentStage && (
          <Alert className={isOverdue ? "border-danger-200 bg-danger-50" : "border-brand-200 bg-brand-50"}>
            <AlertCircle className={`h-4 w-4 ${isOverdue ? 'text-danger-600' : 'text-brand-700'}`} />
            <AlertTitle>
              {isOverdue ? 'Ação em Atraso!' : 'Próxima Ação'}
            </AlertTitle>
            <AlertDescription>
              <strong>{currentStage.stage_name}</strong> - {currentStage.description}
              {currentStage.due_date && (
                <span className={`block mt-1 text-sm ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                  Prazo: {new Date(currentStage.due_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Journey Stages */}
        <Card>
          <CardHeader>
            <CardTitle>Etapas da Jornada</CardTitle>
            <CardDescription>
              Clique em cada etapa para ver detalhes e ações disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible value={openStage} onValueChange={setOpenStage}>
              {journeyInstance.stages
                .sort((a, b) => a.sequence_order - b.sequence_order)
                .map((stage) => {
                  const isActive = stage.id === journeyInstance.current_stage_id;
                  const stageIcon = getStageIcon(stage.stage_type);
                  
                  return (
                    <AccordionItem key={stage.id} value={stage.id}>
                      <AccordionTrigger className={`hover:no-underline ${isActive ? 'bg-brand-50 px-4 rounded-lg' : ''}`}>
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            stage.status === 'completed' ? 'bg-success-100 text-success-600' :
                            stage.status === 'in_progress' ? 'bg-brand-100 text-brand-700' :
                            'bg-neutral-100 text-neutral-400'
                          }`}>
                            {stage.status === 'completed' ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              stageIcon
                            )}
                          </div>
                          
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stage.stage_name}</span>
                              {isActive && (
                                <Badge variant="outline" className="text-xs">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {stage.description}
                            </p>
                          </div>
                          
                          <div className="mr-4">
                            {getStageActionButton(stage)}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        {getStageDetails(stage)}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Precisa de Ajuda?</CardTitle>
            <CardDescription>
              Entre em contato conosco se tiver dúvidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Agendar Ligação
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
