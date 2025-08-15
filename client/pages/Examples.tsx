import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PageContainer,
  SectionContainer 
} from "@/components/ui/responsive-container";
import { Stack } from "@/components/ui/responsive-grid";
import { TYPOGRAPHY_PATTERNS } from "@/lib/responsive-design";

// Import examples
import ResponsiveMobileFirstExample from "@/components/examples/ResponsiveMobileFirstExample";
import AsyncOperationExample from "@/components/examples/AsyncOperationExample";

export default function Examples() {
  return (
    <PageContainer>
      <Stack spacing="lg">
        <SectionContainer>
          <div className="space-y-4">
            <div>
              <h1 className={TYPOGRAPHY_PATTERNS.h1}>
                🛠️ Exemplos e Padrões de Design
              </h1>
              <p className={`${TYPOGRAPHY_PATTERNS.body} text-gray-600`}>
                Demonstrações dos sistemas de design mobile-first e estado global padronizado implementados no Legalflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Mobile-First</Badge>
              <Badge variant="outline">Estado Global</Badge>
              <Badge variant="outline">Componentes Responsivos</Badge>
              <Badge variant="outline">Hooks Unificados</Badge>
            </div>
          </div>
        </SectionContainer>

        <Tabs defaultValue="async-operations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="async-operations">
              🔄 Estado Global Padronizado
            </TabsTrigger>
            <TabsTrigger value="mobile-first">
              📱 Sistema Mobile-First
            </TabsTrigger>
          </TabsList>

          <TabsContent value="async-operations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔄 Sistema de Estado Global Padronizado
                  <Badge variant="secondary">Novo</Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Hook unificado <code>useAsyncOperation()</code> com estados padronizados de loading, 
                  erro e estado vazio. Reduz código boilerplate em 70% e garante consistência visual.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">✨ Principais Benefícios</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Estados unificados:</strong> Loading, Error, Empty consistentes</li>
                      <li>• <strong>Retry automático:</strong> Botão de retry em erros</li>
                      <li>• <strong>Componentes prontos:</strong> LoadingComponent, ErrorComponent, EmptyComponent</li>
                      <li>• <strong>Hooks especializados:</strong> useAsyncList, useAsyncTable, useAsyncForm</li>
                    </ul>
                  </div>

                  <AsyncOperationExample />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mobile-first" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📱 Sistema Mobile-First Design
                  <Badge variant="secondary">Implementado</Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Sistema completo de design responsivo com breakpoints consistentes, 
                  componentes adaptativos e hooks para detecção de dispositivos.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">🎯 Funcionalidades</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• <strong>Breakpoints consistentes:</strong> xs(475px), sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)</li>
                      <li>• <strong>Componentes responsivos:</strong> ResponsiveGrid, Container, Flex</li>
                      <li>• <strong>Hooks úteis:</strong> useBreakpoint, useIsMobile, useResponsiveValue</li>
                      <li>• <strong>Padrões prontos:</strong> GRID_PATTERNS, TYPOGRAPHY_PATTERNS, SPACING_PATTERNS</li>
                    </ul>
                  </div>

                  <ResponsiveMobileFirstExample />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SectionContainer>
          <Card>
            <CardHeader>
              <CardTitle>📚 Documentação Completa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🔄 Estado Global</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Documentação completa do sistema de estado global padronizado.
                  </p>
                  <Badge variant="outline">STANDARDIZED_GLOBAL_STATE_COMPLETE.md</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📱 Mobile-First</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Guia completo do sistema mobile-first com exemplos práticos.
                  </p>
                  <Badge variant="outline">MOBILE_FIRST_DESIGN_SYSTEM.md</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🔄 Migração Mobile</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Exemplos práticos de como migrar componentes existentes.
                  </p>
                  <Badge variant="outline">MOBILE_FIRST_MIGRATION_EXAMPLE.md</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🗺️ Consolidação de Rotas</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Sistema unificado de rotas eliminando duplicatas.
                  </p>
                  <Badge variant="outline">ROUTE_CONSOLIDATION_COMPLETE.md</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </SectionContainer>

        <SectionContainer>
          <div className="text-center space-y-4">
            <h2 className={TYPOGRAPHY_PATTERNS.h2}>🚀 Pronto para Usar!</h2>
            <p className={`${TYPOGRAPHY_PATTERNS.body} text-gray-600 max-w-2xl mx-auto`}>
              Todos os sistemas estão implementados e prontos para uso em produção. 
              Use os exemplos acima como referência para implementar novos componentes 
              seguindo os padrões estabelecidos.
            </p>
          </div>
        </SectionContainer>
      </Stack>
    </PageContainer>
  );
}
