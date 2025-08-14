import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CreditCard, Settings, Check, AlertCircle, Loader2, TestTube } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../hooks/use-toast';

interface StripeConfig {
  secret_key: string;
  webhook_secret: string;
  mode: 'test' | 'live';
  active: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  testing: boolean;
  error?: string;
  accountInfo?: {
    id: string;
    email: string;
    country: string;
    currency: string;
  };
}

export default function StripeSettings() {
  const [config, setConfig] = useState<StripeConfig>({
    secret_key: '',
    webhook_secret: '',
    mode: 'test',
    active: false
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    testing: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStripeConfig();
  }, []);

  const loadStripeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('api_credentials')
        .select('*')
        .eq('provider', 'stripe')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          secret_key: data.secret_key || '',
          webhook_secret: data.webhook_secret || '',
          mode: data.mode || 'test',
          active: data.active || false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração Stripe:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configuração do Stripe',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveStripeConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('api_credentials')
        .upsert({
          provider: 'stripe',
          secret_key: config.secret_key,
          webhook_secret: config.webhook_secret,
          mode: config.mode,
          active: config.active,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configuração do Stripe salva com sucesso'
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configuração do Stripe',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const testStripeConnection = async () => {
    if (!config.secret_key) {
      toast({
        title: 'Erro',
        description: 'Secret Key é obrigatória para testar a conexão',
        variant: 'destructive'
      });
      return;
    }

    setConnectionStatus(prev => ({ ...prev, testing: true, error: undefined }));

    try {
      const response = await fetch('/api/stripe/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret_key: config.secret_key,
          mode: config.mode
        })
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus({
          connected: true,
          testing: false,
          accountInfo: result.account
        });
        toast({
          title: 'Sucesso',
          description: 'Conexão com Stripe estabelecida com sucesso'
        });
      } else {
        setConnectionStatus({
          connected: false,
          testing: false,
          error: result.error
        });
        toast({
          title: 'Erro de Conexão',
          description: result.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setConnectionStatus({
        connected: false,
        testing: false,
        error: 'Falha na comunicação com o servidor'
      });
      toast({
        title: 'Erro',
        description: 'Falha ao testar conexão com Stripe',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Configuração Stripe
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure a integração com Stripe para pagamentos e assinaturas
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Teste de Conexão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais Stripe</CardTitle>
              <CardDescription>
                Configure suas chaves API do Stripe para integração com pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secret_key">Secret Key *</Label>
                <Input
                  id="secret_key"
                  type="password"
                  placeholder="sk_test_... ou sk_live_..."
                  value={config.secret_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, secret_key: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Chave secreta obtida no painel do Stripe
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_secret">Webhook Secret</Label>
                <Input
                  id="webhook_secret"
                  type="password"
                  placeholder="whsec_..."
                  value={config.webhook_secret}
                  onChange={(e) => setConfig(prev => ({ ...prev, webhook_secret: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Secret do endpoint webhook (opcional, mas recomendado para segurança)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode">Modo</Label>
                <Select value={config.mode} onValueChange={(value: 'test' | 'live') => 
                  setConfig(prev => ({ ...prev, mode: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">TEST</Badge>
                        Modo de Teste
                      </div>
                    </SelectItem>
                    <SelectItem value="live">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">LIVE</Badge>
                        Modo de Produção
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={config.active}
                  onChange={(e) => setConfig(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="active">Ativar integração Stripe</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={saveStripeConfig}
                  disabled={saving || !config.secret_key}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configuração'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Conexão</CardTitle>
              <CardDescription>
                Verifique se a conexão com o Stripe está funcionando corretamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionStatus.connected && connectionStatus.accountInfo && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Conexão estabelecida com sucesso!</strong></p>
                      <p>Account ID: {connectionStatus.accountInfo.id}</p>
                      <p>Email: {connectionStatus.accountInfo.email}</p>
                      <p>País: {connectionStatus.accountInfo.country}</p>
                      <p>Moeda padrão: {connectionStatus.accountInfo.currency.toUpperCase()}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {connectionStatus.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erro de conexão:</strong> {connectionStatus.error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-2">
                <Button 
                  onClick={testStripeConnection}
                  disabled={connectionStatus.testing || !config.secret_key}
                  variant={connectionStatus.connected ? "outline" : "default"}
                >
                  {connectionStatus.testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                {connectionStatus.connected && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Conectado
                  </Badge>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>O que este teste verifica:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Validade da Secret Key</li>
                  <li>Informações da conta Stripe</li>
                  <li>Permissões de acesso à API</li>
                  <li>Status da conta (ativa/suspensa)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                URL para configurar no painel do Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Webhook Endpoint URL</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}/api/stripe/webhook`}
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/stripe/webhook`);
                      toast({
                        title: 'Copiado!',
                        description: 'URL do webhook copiada para a área de transferência'
                      });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use esta URL no painel do Stripe para configurar webhooks
                </p>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Eventos recomendados:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>customer.created</li>
                  <li>customer.updated</li>
                  <li>customer.subscription.created</li>
                  <li>customer.subscription.updated</li>
                  <li>customer.subscription.deleted</li>
                  <li>invoice.payment_succeeded</li>
                  <li>invoice.payment_failed</li>
                  <li>checkout.session.completed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
