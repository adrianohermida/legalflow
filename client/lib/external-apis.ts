interface DirectDataResponse {
  metaDados: {
    mensagem: string;
  };
  retorno: {
    cpf: string;
    nome: string;
    sexo: string;
    dataNascimento: string;
    nomeMae: string;
    idade: number;
    signo: string;
    telefones: Array<{
      operadora: string;
      tipoTelefone: string;
      whatsApp: boolean;
      telemarketingBloqueado: boolean;
      telefoneComDDD: string;
    }>;
    enderecos: Array<{
      logradouro: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    }>;
    emails: Array<{
      enderecoEmail: string;
    }>;
    rendaEstimada: number;
    rendaFaixaSalarial: string;
  };
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

const DIRECT_DATA_TOKEN = "4DF80EC0-61AE-43CB-B8B6-334CAB72D3D1";
const DIRECT_DATA_BASE_URL = "https://apiv3.directd.com.br/api";

export const directDataApi = {
  async consultarCPF(cpf: string): Promise<DirectDataResponse | null> {
    try {
      const cleanCpf = cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        throw new Error("CPF deve ter 11 dígitos");
      }

      const response = await fetch(
        `${DIRECT_DATA_BASE_URL}/CadastroPessoaFisica?CPF=${cleanCpf}&TOKEN=${DIRECT_DATA_TOKEN}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Erro na consulta: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.metaDados?.mensagem !== "Sucesso") {
        throw new Error(data.metaDados?.mensagem || "Erro na consulta CPF");
      }

      return data;
    } catch (error) {
      console.error("Erro ao consultar CPF:", error);
      return null;
    }
  },

  extractWhatsAppFromData(data: DirectDataResponse): string | null {
    const whatsappPhone = data.retorno.telefones?.find(
      (phone) => phone.whatsApp && phone.telefoneComDDD,
    );
    return whatsappPhone?.telefoneComDDD || null;
  },

  extractMainEmailFromData(data: DirectDataResponse): string | null {
    return data.retorno.emails?.[0]?.enderecoEmail || null;
  },

  extractMainAddressFromData(data: DirectDataResponse) {
    const address = data.retorno.enderecos?.[0];
    if (!address) return null;

    return {
      logradouro: address.logradouro,
      numero: address.numero,
      complemento: address.complemento,
      bairro: address.bairro,
      cidade: address.cidade,
      uf: address.uf,
      cep: address.cep,
    };
  },
};

export const viaCepApi = {
  async consultarCEP(cep: string): Promise<ViaCepResponse | null> {
    try {
      const cleanCep = cep.replace(/\D/g, "");
      if (cleanCep.length !== 8) {
        throw new Error("CEP deve ter 8 dígitos");
      }

      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Erro na consulta CEP: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.erro) {
        throw new Error("CEP não encontrado");
      }

      return data;
    } catch (error) {
      console.error("Erro ao consultar CEP:", error);
      return null;
    }
  },

  formatCEP(cep: string): string {
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8) {
      return clean.replace(/(\d{5})(\d{3})/, "$1-$2");
    }
    return cep;
  },
};

export const cpfUtils = {
  format(cpf: string): string {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return cpf;
  },

  validate(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, "");

    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false; // All same digits

    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(clean.charAt(i)) * (10 - i);
    }
    let checkDigit1 = 11 - (sum % 11);
    if (checkDigit1 === 10 || checkDigit1 === 11) checkDigit1 = 0;

    if (checkDigit1 !== parseInt(clean.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(clean.charAt(i)) * (11 - i);
    }
    let checkDigit2 = 11 - (sum % 11);
    if (checkDigit2 === 10 || checkDigit2 === 11) checkDigit2 = 0;

    return checkDigit2 === parseInt(clean.charAt(10));
  },
};

export const cnpjUtils = {
  format(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length === 14) {
      return clean.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
      );
    }
    return cnpj;
  },

  validate(cnpj: string): boolean {
    const clean = cnpj.replace(/\D/g, "");

    if (clean.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(clean)) return false; // All same digits

    // Validate check digits
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean.charAt(i)) * weights1[i];
    }
    let checkDigit1 = sum % 11;
    checkDigit1 = checkDigit1 < 2 ? 0 : 11 - checkDigit1;

    if (checkDigit1 !== parseInt(clean.charAt(12))) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(clean.charAt(i)) * weights2[i];
    }
    let checkDigit2 = sum % 11;
    checkDigit2 = checkDigit2 < 2 ? 0 : 11 - checkDigit2;

    return checkDigit2 === parseInt(clean.charAt(13));
  },
};
