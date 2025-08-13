import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SupabaseSetup() {
  const [config, setConfig] = useState({
    url: '',
    anonKey: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already configured
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (url && key && url !== 'your-supabase-url' && key !== 'your-supabase-anon-key') {
      setConfig({ url, anonKey: key });
      testConnection(url, key);
    }
  }, []);

  const testConnection = async (url?: string, key?: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Test connection
      const { data, error } = await supabase
        .from('clientes')
        .select('count(*)')
        .limit(1);

      if (error) {
        setError(`Erro de conex��o: ${error.message}`);
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
    } catch (err: any) {
      setError(`Falha na conexão: ${err.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!config.url || !config.anonKey) {
      setError('Preencha a URL e a chave anônima');
      return;
    }

    // In a real deployment, these would be set via environment variables
    // This is just for development/demo purposes
    localStorage.setItem('supabase_config', JSON.stringify(config));
    testConnection();
  };

  if (isConnected) {
    return (
      <Alert className="border-success bg-success-50">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-green-800">
          ✅ Conectado ao Supabase com sucesso! O sistema está pronto para uso.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          Configuração do Supabase
        </CardTitle>
        <CardDescription>
          Configure a conexão com seu banco de dados Supabase para começar a usar o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-brand-50 p-4 rounded-lg">
          <h4 className="font-medium text-brand-900 mb-2">Como obter as credenciais:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">supabase.com</a></li>
            <li>Crie um novo projeto ou acesse um existente</li>
            <li>Vá em Settings → API</li>
            <li>Copie a "Project URL" e a "anon public" key</li>
            <li>Execute o SQL schema fornecido no projeto</li>
          </ol>
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">URL do Projeto Supabase</Label>
            <Input
              id="supabase-url"
              type="url"
              placeholder="https://seu-projeto.supabase.co"
              value={config.url}
              onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-key">Chave Anônima (anon public)</Label>
            <Input
              id="supabase-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={config.anonKey}
              onChange={(e) => setConfig(prev => ({ ...prev, anonKey: e.target.value }))}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleSave} 
            disabled={isLoading || !config.url || !config.anonKey}
            className="w-full"
          >
            {isLoading ? 'Testando conexão...' : 'Conectar ao Supabase'}
          </Button>
        </div>

        {/* Additional Resources */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Recursos Úteis:</h4>
          <div className="space-y-1">
            <a 
              href="https://supabase.com/docs/guides/getting-started" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              Guia de Início Rápido do Supabase
            </a>
            <a 
              href="https://supabase.com/docs/guides/database/tables" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              Como Criar Tabelas no Supabase
            </a>
          </div>
        </div>

        {/* Development Note */}
        <Alert>
          <AlertDescription>
            <strong>Nota:</strong> Em produção, configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY 
            em vez de usar este formulário.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
