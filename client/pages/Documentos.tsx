import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Search, 
  Upload, 
  FileText, 
  Download, 
  Eye,
  Plus,
  Wand2,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter
} from 'lucide-react';

// Mock data for documents
const mockDocuments = [
  {
    id: '1',
    name: 'Carteira de Trabalho - João Silva.pdf',
    type: 'upload',
    size: '2.3 MB',
    uploaded_at: '2024-02-01',
    uploaded_by: 'João Silva',
    processo_numero_cnj: '1000123-45.2024.8.26.0001',
    status: 'aprovado'
  },
  {
    id: '2',
    name: 'Contrato de Trabalho - Empresa ABC.pdf',
    type: 'upload',
    size: '1.8 MB',
    uploaded_at: '2024-02-02',
    uploaded_by: 'Dr. Maria Santos',
    processo_numero_cnj: '2000456-78.2024.8.26.0002',
    status: 'validando'
  },
  {
    id: '3',
    name: 'Comprovante de Residência.pdf',
    type: 'requirement',
    size: '0.5 MB',
    uploaded_at: '2024-02-03',
    uploaded_by: 'Maria Oliveira',
    processo_numero_cnj: '3000789-01.2024.8.26.0003',
    status: 'faltando'
  }
];

// Mock data for legal pieces (petições)
const mockPeticoes = [
  {
    id: '1',
    name: 'Petição Inicial - Ação Trabalhista',
    tipo: 'peticao_inicial',
    processo_numero_cnj: '1000123-45.2024.8.26.0001',
    generated_at: '2024-01-15',
    generated_by: 'Dr. Maria Santos',
    status: 'protocolado',
    template_used: 'Trabalhista - Horas Extras'
  },
  {
    id: '2',
    name: 'Contestação - Defesa Empresarial',
    tipo: 'contestacao',
    processo_numero_cnj: '2000456-78.2024.8.26.0002',
    generated_at: '2024-01-20',
    generated_by: 'Dr. João Silva',
    status: 'rascunho',
    template_used: 'Empresarial - Contestação Padrão'
  },
  {
    id: '3',
    name: 'Recurso de Apelação',
    tipo: 'recurso',
    processo_numero_cnj: '3000789-01.2024.8.26.0003',
    generated_at: '2024-01-25',
    generated_by: 'Dra. Ana Costa',
    status: 'revisao',
    template_used: 'Família - Recurso de Apelação'
  }
];

export function Documentos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [processoFilter, setProcessoFilter] = useState<string>('todos');

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.processo_numero_cnj.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || doc.status === statusFilter;
    const matchesProcesso = processoFilter === 'todos' || doc.processo_numero_cnj === processoFilter;
    
    return matchesSearch && matchesStatus && matchesProcesso;
  });

  const filteredPeticoes = mockPeticoes.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pet.processo_numero_cnj.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || pet.status === statusFilter;
    const matchesProcesso = processoFilter === 'todos' || pet.processo_numero_cnj === processoFilter;
    
    return matchesSearch && matchesStatus && matchesProcesso;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
      case 'protocolado':
        return 'bg-green-100 text-green-800';
      case 'validando':
      case 'revisao':
        return 'bg-yellow-100 text-yellow-800';
      case 'faltando':
      case 'rascunho':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
      case 'protocolado':
        return <CheckCircle className="h-3 w-3" />;
      case 'validando':
      case 'revisao':
        return <Clock className="h-3 w-3" />;
      case 'faltando':
      case 'rascunho':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const uniqueProcessos = [...new Set([...mockDocuments, ...mockPeticoes].map(item => item.processo_numero_cnj))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentos & Peças</h1>
          <p className="text-gray-600 mt-1">
            Gerencie documentos e peças processuais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button>
            <Wand2 className="h-4 w-4 mr-2" />
            Gerar Petição (IA)
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDocuments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peças Geradas</CardTitle>
            <Wand2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPeticoes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Validação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {[...mockDocuments, ...mockPeticoes].filter(item => 
                item.status === 'validando' || item.status === 'revisao'
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faltando</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {[...mockDocuments, ...mockPeticoes].filter(item => 
                item.status === 'faltando' || item.status === 'rascunho'
              ).length}
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
              placeholder="Buscar documentos ou CNJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={processoFilter} onValueChange={setProcessoFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Processos</SelectItem>
              {uniqueProcessos.map((cnj) => (
                <SelectItem key={cnj} value={cnj}>
                  <span className="font-mono text-sm">{cnj}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="validando">Validando</SelectItem>
              <SelectItem value="faltando">Faltando</SelectItem>
              <SelectItem value="protocolado">Protocolado</SelectItem>
              <SelectItem value="revisao">Em Revisão</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documentos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documentos">
            <FileText className="h-4 w-4 mr-2" />
            Documentos ({filteredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="peticoes">
            <Wand2 className="h-4 w-4 mr-2" />
            Peças Processuais ({filteredPeticoes.length})
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>
                Documentos enviados pelos clientes e exigidos nas jornadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Arquivo</TableHead>
                    <TableHead>Processo CNJ</TableHead>
                    <TableHead>Enviado Por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{doc.processo_numero_cnj}</span>
                      </TableCell>
                      <TableCell>{doc.uploaded_by}</TableCell>
                      <TableCell>
                        {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{doc.size}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(doc.status)}>
                          {getStatusIcon(doc.status)}
                          <span className="ml-1 capitalize">{doc.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum documento encontrado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peças Tab */}
        <TabsContent value="peticoes">
          <Card>
            <CardHeader>
              <CardTitle>Peças Processuais</CardTitle>
              <CardDescription>
                Peças geradas automaticamente e templates utilizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Peça</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Processo CNJ</TableHead>
                    <TableHead>Gerado Por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeticoes.map((peca) => (
                    <TableRow key={peca.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wand2 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{peca.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{peca.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{peca.processo_numero_cnj}</span>
                      </TableCell>
                      <TableCell>{peca.generated_by}</TableCell>
                      <TableCell>
                        {new Date(peca.generated_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{peca.template_used}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(peca.status)}>
                          {getStatusIcon(peca.status)}
                          <span className="ml-1 capitalize">{peca.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          {peca.status === 'rascunho' && (
                            <Button size="sm">
                              <Wand2 className="h-3 w-3 mr-1" />
                              Editar IA
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredPeticoes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma peça processual encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
