import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Plus,
  Search,
  Copy,
  Edit,
  Play,
  Clock,
  Users,
  FileText,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Target,
} from "lucide-react";
import { JourneyTemplate, JourneyInstance } from "../types/journey";

// Mock data for journey templates
const mockTemplates: JourneyTemplate[] = [
  {
    id: "1",
    name: "Onboarding Trabalhista",
    description:
      "Processo completo para novos clientes com questões trabalhistas",
    nicho: "Trabalhista",
    tags: ["iniciante", "trabalhista", "CLT"],
    estimated_days: 30,
    created_at: "2024-01-15",
    updated_at: "2024-01-20",
    created_by_oab: "123456/SP",
    stages: [
      {
        id: "1",
        template_id: "1",
        name: "Coleta de Documentos",
        description: "Upload de carteira de trabalho e documentos",
        stage_type: "upload",
        sequence_order: 1,
        is_required: true,
        sla_hours: 48,
        estimated_days: 2,
        rules: [],
      },
      {
        id: "2",
        template_id: "1",
        name: "Análise do Caso",
        description: "Formulário de análise inicial",
        stage_type: "form",
        sequence_order: 2,
        is_required: true,
        sla_hours: 24,
        estimated_days: 1,
        rules: [],
      },
      {
        id: "3",
        template_id: "1",
        name: "Reunião Estratégica",
        description: "Primeira reunião para definir estratégia",
        stage_type: "meeting",
        sequence_order: 3,
        is_required: true,
        sla_hours: 168,
        estimated_days: 7,
        rules: [],
      },
    ],
  },
  {
    id: "2",
    name: "Divórcio Consensual",
    description: "Fluxo otimizado para divórcios consensuais",
    nicho: "Família",
    tags: ["família", "divórcio", "consensual"],
    estimated_days: 45,
    created_at: "2024-01-10",
    updated_at: "2024-01-18",
    created_by_oab: "123456/SP",
    stages: [
      {
        id: "4",
        template_id: "2",
        name: "Orientação Inicial",
        description: "Vídeo explicativo sobre o processo",
        stage_type: "lesson",
        sequence_order: 1,
        is_required: true,
        sla_hours: 24,
        estimated_days: 1,
        rules: [],
      },
      {
        id: "5",
        template_id: "2",
        name: "Documentação Pessoal",
        description: "Upload de documentos pessoais e do cônjuge",
        stage_type: "upload",
        sequence_order: 2,
        is_required: true,
        sla_hours: 72,
        estimated_days: 3,
        rules: [],
      },
    ],
  },
  {
    id: "3",
    name: "Recuperação Judicial",
    description: "Processo completo para empresas em recuperação judicial",
    nicho: "Empresarial",
    tags: ["empresarial", "recuperação", "complexo"],
    estimated_days: 120,
    created_at: "2024-01-05",
    updated_at: "2024-01-25",
    created_by_oab: "123456/SP",
    stages: [
      {
        id: "6",
        template_id: "3",
        name: "Auditoria Financeira",
        description: "Levantamento completo da situação financeira",
        stage_type: "form",
        sequence_order: 1,
        is_required: true,
        sla_hours: 240,
        estimated_days: 10,
        rules: [],
      },
    ],
  },
];

// Mock data for active journey instances
const mockInstances: JourneyInstance[] = [
  {
    id: "1",
    template_id: "1",
    template_name: "Onboarding Trabalhista",
    cliente_cpfcnpj: "123.456.789-00",
    cliente_nome: "João Silva",
    processo_numero_cnj: "1000123-45.2024.8.26.0001",
    owner_oab: "123456/SP",
    owner_nome: "Dr. Maria Santos",
    started_at: "2024-02-01",
    expected_completion: "2024-03-02",
    progress_pct: 66,
    status: "active",
    current_stage_id: "2",
    stages: [],
  },
  {
    id: "2",
    template_id: "2",
    template_name: "Divórcio Consensual",
    cliente_cpfcnpj: "987.654.321-00",
    cliente_nome: "Maria Oliveira",
    owner_oab: "123456/SP",
    owner_nome: "Dr. João Silva",
    started_at: "2024-01-20",
    expected_completion: "2024-03-05",
    progress_pct: 40,
    status: "active",
    current_stage_id: "5",
    stages: [],
  },
];

export function Jornadas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [nichoFilter, setNichoFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNicho =
      nichoFilter === "todos" || template.nicho === nichoFilter;
    return matchesSearch && matchesNicho;
  });

  const filteredInstances = mockInstances.filter((instance) => {
    const matchesSearch =
      instance.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.template_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "todos" || instance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <PlayCircle className="h-4 w-4 text-success" />;
      case "paused":
        return <PauseCircle className="h-4 w-4 text-warning-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-brand-700" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success-100 text-success-700";
      case "paused":
        return "bg-warning-100 text-warning-700";
      case "completed":
        return "bg-brand-100 text-brand-700";
      case "cancelled":
        return "bg-neutral-100 text-neutral-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Jornadas</h1>
          <p className="text-neutral-600 mt-1">
            Gerencie templates e instâncias de jornadas do cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/jornadas/nova">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Link>
          </Button>
          <Button asChild>
            <Link to="/jornadas/iniciar">
              <Play className="h-4 w-4 mr-2" />
              Iniciar Jornada
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Buscar jornadas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Modelos ({mockTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="instances">
            <Users className="h-4 w-4 mr-2" />
            Instâncias ({mockInstances.length})
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex gap-2">
            <Select value={nichoFilter} onValueChange={setNichoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por nicho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Nichos</SelectItem>
                <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                <SelectItem value="Família">Família</SelectItem>
                <SelectItem value="Empresarial">Empresarial</SelectItem>
                <SelectItem value="Criminal">Criminal</SelectItem>
                <SelectItem value="Cível">Cível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{template.nicho}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Template stats */}
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {template.estimated_days} dias
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {template.stages.length} etapas
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="flex-1" asChild>
                        <Link to={`/jornadas/iniciar?template=${template.id}`}>
                          <Play className="h-3 w-3 mr-1" />
                          Iniciar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p>Nenhum template encontrado.</p>
            </div>
          )}
        </TabsContent>

        {/* Instances Tab */}
        <TabsContent value="instances" className="space-y-4">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInstances.map((instance) => (
              <Card
                key={instance.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {instance.template_name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Cliente: {instance.cliente_nome}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(instance.status)}
                      <Badge className={getStatusColor(instance.status)}>
                        {instance.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm text-neutral-600 mb-2">
                        <span>Progresso</span>
                        <span>{instance.progress_pct}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${instance.progress_pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-600">Responsável:</span>
                        <p className="font-medium">{instance.owner_nome}</p>
                      </div>
                      <div>
                        <span className="text-neutral-600">Início:</span>
                        <p className="font-medium">
                          {new Date(instance.started_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    </div>

                    {instance.processo_numero_cnj && (
                      <div className="text-sm">
                        <span className="text-neutral-600">Processo:</span>
                        <p className="font-mono text-xs">
                          {instance.processo_numero_cnj}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        asChild
                      >
                        <Link to={`/jornadas/instancia/${instance.id}`}>
                          Ver Detalhes
                        </Link>
                      </Button>
                      <Button size="sm" className="flex-1" asChild>
                        <Link to={`/portal-cliente/${instance.id}`}>
                          Portal Cliente
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInstances.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p>Nenhuma jornada ativa encontrada.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
