import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useNeutralTheme, isColorSafe, getSafeColor } from '../hooks/useNeutralTheme';
import { FORBIDDEN_COLORS } from '../lib/neutral-theme';
import { Sun, Moon, Palette, Shield, CheckCircle, XCircle, AlertTriangle, Settings } from 'lucide-react';

export function AdminBrandingConfig() {
  const { mode, toggleMode, colors, adminConfig, updateAdminConfig } = useNeutralTheme();
  const [testColor, setTestColor] = useState('#000000');
  const [showForbiddenColors, setShowForbiddenColors] = useState(false);
  
  const handleBrandingToggle = (enabled: boolean) => {
    updateAdminConfig({ enabled });
  };
  
  const handleColorChange = (field: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) => {
    updateAdminConfig({ [field]: value });
  };
  
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto bg-white">
      {/* Header */}
      <div className="text-center border-b pb-6">
        <div className="flex items-center justify-center mb-4">
          <Settings className="h-8 w-8 mr-3 text-gray-900" />
          <h1 className="text-4xl font-bold text-gray-900">
            Configuração de Branding
          </h1>
        </div>
        <p className="text-gray-600 text-lg">
          Sistema neutro absoluto - Zero amarelo garantido
        </p>
        <Badge variant="outline" className="mt-2 bg-green-50 text-green-800 border-green-200">
          ✅ Modo Seguro Ativo
        </Badge>
      </div>

      {/* Status do Sistema */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Shield className="h-5 w-5 mr-2" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-gray-900">Tema Neutro Ativo</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-gray-900">Validação Anti-Amarelo</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-gray-900">{FORBIDDEN_COLORS.length} Cores Bloqueadas</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-toggle" className="text-gray-900">Modo Escuro</Label>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4 text-gray-600" />
                  <Switch
                    id="theme-toggle"
                    checked={mode === 'dark'}
                    onCheckedChange={toggleMode}
                  />
                  <Moon className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Tema atual: <strong className="text-gray-900">{mode === 'light' ? 'Claro' : 'Escuro'}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Branding Admin */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Palette className="h-5 w-5 mr-2" />
            Branding Personalizado (Superadmin)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle para ativar branding personalizado */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="branding-enabled" className="text-gray-900 font-semibold">
                Ativar Branding Personalizado
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Permite escolher cores além do tema neutro padrão
              </p>
            </div>
            <Switch
              id="branding-enabled"
              checked={adminConfig.enabled}
              onCheckedChange={handleBrandingToggle}
            />
          </div>

          {/* Configurações de cores (só se branding estiver ativo) */}
          {adminConfig.enabled && (
            <div className="space-y-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Cores Personalizadas</h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primary-color" className="text-gray-900">Cor Primária</Label>
                  <div className="flex mt-1">
                    <Input
                      id="primary-color"
                      type="color"
                      value={adminConfig.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-16 h-10 mr-2"
                    />
                    <Input
                      type="text"
                      value={adminConfig.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="flex-1"
                      placeholder="#000000"
                    />
                  </div>
                  <div className="mt-1">
                    {isColorSafe(adminConfig.primaryColor) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Segura
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Bloqueada
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondary-color" className="text-gray-900">Cor Secundária</Label>
                  <div className="flex mt-1">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={adminConfig.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="w-16 h-10 mr-2"
                    />
                    <Input
                      type="text"
                      value={adminConfig.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="flex-1"
                      placeholder="#6b7280"
                    />
                  </div>
                  <div className="mt-1">
                    {isColorSafe(adminConfig.secondaryColor) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Segura
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Bloqueada
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="accent-color" className="text-gray-900">Cor de Destaque</Label>
                  <div className="flex mt-1">
                    <Input
                      id="accent-color"
                      type="color"
                      value={adminConfig.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="w-16 h-10 mr-2"
                    />
                    <Input
                      type="text"
                      value={adminConfig.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="flex-1"
                      placeholder="#1f2937"
                    />
                  </div>
                  <div className="mt-1">
                    {isColorSafe(adminConfig.accentColor) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Segura
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Bloqueada
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testador de Cores */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Testador de Cores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Input
              type="text"
              value={testColor}
              onChange={(e) => setTestColor(e.target.value)}
              placeholder="Digite uma cor para testar (#000000)"
              className="flex-1"
            />
            <div
              className="w-12 h-12 border-2 border-gray-300 rounded"
              style={{ backgroundColor: isColorSafe(testColor) ? testColor : '#ffffff' }}
            />
            <div>
              {isColorSafe(testColor) ? (
                <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Cor Segura
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  Cor Bloqueada
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Cores Proibidas */}
      <Card className="border-2 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-red-600" />
              Cores Proibidas ({FORBIDDEN_COLORS.length})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForbiddenColors(!showForbiddenColors)}
            >
              {showForbiddenColors ? 'Ocultar' : 'Mostrar'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showForbiddenColors && (
          <CardContent>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {FORBIDDEN_COLORS.map((color, index) => (
                <div key={index} className="text-center">
                  <div
                    className="w-8 h-8 border border-gray-300 rounded mx-auto mb-1"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <div className="text-xs text-gray-600 font-mono">
                    {color.substring(1, 4)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-red-600 mt-4 p-3 bg-red-50 rounded">
              ⚠️ Essas cores estão permanentemente bloqueadas para prevenir aparência amarelada
            </p>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          <p className="text-sm text-gray-600">
            Sistema neutro ativo - Nenhuma cor amarela pode ser aplicada
          </p>
        </div>
        <div className="space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              updateAdminConfig({
                enabled: false,
                primaryColor: '#000000',
                secondaryColor: '#6b7280',
                accentColor: '#1f2937'
              });
            }}
          >
            Resetar para Neutro
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="bg-black text-white hover:bg-gray-800"
          >
            Aplicar Mudanças
          </Button>
        </div>
      </div>
    </div>
  );
}
