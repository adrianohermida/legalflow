/**
 * Responsive Mobile-First Example Component
 * Demonstrates the mobile-first design system implementation
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  ResponsiveGrid,
  CardGrid,
  FormGrid,
  StatsGrid,
  Stack,
  ResponsiveFlex,
  GridItem,
} from "../ui/responsive-grid";
import {
  PageContainer,
  SectionContainer,
  CardContainer,
  HeaderContainer,
  ModalContainer,
  ContentContainer,
} from "../ui/responsive-container";
import {
  useBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useResponsiveValue,
  useSidebarState,
  useResponsiveTable,
  useNavigationMenu,
} from "../../hooks/useResponsive";
import {
  TYPOGRAPHY_PATTERNS,
  COMPONENT_SIZES,
} from "../../lib/responsive-design";
import { cn } from "../../lib/utils";

export default function ResponsiveMobileFirstExample() {
  const [activeDemo, setActiveDemo] = useState<
    "grid" | "container" | "hooks" | "components"
  >("grid");

  // Responsive hooks demonstration
  const currentBreakpoint = useBreakpoint();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  const { isOpen: sidebarOpen, toggleSidebar } = useSidebarState();
  const { showAsCards, showAsTable } = useResponsiveTable();
  const { isMobile: navMobile, isMenuOpen, toggleMenu } = useNavigationMenu();

  // Responsive values demonstration
  const responsiveColumns = useResponsiveValue(
    {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
    },
    1,
  );

  const responsiveSpacing = useResponsiveValue(
    {
      xs: "space-y-4",
      sm: "space-y-6",
      lg: "space-y-8",
    },
    "space-y-4",
  );

  return (
    <PageContainer>
      <Stack spacing="lg">
        {/* Header Section */}
        <HeaderContainer>
          <ResponsiveFlex align="center" justify="between">
            <div>
              <h1 className={TYPOGRAPHY_PATTERNS.h1}>Sistema Mobile-First</h1>
              <p className={cn(TYPOGRAPHY_PATTERNS.body, "text-gray-600 mt-2")}>
                Demonstração do sistema de design responsivo
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:block">
              Breakpoint: {currentBreakpoint}
            </Badge>
          </ResponsiveFlex>
        </HeaderContainer>

        {/* Status Cards */}
        <StatsGrid>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`${isMobile ? "w-8 h-8" : "w-10 h-10"} bg-blue-100 rounded-full flex items-center justify-center`}
                >
                  📱
                </div>
                <div>
                  <div className="font-medium">Mobile</div>
                  <div
                    className={`text-sm ${isMobile ? "text-green-600" : "text-gray-500"}`}
                  >
                    {isMobile ? "Ativo" : "Inativo"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`${isMobile ? "w-8 h-8" : "w-10 h-10"} bg-purple-100 rounded-full flex items-center justify-center`}
                >
                  📟
                </div>
                <div>
                  <div className="font-medium">Tablet</div>
                  <div
                    className={`text-sm ${isTablet ? "text-green-600" : "text-gray-500"}`}
                  >
                    {isTablet ? "Ativo" : "Inativo"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`${isMobile ? "w-8 h-8" : "w-10 h-10"} bg-green-100 rounded-full flex items-center justify-center`}
                >
                  🖥️
                </div>
                <div>
                  <div className="font-medium">Desktop</div>
                  <div
                    className={`text-sm ${isDesktop ? "text-green-600" : "text-gray-500"}`}
                  >
                    {isDesktop ? "Ativo" : "Inativo"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`${isMobile ? "w-8 h-8" : "w-10 h-10"} bg-orange-100 rounded-full flex items-center justify-center`}
                >
                  🎛️
                </div>
                <div>
                  <div className="font-medium">Colunas</div>
                  <div className="text-sm text-gray-600">
                    {responsiveColumns} col{responsiveColumns > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StatsGrid>

        {/* Demo Navigation */}
        <CardContainer>
          <div className="flex flex-wrap gap-2">
            {(["grid", "container", "hooks", "components"] as const).map(
              (demo) => (
                <Button
                  key={demo}
                  variant={activeDemo === demo ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveDemo(demo)}
                  className="capitalize"
                >
                  {demo === "grid"
                    ? "Grids"
                    : demo === "container"
                      ? "Containers"
                      : demo === "hooks"
                        ? "Hooks"
                        : "Componentes"}
                </Button>
              ),
            )}
          </div>
        </CardContainer>

        {/* Demo Content */}
        {activeDemo === "grid" && (
          <SectionContainer>
            <Stack spacing="lg">
              <div>
                <h2 className={TYPOGRAPHY_PATTERNS.h2}>
                  Sistema de Grid Responsivo
                </h2>
                <p
                  className={cn(TYPOGRAPHY_PATTERNS.body, "text-gray-600 mt-2")}
                >
                  Grids que se adaptam automaticamente ao tamanho da tela
                </p>
              </div>

              {/* Card Grid Example */}
              <div>
                <h3 className={TYPOGRAPHY_PATTERNS.h3}>Card Grid</h3>
                <CardGrid className="mt-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl mb-2">🎯</div>
                          <h4 className="font-medium">Item {i + 1}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Grid responsivo mobile-first
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardGrid>
              </div>

              {/* Form Grid Example */}
              <div>
                <h3 className={TYPOGRAPHY_PATTERNS.h3}>Form Grid</h3>
                <FormGrid className="mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nome
                    </label>
                    <Input placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input placeholder="seu@email.com" type="email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Telefone
                    </label>
                    <Input placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Empresa
                    </label>
                    <Input placeholder="Sua empresa" />
                  </div>
                </FormGrid>
              </div>

              {/* Custom Grid Example */}
              <div>
                <h3 className={TYPOGRAPHY_PATTERNS.h3}>Grid Customizado</h3>
                <ResponsiveGrid
                  cols={{
                    xs: 1,
                    sm: 2,
                    md: 3,
                    lg: 4,
                    xl: 6,
                  }}
                  className="mt-4"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <GridItem
                      key={i}
                      span={i === 0 ? 2 : 1}
                      spanSm={i === 0 ? 2 : undefined}
                      spanMd={i === 0 ? 3 : undefined}
                    >
                      <Card>
                        <CardContent className="p-3 text-center">
                          <div className="text-lg mb-1">📊</div>
                          <div className="text-xs">
                            {i === 0 ? "Destacado" : `Item ${i + 1}`}
                          </div>
                        </CardContent>
                      </Card>
                    </GridItem>
                  ))}
                </ResponsiveGrid>
              </div>
            </Stack>
          </SectionContainer>
        )}

        {activeDemo === "container" && (
          <SectionContainer>
            <Stack spacing="lg">
              <div>
                <h2 className={TYPOGRAPHY_PATTERNS.h2}>
                  Sistema de Containers
                </h2>
                <p
                  className={cn(TYPOGRAPHY_PATTERNS.body, "text-gray-600 mt-2")}
                >
                  Containers responsivos com padding consistente
                </p>
              </div>

              <div className="space-y-6">
                <CardContainer>
                  <h3 className={TYPOGRAPHY_PATTERNS.h3}>CardContainer</h3>
                  <p className="text-gray-600 mt-2">
                    Container com padding que se adapta ao tamanho da tela
                  </p>
                </CardContainer>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <ModalContainer size="md">
                    <h3 className={TYPOGRAPHY_PATTERNS.h3}>ModalContainer</h3>
                    <p className="text-gray-600 mt-2">
                      Modal que ajusta seu tamanho baseado no dispositivo
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm">Confirmar</Button>
                      <Button variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </div>
                  </ModalContainer>
                </div>
              </div>
            </Stack>
          </SectionContainer>
        )}

        {activeDemo === "hooks" && (
          <SectionContainer>
            <Stack spacing="lg">
              <div>
                <h2 className={TYPOGRAPHY_PATTERNS.h2}>Hooks Responsivos</h2>
                <p
                  className={cn(TYPOGRAPHY_PATTERNS.body, "text-gray-600 mt-2")}
                >
                  Hooks para gerenciar comportamento responsivo
                </p>
              </div>

              <CardGrid>
                <Card>
                  <CardHeader>
                    <CardTitle>useBreakpoint()</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {currentBreakpoint}
                    </div>
                    <p className="text-sm text-gray-600">
                      Breakpoint atual do dispositivo
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>useSidebarState()</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div
                        className={`text-sm ${sidebarOpen ? "text-green-600" : "text-gray-500"}`}
                      >
                        Status: {sidebarOpen ? "Aberto" : "Fechado"}
                      </div>
                      <Button size="sm" onClick={toggleSidebar}>
                        Toggle Sidebar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>useResponsiveTable()</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        Modo:{" "}
                        {showAsCards ? "Cards (Mobile)" : "Tabela (Desktop)"}
                      </div>
                      <Badge variant={showAsCards ? "default" : "secondary"}>
                        {showAsCards ? "📱 Mobile" : "🖥️ Desktop"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>useNavigationMenu()</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        Mobile: {navMobile ? "Sim" : "Não"}
                      </div>
                      <div className="text-sm">
                        Menu: {isMenuOpen ? "Aberto" : "Fechado"}
                      </div>
                      <Button
                        size="sm"
                        onClick={toggleMenu}
                        disabled={!navMobile}
                      >
                        Toggle Menu
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardGrid>
            </Stack>
          </SectionContainer>
        )}

        {activeDemo === "components" && (
          <SectionContainer>
            <Stack spacing="lg">
              <div>
                <h2 className={TYPOGRAPHY_PATTERNS.h2}>
                  Componentes Responsivos
                </h2>
                <p
                  className={cn(TYPOGRAPHY_PATTERNS.body, "text-gray-600 mt-2")}
                >
                  Componentes que se adaptam automaticamente
                </p>
              </div>

              <div className="space-y-8">
                {/* Typography Scale */}
                <div>
                  <h3 className={TYPOGRAPHY_PATTERNS.h3}>
                    Tipografia Responsiva
                  </h3>
                  <div className={responsiveSpacing}>
                    <h1 className={TYPOGRAPHY_PATTERNS.h1}>
                      Heading 1 - Mobile First
                    </h1>
                    <h2 className={TYPOGRAPHY_PATTERNS.h2}>
                      Heading 2 - Escalável
                    </h2>
                    <h3 className={TYPOGRAPHY_PATTERNS.h3}>
                      Heading 3 - Adaptável
                    </h3>
                    <p className={TYPOGRAPHY_PATTERNS.body}>
                      Texto corpo que se ajusta conforme o dispositivo, mantendo
                      legibilidade em todos os tamanhos de tela.
                    </p>
                    <p className={TYPOGRAPHY_PATTERNS.bodySmall}>
                      Texto pequeno para informações secundárias.
                    </p>
                  </div>
                </div>

                {/* Button Sizes */}
                <div>
                  <h3 className={TYPOGRAPHY_PATTERNS.h3}>Botões Responsivos</h3>
                  <ResponsiveFlex gap="md" className="mt-4">
                    <Button className={COMPONENT_SIZES.button.sm}>
                      Pequeno
                    </Button>
                    <Button className={COMPONENT_SIZES.button.md}>Médio</Button>
                    <Button className={COMPONENT_SIZES.button.lg}>
                      Grande
                    </Button>
                  </ResponsiveFlex>
                </div>

                {/* Responsive Flex */}
                <div>
                  <h3 className={TYPOGRAPHY_PATTERNS.h3}>Layout Flexível</h3>
                  <ResponsiveFlex
                    direction="column"
                    align="stretch"
                    className="mt-4"
                  >
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium">Coluna 1</h4>
                        <p className="text-sm text-gray-600 mt-2">
                          Este layout muda de coluna para linha baseado no
                          tamanho da tela.
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium">Coluna 2</h4>
                        <p className="text-sm text-gray-600 mt-2">
                          Mobile: Stacked verticalmente. Desktop: Lado a lado.
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium">Coluna 3</h4>
                        <p className="text-sm text-gray-600 mt-2">
                          Adaptação automática baseada em breakpoints.
                        </p>
                      </CardContent>
                    </Card>
                  </ResponsiveFlex>
                </div>
              </div>
            </Stack>
          </SectionContainer>
        )}

        {/* Footer Info */}
        <CardContainer>
          <div className="text-center">
            <h3 className={TYPOGRAPHY_PATTERNS.h4}>
              Sistema Mobile-First Implementado
            </h3>
            <p
              className={cn(
                TYPOGRAPHY_PATTERNS.bodySmall,
                "text-gray-600 mt-2",
              )}
            >
              Breakpoints: xs(475px) • sm(640px) • md(768px) • lg(1024px) •
              xl(1280px) • 2xl(1536px)
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline">Mobile-First</Badge>
              <Badge variant="outline">Responsive Design</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
            </div>
          </div>
        </CardContainer>
      </Stack>
    </PageContainer>
  );
}
