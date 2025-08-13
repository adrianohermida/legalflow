import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useTheme } from '../hooks/useTheme';
import { APPROVED_BRAND_COLORS, BLOCKED_COLORS } from '../lib/theme-config';
import { Sun, Moon, Palette, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function BrandingControl() {
  const { mode, toggleMode, colors, isColorApproved, getApprovedColor } = useTheme();
  const [testColor, setTestColor] = useState('#285245');
  
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-theme-text mb-2">
          Controle de Branding
        </h1>
        <p className="text-theme-text-secondary">
          Sistema centralizado de cores e temas - Zero amarelo garantido
        </p>
      </div>
      
      {/* Theme Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {mode === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            Modo de Tema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Label htmlFor="theme-mode">Modo {mode === 'light' ? 'Claro' : 'Escuro'}</Label>
            <Switch
              id="theme-mode"
              checked={mode === 'dark'}
              onCheckedChange={toggleMode}
            />
          </div>
          <p className="text-sm text-theme-text-muted mt-2">
            Alterna entre modo claro e escuro automaticamente aplicado em todo o sistema
          </p>
        </CardContent>
      </Card>
      
      {/* Color Validation Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Validador de Cores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="color"
              value={testColor}
              onChange={(e) => setTestColor(e.target.value)}
              className="w-16 h-10 p-1 rounded"
            />
            <Input
              type="text"
              value={testColor}
              onChange={(e) => setTestColor(e.target.value)}
              placeholder="#285245"
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              {isColorApproved(testColor) ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Aprovada
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <XCircle className="w-3 h-3 mr-1" />
                  Bloqueada
                </Badge>
              )}
            </div>
          </div>
          <div
            className="w-full h-16 rounded border"
            style={{ backgroundColor: getApprovedColor(testColor) }}
          />
          <p className="text-sm text-theme-text-muted">
            Cor final aplicada: <code>{getApprovedColor(testColor)}</code>
          </p>
        </CardContent>
      </Card>
      
      {/* Approved Colors Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Paleta Aprovada - Hermida Maia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primary Colors */}
            <div>
              <h4 className="font-medium mb-2">Verde Principal</h4>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(APPROVED_BRAND_COLORS.primary).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-full h-12 rounded border border-gray-200"
                      style={{ backgroundColor: value }}
                    />
                    <div className="text-xs mt-1">
                      <div className="font-medium">{key}</div>
                      <div className="text-gray-500">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Status Colors */}
            <div>
              <h4 className="font-medium mb-2">Cores de Status</h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(APPROVED_BRAND_COLORS.status).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-full h-12 rounded border border-gray-200"
                      style={{ backgroundColor: value }}
                    />
                    <div className="text-xs mt-1">
                      <div className="font-medium capitalize">{key}</div>
                      <div className="text-gray-500">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Blocked Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cores Bloqueadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {BLOCKED_COLORS.slice(0, 12).map((color, index) => (
              <div key={index} className="text-center">
                <div
                  className="w-full h-8 rounded border border-red-200 relative"
                  style={{ backgroundColor: color }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div className="text-xs mt-1 text-red-600">{color}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-red-600 mt-4">
            ⚠️ Estas cores são automaticamente bloqueadas e substituídas pela cor principal
          </p>
        </CardContent>
      </Card>
      
      {/* Current Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Cores do Tema Atual ({mode})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(colors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: value }}
                />
                <div>
                  <div className="font-medium">{key}</div>
                  <div className="text-sm text-gray-500">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
