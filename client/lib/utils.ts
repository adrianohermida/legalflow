import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatting utilities
export const formatCNJ = (cnj: string): string => {
  const clean = cnj.replace(/\D/g, '');
  if (clean.length === 20) {
    return clean.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
  }
  return cnj;
};

export const formatCPFCNPJ = (cpfcnpj: string): string => {
  const clean = cpfcnpj.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cpfcnpj;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR');
};
