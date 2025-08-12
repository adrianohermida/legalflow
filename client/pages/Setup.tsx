import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ExternalLink, Database, Key, CheckCircle } from 'lucide-react';

const Setup = () => {
  const [credentials, setCredentials] = useState({
    url: '',
    anonKey: ''
  });
  const [showInstructions, setShowInstructions] = useState(false);

  const validateCredentials = () => {
    const { url, anonKey } = credentials;
    return url.startsWith('https://') && 
           url.includes('.supabase.co') && 
           anonKey.length > 50;
  };

  const handleSave = () => {
    if (!validateCredentials()) {
      alert('Por favor, verifique se a URL e a chave estão corretas.');
      return;
    }

    // Show instructions to user
    setShowInstructions(true);
  };

  const copyEnvContent = () => {
    const envContent = `VITE_SUPABASE_URL=${credentials.url}
VITE_SUPABASE_ANON_KEY=${credentials.anonKey}
VITE_DEV_MODE=true`;
    
    navigator.clipboard.writeText(envContent);
    alert('Conteúdo copiado para a área de transferência!');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuração do Supabase
        </h1>
        <p className="text-gray-600">
          Configure sua conexão com o banco de dados Supabase
        </p>
      </div>

      {!showInstructions ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Setup Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Credenciais do Supabase
              </CardTitle>
              <CardDescription>
                Insira as credenciais do seu projeto Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do Projeto</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://seu-projeto.supabase.co"
                  value={credentials.url}
                  onChange={(e) => setCredentials(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anonKey">Chave Anônima (anon/public)</Label>
                <Input
                  id="anonKey"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={credentials.anonKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, anonKey: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={!validateCredentials()}
              >
                Salvar Configuração
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Como obter as credenciais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-brand-100 text-brand-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">1</div>
                  <div>
                    <p className="font-medium">Acesse o Supabase</p>
                    <p className="text-sm text-gray-600">
                      Vá para <Button variant="link" className="p-0 h-auto" asChild>
                        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                          supabase.com/dashboard <ExternalLink className="h-3 w-3 inline ml-1" />
                        </a>
                      </Button>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-brand-100 text-brand-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">2</div>
                  <div>
                    <p className="font-medium">Selecione seu projeto</p>
                    <p className="text-sm text-gray-600">
                      Ou crie um novo projeto se ainda não tiver
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-brand-100 text-brand-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">3</div>
                  <div>
                    <p className="font-medium">Vá para Settings → API</p>
                    <p className="text-sm text-gray-600">
                      Copie a URL e a chave anônima (anon/public)
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Importante:</strong> Use apenas a chave pública (anon). 
                  Nunca use a chave de serviço (service_role) no frontend.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Configuration Instructions */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Configuração Validada
            </CardTitle>
            <CardDescription>
              Agora você precisa configurar as variáveis de ambiente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                <strong>Próximo passo:</strong> Configure as variáveis de ambiente do seu projeto
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="font-semibold mb-2">Opção 1: Arquivo .env (Desenvolvimento Local)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Crie um arquivo <code className="bg-gray-100 px-1 rounded">.env</code> na raiz do projeto:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border relative">
                <pre className="text-sm overflow-x-auto">
{`VITE_SUPABASE_URL=${credentials.url}
VITE_SUPABASE_ANON_KEY=${credentials.anonKey}
VITE_DEV_MODE=true`}
                </pre>
                <Button 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={copyEnvContent}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Opção 2: Variáveis do Sistema (Produção)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Configure diretamente nas variáveis de ambiente do seu provedor de hospedagem
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <code>VITE_SUPABASE_URL</code>
                  <span className="text-gray-600">= {credentials.url}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <code>VITE_SUPABASE_ANON_KEY</code>
                  <span className="text-gray-600">= {credentials.anonKey.substring(0, 20)}...</span>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Após configurar as variáveis de ambiente, reinicie o servidor de desenvolvimento 
                e recarregue a página.
              </AlertDescription>
            </Alert>

            <div className="pt-4">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Recarregar Aplicação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Setup;
