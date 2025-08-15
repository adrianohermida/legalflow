import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Loader2,
  Search,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  FolderPlus,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { directDataApi, viaCepApi, cpfUtils, cnpjUtils } from "../lib/external-apis";

interface Cliente {
  cpfcnpj: string;
  nome: string | null;
  whatsapp: string | null;
  created_at: string;
  crm_id: string | null;
  processo_count?: number;
}

interface ClienteFormData {
  cpfcnpj: string;
  nome: string;
  whatsapp: string;
  email?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
}

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClienteFormData) => void;
  editingCliente?: Cliente | null;
  isLoading?: boolean;
}

export function ClienteFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingCliente,
  isLoading = false,
}: ClienteFormModalProps) {
  const [formData, setFormData] = useState<ClienteFormData>({
    cpfcnpj: "",
    nome: "",
    whatsapp: "",
    email: "",
    endereco: {
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
    },
  });

  const [isConsultingCPF, setIsConsultingCPF] = useState(false);
  const [isConsultingCEP, setIsConsultingCEP] = useState(false);
  const [cpfConsultSuccess, setCpfConsultSuccess] = useState(false);
  const [cepConsultSuccess, setCepConsultSuccess] = useState(false);
  const [cpfValidationError, setCpfValidationError] = useState("");
  const [cnpjValidationError, setCnpjValidationError] = useState("");
  const [showCreateProcessCTA, setShowCreateProcessCTA] = useState(false);
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");

  const { toast } = useToast();

  useEffect(() => {
    if (editingCliente) {
      setFormData({
        cpfcnpj: editingCliente.cpfcnpj,
        nome: editingCliente.nome || "",
        whatsapp: editingCliente.whatsapp || "",
        email: "",
        endereco: {
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          uf: "",
          cep: "",
        },
      });
      
      // Detect document type
      const cleanDoc = editingCliente.cpfcnpj.replace(/\D/g, "");
      setDocumentType(cleanDoc.length === 11 ? "cpf" : "cnpj");
    } else {
      setFormData({
        cpfcnpj: "",
        nome: "",
        whatsapp: "",
        email: "",
        endereco: {
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          uf: "",
          cep: "",
        },
      });
      setDocumentType("cpf");
    }

    setCpfConsultSuccess(false);
    setCepConsultSuccess(false);
    setCpfValidationError("");
    setCnpjValidationError("");
    setShowCreateProcessCTA(false);
  }, [editingCliente, isOpen]);

  const handleCpfCnpjChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    
    // Auto-detect document type
    if (cleanValue.length <= 11) {
      setDocumentType("cpf");
      setFormData(prev => ({
        ...prev,
        cpfcnpj: cpfUtils.format(value),
      }));
    } else if (cleanValue.length <= 14) {
      setDocumentType("cnpj");
      setFormData(prev => ({
        ...prev,
        cpfcnpj: cnpjUtils.format(value),
      }));
    }

    setCpfConsultSuccess(false);
    setCpfValidationError("");
    setCnpjValidationError("");
  };

  const handleConsultarCPF = async () => {
    if (documentType !== "cpf") return;

    const cleanCpf = formData.cpfcnpj.replace(/\D/g, "");
    
    if (!cpfUtils.validate(cleanCpf)) {
      setCpfValidationError("CPF inválido");
      return;
    }

    setIsConsultingCPF(true);
    setCpfValidationError("");

    try {
      const data = await directDataApi.consultarCPF(cleanCpf);
      
      if (data) {
        const whatsapp = directDataApi.extractWhatsAppFromData(data);
        const email = directDataApi.extractMainEmailFromData(data);
        const address = directDataApi.extractMainAddressFromData(data);

        setFormData(prev => ({
          ...prev,
          nome: data.retorno.nome || prev.nome,
          whatsapp: whatsapp || prev.whatsapp,
          email: email || prev.email,
          endereco: address || prev.endereco,
        }));

        setCpfConsultSuccess(true);
        toast({
          title: "CPF consultado com sucesso",
          description: "Dados carregados automaticamente",
        });
      } else {
        toast({
          title: "CPF não encontrado",
          description: "Não foi possível localizar dados para este CPF",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na consulta",
        description: "Erro ao consultar dados do CPF",
        variant: "destructive",
      });
    } finally {
      setIsConsultingCPF(false);
    }
  };

  const handleConsultarCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) return;

    setIsConsultingCEP(true);

    try {
      const data = await viaCepApi.consultarCEP(cleanCep);
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco!,
            cep: viaCepApi.formatCEP(data.cep),
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
          },
        }));

        setCepConsultSuccess(true);
        toast({
          title: "CEP consultado com sucesso",
          description: "Endereço carregado automaticamente",
        });
      }
    } catch (error) {
      toast({
        title: "CEP não encontrado",
        description: "Não foi possível localizar este CEP",
        variant: "destructive",
      });
    } finally {
      setIsConsultingCEP(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate document
    const cleanDoc = formData.cpfcnpj.replace(/\D/g, "");
    if (documentType === "cpf" && !cpfUtils.validate(cleanDoc)) {
      setCpfValidationError("CPF inválido");
      return;
    }
    if (documentType === "cnpj" && !cnpjUtils.validate(cleanDoc)) {
      setCnpjValidationError("CNPJ inválido");
      return;
    }

    onSubmit(formData);
    setShowCreateProcessCTA(true);
  };

  const handleCreateProcess = () => {
    const params = new URLSearchParams({
      cliente_cpfcnpj: formData.cpfcnpj,
      cliente_nome: formData.nome,
    });
    window.location.href = `/processos/novo?${params.toString()}`;
  };

  const formatPhoneDisplay = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {documentType === "cpf" ? (
                <User className="w-5 h-5" />
              ) : (
                <Building className="w-5 h-5" />
              )}
              {editingCliente ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCliente
                ? "Atualize as informações do cliente"
                : documentType === "cpf"
                ? "Cadastre uma nova pessoa física"
                : "Cadastre uma nova pessoa jurídica"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* CPF/CNPJ Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="cpfcnpj">
                  {documentType === "cpf" ? "CPF" : "CNPJ"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cpfcnpj"
                    value={formData.cpfcnpj}
                    onChange={(e) => handleCpfCnpjChange(e.target.value)}
                    placeholder={
                      documentType === "cpf"
                        ? "000.000.000-00"
                        : "00.000.000/0000-00"
                    }
                    disabled={!!editingCliente}
                    required
                    className={
                      cpfValidationError || cnpjValidationError
                        ? "border-red-500"
                        : cpfConsultSuccess
                        ? "border-green-500"
                        : ""
                    }
                  />
                  {documentType === "cpf" && !editingCliente && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConsultarCPF}
                      disabled={isConsultingCPF || formData.cpfcnpj.length < 14}
                    >
                      {isConsultingCPF ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Consultar
                    </Button>
                  )}
                </div>
                {cpfValidationError && (
                  <p className="text-sm text-red-500 mt-1">{cpfValidationError}</p>
                )}
                {cnpjValidationError && (
                  <p className="text-sm text-red-500 mt-1">{cnpjValidationError}</p>
                )}
                {cpfConsultSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                    <CheckCircle className="w-4 h-4" />
                    Dados carregados automaticamente
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">
                  {documentType === "cpf" ? "Nome Completo" : "Razão Social"}
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder={
                    documentType === "cpf"
                      ? "Nome completo da pessoa"
                      : "Razão social da empresa"
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          whatsapp: formatPhoneDisplay(e.target.value),
                        }))
                      }
                      placeholder="(00) 00000-0000"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="email@exemplo.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <Label className="text-base font-medium">Endereço</Label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={formData.endereco?.cep || ""}
                      onChange={(e) => {
                        const value = viaCepApi.formatCEP(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          endereco: { ...prev.endereco!, cep: value },
                        }));
                        if (value.replace(/\D/g, "").length === 8) {
                          handleConsultarCEP(value);
                        }
                      }}
                      placeholder="00000-000"
                      className={cepConsultSuccess ? "border-green-500" : ""}
                    />
                    {isConsultingCEP && (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {cepConsultSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                      <CheckCircle className="w-4 h-4" />
                      Endereço carregado
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={formData.endereco?.logradouro || ""}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco!, logradouro: e.target.value },
                      }))
                    }
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.endereco?.numero || ""}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco!, numero: e.target.value },
                      }))
                    }
                    placeholder="123"
                  />
                </div>

                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.endereco?.complemento || ""}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco!, complemento: e.target.value },
                      }))
                    }
                    placeholder="Apto, Sala"
                  />
                </div>

                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.endereco?.bairro || ""}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco!, bairro: e.target.value },
                      }))
                    }
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Select
                    value={formData.endereco?.uf || ""}
                    onValueChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco!, uf: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="AL">AL</SelectItem>
                      <SelectItem value="AP">AP</SelectItem>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="BA">BA</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="DF">DF</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                      <SelectItem value="GO">GO</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="MS">MS</SelectItem>
                      <SelectItem value="MG">MG</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="PB">PB</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                      <SelectItem value="PI">PI</SelectItem>
                      <SelectItem value="RJ">RJ</SelectItem>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="RS">RS</SelectItem>
                      <SelectItem value="RO">RO</SelectItem>
                      <SelectItem value="RR">RR</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="SP">SP</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="TO">TO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.endereco?.cidade || ""}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      endereco: { ...prev.endereco!, cidade: e.target.value },
                    }))
                  }
                  placeholder="Cidade"
                />
              </div>
            </div>

            {/* Success Alert with CTA */}
            {showCreateProcessCTA && !editingCliente && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-center justify-between">
                    <span>Cliente cadastrado com sucesso!</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateProcess}
                      className="ml-4 border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Criar Processo
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCliente ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
