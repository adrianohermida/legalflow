/**
 * Exemplo de implementação de Progressive Disclosure
 * F1.0 - Demonstra padrões UX de revelação gradual
 *
 * Use este componente como referência para implementar
 * progressive disclosure em outras partes do sistema
 */

import React from "react";
import { FileText, Users, Clock, CreditCard, Settings } from "lucide-react";
import {
  DisclosurePanel,
  DisclosureCard,
  DisclosureGroup,
} from "../ui/disclosure-panel";
import {
  useMultipleDisclosure,
  disclosurePresets,
} from "../../lib/progressive-disclosure";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

// Exemplo 1: Painel de informações do processo com revelação progressiva
export function ProcessoDisclosureExample() {
  const disclosure = useMultipleDisclosure(
    [
      "basicInfo",
      "timeline",
      "documents",
      "parties",
      "financials",
      "monitoring",
    ],
    disclosurePresets.processoDetail,
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-heading text-gray-900 mb-6">
        Processo 0001234-56.2024.8.10.0001
      </h2>

      <DisclosureGroup
        onExpandAll={disclosure.expandAll}
        onCollapseAll={disclosure.collapseAll}
      >
        {/* Informações básicas - sempre visível */}
        <DisclosureCard
          title="Informações Básicas"
          icon={<FileText className="h-5 w-5" />}
          defaultExpanded={disclosure.isExpanded("basicInfo")}
          onToggle={() => disclosure.toggle("basicInfo")}
          headerActions={<Badge variant="secondary">Ativo</Badge>}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tribunal</dt>
              <dd className="text-base text-gray-900">TJAC</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Valor da Causa
              </dt>
              <dd className="text-base text-gray-900">R$ 50.000,00</dd>
            </div>
          </div>
        </DisclosureCard>

        {/* Timeline - expandir sob demanda */}
        <DisclosureCard
          title="Linha do Tempo"
          icon={<Clock className="h-5 w-5" />}
          defaultExpanded={disclosure.isExpanded("timeline")}
          onToggle={() => disclosure.toggle("timeline")}
          headerActions={<Badge variant="outline">12 eventos</Badge>}
        >
          <div className="space-y-3">
            <div className="border-l-2 border-brand-200 pl-4">
              <div className="text-sm font-medium">
                Petição Inicial Protocolada
              </div>
              <div className="text-sm text-gray-500">15/12/2024 14:30</div>
            </div>
            <div className="border-l-2 border-brand-200 pl-4">
              <div className="text-sm font-medium">Citação Expedida</div>
              <div className="text-sm text-gray-500">18/12/2024 10:15</div>
            </div>
          </div>
        </DisclosureCard>

        {/* Documentos - expandir sob demanda */}
        <DisclosureCard
          title="Documentos"
          icon={<FileText className="h-5 w-5" />}
          defaultExpanded={disclosure.isExpanded("documents")}
          onToggle={() => disclosure.toggle("documents")}
          headerActions={<Badge variant="outline">8 arquivos</Badge>}
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm">Petição Inicial.pdf</span>
              <span className="text-xs text-gray-500">2.1 MB</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm">Procuração.pdf</span>
              <span className="text-xs text-gray-500">856 KB</span>
            </div>
          </div>
        </DisclosureCard>

        {/* Partes - expandir sob demanda */}
        <DisclosureCard
          title="Partes Envolvidas"
          icon={<Users className="h-5 w-5" />}
          defaultExpanded={disclosure.isExpanded("parties")}
          onToggle={() => disclosure.toggle("parties")}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Polo Ativo</h4>
              <div className="text-sm text-gray-600">João Silva Santos</div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Polo Passivo</h4>
              <div className="text-sm text-gray-600">Empresa XYZ Ltda</div>
            </div>
          </div>
        </DisclosureCard>

        {/* Financeiro - expandir sob demanda */}
        <DisclosureCard
          title="Informações Financeiras"
          icon={<CreditCard className="h-5 w-5" />}
          defaultExpanded={disclosure.isExpanded("financials")}
          onToggle={() => disclosure.toggle("financials")}
          headerActions={<Badge variant="secondary">R$ 12.500</Badge>}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Honorários</dt>
              <dd className="text-base text-brand-700 font-medium">
                R$ 10.000,00
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Custas</dt>
              <dd className="text-base text-gray-900">R$ 2.500,00</dd>
            </div>
          </div>
        </DisclosureCard>

        {/* Monitoramento - expandir sob demanda */}
        <DisclosureCard
          title="Configurações de Monitoramento"
          icon={<Settings className="h-5 w-5" />}
          defaultExpanded={disclosure.isExpanded("monitoring")}
          onToggle={() => disclosure.toggle("monitoring")}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Notificações por email</span>
              <Badge variant="secondary">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">WhatsApp automático</span>
              <Badge variant="outline">Inativo</Badge>
            </div>
          </div>
        </DisclosureCard>
      </DisclosureGroup>
    </div>
  );
}

// Exemplo 2: Progressive Disclosure em listas/cards simples
export function SimpleDisclosureExample() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-xl font-heading text-gray-900 mb-4">
        Configurações do Sistema
      </h2>

      <DisclosurePanel
        title="Configurações de Notificação"
        icon={<Settings className="h-4 w-4" />}
      >
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Email para novos processos</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" />
            <span className="text-sm">SMS para prazos urgentes</span>
          </label>
        </div>
      </DisclosurePanel>

      <DisclosurePanel
        title="Integrações"
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">PJe</span>
            <Badge variant="secondary">Conectado</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Escavador</span>
            <Badge variant="outline">Desconectado</Badge>
          </div>
        </div>
      </DisclosurePanel>
    </div>
  );
}

// Componente principal para demonstração
export function ProgressiveDisclosureDemo() {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading text-gray-900 mb-2">
          Progressive Disclosure - Exemplos
        </h1>
        <p className="text-gray-600">
          Demonstração dos padrões UX F1.0 para revelação gradual de informações
        </p>
      </div>

      {/* Tabs ou seções para diferentes exemplos */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium mb-4">
            Exemplo: Detalhes do Processo
          </h3>
          <ProcessoDisclosureExample />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">
            Exemplo: Configurações Simples
          </h3>
          <SimpleDisclosureExample />
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mt-8">
        <h4 className="font-medium text-brand-900 mb-2">
          Padrão F1.0 - Progressive Disclosure
        </h4>
        <ul className="text-sm text-brand-700 space-y-1">
          <li>• Informações essenciais sempre visíveis</li>
          <li>• Detalhes expandem sob demanda</li>
          <li>• Estado persiste durante a sessão</li>
          <li>• Animações suaves e acessíveis</li>
          <li>• Controles de expandir/recolher tudo</li>
        </ul>
      </div>
    </div>
  );
}
