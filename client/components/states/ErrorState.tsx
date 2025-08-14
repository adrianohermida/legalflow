import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  Wifi,
  Database,
  Shield,
  Bug
} from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
  type?: 'network' | 'database' | 'permission' | 'generic';
  showDetails?: boolean;
  className?: string;
}

const errorTypeConfig = {
  network: {
    icon: <Wifi className="h-5 w-5" />,
    title: 'Erro de Conexão',
    message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  },
  database: {
    icon: <Database className="h-5 w-5" />,
    title: 'Erro no Banco de Dados',
    message: 'Problema ao acessar os dados. Tente novamente em alguns instantes.',
  },
  permission: {
    icon: <Shield className="h-5 w-5" />,
    title: 'Acesso Negado',
    message: 'Você não tem permissão para acessar este recurso.',
  },
  generic: {
    icon: <Bug className="h-5 w-5" />,
    title: 'Algo deu errado',
    message: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  error,
  onRetry,
  retryLabel = 'Tentar Novamente',
  type = 'generic',
  showDetails = true,
  className = '',
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const config = errorTypeConfig[type];
  
  const errorMessage = error instanceof Error ? error.message : error?.toString();
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  return (
    <Card className={`border-red-200 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4 p-3 bg-red-100 rounded-full">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title || config.title}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          {message || config.message}
        </p>
        
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {onRetry && (
            <Button onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {retryLabel}
            </Button>
          )}
          
          {showDetails && (error || errorMessage) && (
            <div className="w-full">
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    {config.icon}
                    Ver Detalhes
                    {isDetailsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-4">
                  <Alert variant="destructive" className="text-left">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <div className="space-y-2">
                        {errorMessage && (
                          <div>
                            <strong>Erro:</strong>
                            <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                              {errorMessage}
                            </pre>
                          </div>
                        )}
                        
                        {errorStack && (
                          <div>
                            <strong>Stack Trace:</strong>
                            <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-32">
                              {errorStack}
                            </pre>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-600 pt-2 border-t border-red-200">
                          <strong>Dica:</strong> Se o problema persistir, entre em contato com o suporte
                          incluindo estas informações de erro.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Quick error helpers for common scenarios
export const NetworkError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState {...props} type="network" />
);

export const DatabaseError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState {...props} type="database" />
);

export const PermissionError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState {...props} type="permission" />
);

export default ErrorState;
