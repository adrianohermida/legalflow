import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { ArrowLeft, User, FileText, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

// Mock data
const mockTemplates = [
  { id: '1', name: 'Onboarding Trabalhista', nicho: 'Trabalhista', estimated_days: 30 },
  { id: '2', name: 'Divórcio Consensual', nicho: 'Família', estimated_days: 45 },
  { id: '3', name: 'Recuperação Judicial', nicho: 'Empresarial', estimated_days: 120 }
];

const mockClientes = [
  { cpfcnpj: '123.456.789-00', nome: 'João Silva', tipo: 'PF' },
  { cpfcnpj: '12.345.678/0001-90', nome: 'Empresa ABC Ltda', tipo: 'PJ' },
  { cpfcnpj: '987.654.321-00', nome: 'Maria Oliveira', tipo: 'PF' }
];

const mockProcessos = [
  { numero_cnj: '1000123-45.2024.8.26.0001', cliente_cpfcnpj: '123.456.789-00', titulo: 'Ação Trabalhista' },
  { numero_cnj: '2000456-78.2024.8.26.0002', cliente_cpfcnpj: '12.345.678/0001-90', titulo: 'Ação Empresarial' },
  { numero_cnj: '3000789-01.2024.8.26.0003', cliente_cpfcnpj: '987.654.321-00', titulo: 'Ação de Divórcio' }
];

const mockAdvogados = [
  { oab: '123456/SP', nome: 'Dr. Maria Santos' },
  { oab: '789012/SP', nome: 'Dr. João Silva' },
  { oab: '345678/SP', nome: 'Dra. Ana Costa' }
];

export function IniciarJornada() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedTemplate = searchParams.get('template');

  const [formData, setFormData] = useState({
    template_id: preSelectedTemplate || '',
    cliente_cpfcnpj: '',
    processo_numero_cnj: '',
    responsavel_oab: '',
    data_inicio: new Date(),
    observacoes: ''
  });

  const [filteredProcessos, setFilteredProcessos] = useState(mockProcessos);

  useEffect(() => {
    if (formData.cliente_cpfcnpj) {
      const clienteProcessos = mockProcessos.filter(p => p.cliente_cpfcnpj === formData.cliente_cpfcnpj);
      setFilteredProcessos(clienteProcessos);
    } else {
      setFilteredProcessos(mockProcessos);
    }
  }, [formData.cliente_cpfcnpj]);

  const selectedTemplate = mockTemplates.find(t => t.id === formData.template_id);
  const selectedCliente = mockClientes.find(c => c.cpfcnpj === formData.cliente_cpfcnpj);
  const selectedProcesso = mockProcessos.find(p => p.numero_cnj === formData.processo_numero_cnj);
  const selectedAdvogado = mockAdvogados.find(a => a.oab === formData.responsavel_oab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.template_id || !formData.cliente_cpfcnpj || !formData.responsavel_oab) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    // Mock RPC call start_journey_instance
    const journeyInstanceData = {
      template_id: formData.template_id,
      cliente_cpfcnpj: formData.cliente_cpfcnpj,
      processo_numero_cnj: formData.processo_numero_cnj || null,
      owner_oab: formData.responsavel_oab,
      started_at: formData.data_inicio.toISOString(),
      observacoes: formData.observacoes
    };

    console.log('Starting journey instance:', journeyInstanceData);
    
    // Mock success
    alert('Jornada iniciada com sucesso!');
    navigate('/jornadas');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/jornadas')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Iniciar Nova Jornada</h1>
          <p className="text-gray-600 mt-1">
            Matricule um cliente em uma jornada automatizada
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Configuração da Jornada</CardTitle>
              <CardDescription>
                Selecione o template e configure os participantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="template">Template de Jornada *</Label>
                  <Select 
                    value={formData.template_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {template.nicho} • {template.estimated_days} dias
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cliente Selection */}
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select 
                    value={formData.cliente_cpfcnpj} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      cliente_cpfcnpj: value,
                      processo_numero_cnj: '' // Reset processo when cliente changes
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClientes.map((cliente) => (
                        <SelectItem key={cliente.cpfcnpj} value={cliente.cpfcnpj}>
                          <div className="flex items-center gap-2">
                            {cliente.tipo === 'PF' ? 
                              <User className="h-4 w-4" /> : 
                              <Users className="h-4 w-4" />
                            }
                            <div>
                              <span>{cliente.nome}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {cliente.cpfcnpj}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Processo Selection (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="processo">Processo (Opcional)</Label>
                  <Select 
                    value={formData.processo_numero_cnj} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, processo_numero_cnj: value }))}
                    disabled={!formData.cliente_cpfcnpj}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        formData.cliente_cpfcnpj ? 
                        "Selecione um processo" : 
                        "Selecione um cliente primeiro"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum processo específico</SelectItem>
                      {filteredProcessos.map((processo) => (
                        <SelectItem key={processo.numero_cnj} value={processo.numero_cnj}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <div>
                              <span className="font-mono text-sm">{processo.numero_cnj}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {processo.titulo}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsável Selection */}
                <div className="space-y-2">
                  <Label htmlFor="responsavel">Advogado Responsável *</Label>
                  <Select 
                    value={formData.responsavel_oab} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, responsavel_oab: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockAdvogados.map((advogado) => (
                        <SelectItem key={advogado.oab} value={advogado.oab}>
                          <div>
                            <span>{advogado.nome}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              OAB: {advogado.oab}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de Início */}
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.data_inicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                        {formData.data_inicio ? (
                          format(formData.data_inicio, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.data_inicio}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, data_inicio: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Informações adicionais sobre esta instância..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/jornadas')}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Iniciar Jornada
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>
                Revisão da jornada que será iniciada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Template</h4>
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <p className="text-sm text-gray-500">{selectedTemplate.nicho}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Duração estimada: {selectedTemplate.estimated_days} dias
                  </p>
                </div>
              )}

              {selectedCliente && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Cliente</h4>
                  <p className="font-medium">{selectedCliente.nome}</p>
                  <p className="text-sm text-gray-500">{selectedCliente.cpfcnpj}</p>
                </div>
              )}

              {selectedProcesso && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Processo</h4>
                  <p className="font-mono text-sm">{selectedProcesso.numero_cnj}</p>
                  <p className="text-sm text-gray-500">{selectedProcesso.titulo}</p>
                </div>
              )}

              {selectedAdvogado && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Responsável</h4>
                  <p className="font-medium">{selectedAdvogado.nome}</p>
                  <p className="text-sm text-gray-500">OAB: {selectedAdvogado.oab}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm text-gray-600">Data de Início</h4>
                <p className="font-medium">
                  {format(formData.data_inicio, "PPP", { locale: ptBR })}
                </p>
              </div>

              {formData.observacoes && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Observações</h4>
                  <p className="text-sm">{formData.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
