// ============================================
// 🇧🇷 PHASE 5 - i18n & Locale Utilities
// ============================================
// File: client/lib/locale.ts
// Description: Internationalization and timezone utilities for pt-BR

// Default timezone for Brazil (Manaus as specified)
export const DEFAULT_TIMEZONE = "America/Manaus";

// Locale configuration
export const LOCALE_CONFIG = {
  locale: "pt-BR",
  timezone: DEFAULT_TIMEZONE,
  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  timeFormat: "HH:mm",
  dateTimeFormat: "dd/MM/yyyy HH:mm",
} as const;

// ============================================
// Date & Time Formatting
// ============================================

/**
 * Format date in pt-BR locale with Manaus timezone
 */
export const formatDate = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return dateObj.toLocaleDateString("pt-BR", {
    timeZone: DEFAULT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
};

/**
 * Format time in pt-BR locale with Manaus timezone
 */
export const formatTime = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return dateObj.toLocaleTimeString("pt-BR", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
};

/**
 * Format date and time in pt-BR locale with Manaus timezone
 */
export const formatDateTime = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return dateObj.toLocaleString("pt-BR", {
    timeZone: DEFAULT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
};

/**
 * Format relative time (e.g., "há 2 horas")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return "agora";
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800)
    return `há ${Math.floor(diffInSeconds / 86400)} dias`;

  return formatDate(dateObj);
};

// ============================================
// Currency Formatting
// ============================================

/**
 * Format currency in BRL (Brazilian Real)
 */
export const formatCurrency = (
  amount: number,
  options?: Intl.NumberFormatOptions,
): string => {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
};

/**
 * Format percentage in pt-BR format
 */
export const formatPercentage = (
  value: number,
  options?: Intl.NumberFormatOptions,
): string => {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  });
};

/**
 * Format number in pt-BR format
 */
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
): string => {
  return value.toLocaleString("pt-BR", options);
};

// ============================================
// Phone Number Formatting
// ============================================

/**
 * Format Brazilian phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 11) {
    // Mobile: (11) 99999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Landline: (11) 9999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone; // Return as-is if format not recognized
};

// ============================================
// CPF/CNPJ Formatting
// ============================================

/**
 * Format CPF/CNPJ
 */
export const formatCpfCnpj = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");

  if (cleaned.length === 11) {
    // CPF: 123.456.789-00
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 14) {
    // CNPJ: 12.345.678/0001-90
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }

  return value; // Return as-is if format not recognized
};

// ============================================
// i18n Strings
// ============================================

export const STRINGS = {
  // Common
  loading: "Carregando...",
  error: "Erro",
  success: "Sucesso",
  cancel: "Cancelar",
  save: "Salvar",
  delete: "Excluir",
  edit: "Editar",
  create: "Criar",
  close: "Fechar",
  back: "Voltar",
  next: "Próximo",
  previous: "Anterior",
  yes: "Sim",
  no: "Não",

  // Time
  now: "agora",
  today: "hoje",
  yesterday: "ontem",
  tomorrow: "amanhã",

  // Status
  active: "Ativo",
  inactive: "Inativo",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",

  // Actions
  login: "Entrar",
  logout: "Sair",
  register: "Cadastrar",
  submit: "Enviar",
  search: "Buscar",
  filter: "Filtrar",
  export: "Exportar",
  import: "Importar",
  download: "Baixar",
  upload: "Enviar",

  // Validation
  required: "Campo obrigatório",
  invalid_email: "E-mail inválido",
  invalid_phone: "Telefone inválido",
  invalid_cpf: "CPF inválido",
  invalid_cnpj: "CNPJ inválido",
  password_too_short: "Senha muito curta",

  // Accessibility
  skip_to_content: "Pular para o conteúdo",
  screen_reader_only: "Apenas para leitores de tela",
  loading_content: "Carregando conteúdo",
  error_occurred: "Ocorreu um erro",

  // Time units
  seconds: "segundos",
  minutes: "minutos",
  hours: "horas",
  days: "dias",
  weeks: "semanas",
  months: "meses",
  years: "anos",

  // Business terms
  processo: "Processo",
  processos: "Processos",
  cliente: "Cliente",
  clientes: "Clientes",
  ticket: "Ticket",
  tickets: "Tickets",
  jornada: "Jornada",
  jornadas: "Jornadas",
  atividade: "Atividade",
  atividades: "Atividades",
  agenda: "Agenda",
  financeiro: "Financeiro",
  relatorio: "Relatório",
  relatorios: "Relatórios",
} as const;

// ============================================
// Pluralization
// ============================================

/**
 * Simple pluralization for Portuguese
 */
export const pluralize = (
  count: number,
  singular: string,
  plural?: string,
): string => {
  if (count === 1) return `${count} ${singular}`;

  if (plural) return `${count} ${plural}`;

  // Simple rule: add 's' if doesn't end with 's'
  const pluralForm = singular.endsWith("s") ? singular : `${singular}s`;
  return `${count} ${pluralForm}`;
};

// ============================================
// Timezone Utilities
// ============================================

/**
 * Get current time in Manaus timezone
 */
export const getCurrentTimeInManaus = (): Date => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: DEFAULT_TIMEZONE }),
  );
};

/**
 * Convert UTC to Manaus timezone
 */
export const utcToManaus = (utcDate: string | Date): Date => {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString("en-US", { timeZone: DEFAULT_TIMEZONE }));
};

/**
 * Check if date is business hours in Manaus (8:00 - 18:00)
 */
export const isBusinessHours = (date?: Date): boolean => {
  const manausTime = date ? utcToManaus(date) : getCurrentTimeInManaus();
  const hour = manausTime.getHours();
  const day = manausTime.getDay(); // 0 = Sunday, 6 = Saturday

  // Monday to Friday, 8 AM to 6 PM
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
};

// ============================================
// Export all utilities
// ============================================

export const locale = {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatPhoneNumber,
  formatCpfCnpj,
  pluralize,
  getCurrentTimeInManaus,
  utcToManaus,
  isBusinessHours,
  STRINGS,
  LOCALE_CONFIG,
} as const;

export default locale;
