import React, { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Link as LinkIcon,
  Plus,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  Target,
  Bell,
} from "lucide-react";
import { Publicacao, Movimentacao } from "../types/journey";

// Mock data for publications
const mockPublicacoes: Publicacao[] = [
  {
    id: "1",
    numero_cnj: "1000123-45.2024.8.26.0001",
    data_publicacao: "2024-02-10",
    content:
      "Intimação para apresentação de contestação no prazo de 15 dias...",
    tribunal: "TJSP",
    source: "DJE",
    is_processed: false,
  },
  {
    id: "2",
    numero_cnj: "2000456-78.2024.8.26.0002",
    data_publicacao: "2024-02-09",
    content: "Sentença proferida. Julgado procedente o pedido...",
    tribunal: "TJSP",
    source: "DJE",
    is_processed: true,
    linked_journey_instance_id: "1",
  },
  {
    id: "3",
    data_publicacao: "2024-02-08",
    content: "Alteração no regimento interno do tribunal...",
    tribunal: "TJSP",
    source: "DJE",
    is_processed: false,
  },
];

// Mock data for movements
const mockMovimentacoes: Movimentacao[] = [
  {
    id: "1",
    numero_cnj: "1000123-45.2024.8.26.0001",
    data_movimentacao: "2024-02-10",
    description: "Juntada de petição de contestação",
    tribunal: "TJSP",
    movement_type: "juntada",
    is_processed: false,
  },
  {
    id: "2",
    numero_cnj: "3000789-01.2024.8.26.0003",
    data_movimentacao: "2024-02-09",
    description: "Audiência de conciliação designada para 15/03/2024",
    tribunal: "TJSP",
    movement_type: "audiencia",
    is_processed: true,
    linked_journey_instance_id: "2",
  },
  {
    id: "3",
    numero_cnj: "2000456-78.2024.8.26.0002",
    data_movimentacao: "2024-02-08",
    description: "Conclusão para despacho",
    tribunal: "TJSP",
    movement_type: "conclusao",
    is_processed: false,
  },
];

export function InboxLegal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tribunalFilter, setTribunalFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredPublicacoes = mockPublicacoes.filter((pub) => {
    const matchesSearch =
      pub.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pub.numero_cnj && pub.numero_cnj.includes(searchTerm));
    const matchesTribunal =
      tribunalFilter === "todos" || pub.tribunal === tribunalFilter;
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "processado" && pub.is_processed) ||
      (statusFilter === "pendente" && !pub.is_processed);

    return matchesSearch && matchesTribunal && matchesStatus;
  });

  const filteredMovimentacoes = mockMovimentacoes.filter((mov) => {
    const matchesSearch =
      mov.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.numero_cnj.includes(searchTerm);
    const matchesTribunal =
      tribunalFilter === "todos" || mov.tribunal === tribunalFilter;
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "processado" && mov.is_processed) ||
      (statusFilter === "pendente" && !mov.is_processed);

    return matchesSearch && matchesTribunal && matchesStatus;
  });

  const handleVincularCNJ = (item: any) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleCriarEtapa = (item: any) => {
    // In real app, would create new stage in active journey
    console.log("Criar etapa para:", item);
    alert("Etapa criada na jornada ativa!");
  };

  const handleNotificar = (item: any) => {
    // In real app, would send notification to responsible lawyer
    console.log("Notificar responsável:", item);
    alert("Responsável notificado!");
  };

  const getStatusBadge = (isProcessed: boolean, hasJourney?: boolean) => {
    if (hasJourney) {
      return (
        <Badge className="bg-brand-100 text-brand-700">
          <Target className="h-3 w-3 mr-1" />
          Na Jornada
        </Badge>
      );
    }

    if (isProcessed) {
      return (
        <Badge className="bg-success-100 text-success-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Processado
        </Badge>
      );
    }

    return (
      <Badge className="bg-warning-100 text-warning-700">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inbox Legal</h1>
          <p className="text-gray-600 mt-1">
            Publicações e movimentações processuais para triagem
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Fonte
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Publicações Pendentes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">
              {mockPublicacoes.filter((p) => !p.is_processed).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Movimentações Pendentes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">
              {mockMovimentacoes.filter((m) => !m.is_processed).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Jornadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                [...mockPublicacoes, ...mockMovimentacoes].filter(
                  (item) => item.linked_journey_instance_id,
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Não Vinculadas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                [...mockPublicacoes, ...mockMovimentacoes].filter(
                  (item) => !item.numero_cnj,
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por CNJ ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={tribunalFilter} onValueChange={setTribunalFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tribunal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tribunais</SelectItem>
              <SelectItem value="TJSP">TJSP</SelectItem>
              <SelectItem value="TST">TST</SelectItem>
              <SelectItem value="TRT">TRT</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="processado">Processado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="publicacoes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="publicacoes">
            <FileText className="h-4 w-4 mr-2" />
            Publicações ({filteredPublicacoes.length})
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            <Calendar className="h-4 w-4 mr-2" />
            Movimentações ({filteredMovimentacoes.length})
          </TabsTrigger>
        </TabsList>

        {/* Publications Tab */}
        <TabsContent value="publicacoes">
          <Card>
            <CardHeader>
              <CardTitle>Publicações</CardTitle>
              <CardDescription>
                Publicações do Diário da Justiça e outros órgãos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>CNJ</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Tribunal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPublicacoes.map((pub) => (
                    <TableRow key={pub.id}>
                      <TableCell>
                        {new Date(pub.data_publicacao).toLocaleDateString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>
                        {pub.numero_cnj ? (
                          <span className="font-mono text-sm">
                            {pub.numero_cnj}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Não vinculado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm truncate">{pub.content}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{pub.tribunal}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          pub.is_processed,
                          !!pub.linked_journey_instance_id,
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!pub.numero_cnj && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVincularCNJ(pub)}
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Vincular
                            </Button>
                          )}

                          {pub.numero_cnj &&
                            !pub.linked_journey_instance_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCriarEtapa(pub)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Criar Etapa
                              </Button>
                            )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNotificar(pub)}
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Notificar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredPublicacoes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma publicação encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações</CardTitle>
              <CardDescription>
                Movimentações processuais dos tribunais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>CNJ</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tribunal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentacoes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {new Date(mov.data_movimentacao).toLocaleDateString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {mov.numero_cnj}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm">{mov.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{mov.movement_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{mov.tribunal}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          mov.is_processed,
                          !!mov.linked_journey_instance_id,
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!mov.linked_journey_instance_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCriarEtapa(mov)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Criar Etapa
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNotificar(mov)}
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Notificar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredMovimentacoes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma movimentação encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vincular CNJ Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular ao Processo CNJ</DialogTitle>
            <DialogDescription>
              Selecione o processo para vincular esta publicação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número CNJ</label>
              <Input placeholder="0000000-00.0000.0.00.0000" />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setIsDialogOpen(false);
                  alert("Publicação vinculada ao processo!");
                }}
              >
                Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
