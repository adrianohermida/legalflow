import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { announceToScreenReader, createFocusManager } from '../lib/accessibility';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class AccessibleErrorBoundary extends Component<Props, State> {
  private errorRef = React.createRef<HTMLDivElement>();
  private focusManager = createFocusManager();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // Announce error to screen readers
    announceToScreenReader(
      'Ocorreu um erro na aplicação. Informações sobre o erro e opções de recuperação estão disponíveis na tela.',
      'assertive'
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Focus error region when error occurs
    if (!prevState.hasError && this.state.hasError) {
      setTimeout(() => {
        this.errorRef.current?.focus();
      }, 100);
    }
  }

  handleRetry = () => {
    // Announce retry attempt
    announceToScreenReader('Tentando recarregar o componente...', 'polite');
    
    this.setState({
      hasError: false,
      error: null,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  };

  handleReload = () => {
    announceToScreenReader('Recarregando a página...', 'polite');
    window.location.reload();
  };

  handleGoHome = () => {
    announceToScreenReader('Navegando para a página inicial...', 'polite');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default accessible error UI
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4 bg-neutral-50"
          role="alert"
          aria-live="assertive"
          aria-labelledby={`${this.state.errorId}-title`}
          aria-describedby={`${this.state.errorId}-description`}
        >
          <Card className="max-w-md w-full border-red-200 bg-red-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle 
                  className="w-8 h-8 text-red-600" 
                  aria-hidden="true"
                />
              </div>
              <CardTitle 
                id={`${this.state.errorId}-title`}
                className="text-red-900"
              >
                Ops! Algo deu errado
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div
                id={`${this.state.errorId}-description`}
                className="text-sm text-red-700 text-center"
              >
                <p>
                  Ocorreu um erro inesperado na aplicação. Você pode tentar uma das opções abaixo para continuar.
                </p>
              </div>

              {/* Error details for debugging (hidden by default) */}
              <details className="mt-4">
                <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
                  Detalhes técnicos do erro
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 font-mono overflow-auto max-h-32">
                  <div aria-label="Mensagem de erro">
                    <strong>Erro:</strong> {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <div className="mt-2" aria-label="Stack trace">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>

              {/* Recovery actions */}
              <div 
                className="flex flex-col gap-2 pt-4"
                role="group"
                aria-label="Opções de recuperação"
              >
                <Button
                  onClick={this.handleRetry}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  aria-describedby={`${this.state.errorId}-retry-help`}
                >
                  <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                  Tentar Novamente
                </Button>
                <div 
                  id={`${this.state.errorId}-retry-help`}
                  className="sr-only"
                >
                  Recarrega o componente que apresentou erro
                </div>

                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  aria-describedby={`${this.state.errorId}-reload-help`}
                >
                  <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                  Recarregar Página
                </Button>
                <div 
                  id={`${this.state.errorId}-reload-help`}
                  className="sr-only"
                >
                  Recarrega a página inteira
                </div>

                <Button
                  variant="ghost"
                  onClick={this.handleGoHome}
                  className="w-full text-red-600 hover:bg-red-50"
                  aria-describedby={`${this.state.errorId}-home-help`}
                >
                  <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                  Ir para Início
                </Button>
                <div 
                  id={`${this.state.errorId}-home-help`}
                  className="sr-only"
                >
                  Navega para a página inicial da aplicação
                </div>
              </div>

              {/* Support information */}
              <div className="pt-4 border-t border-red-200">
                <p className="text-xs text-red-600 text-center">
                  Se o problema persistir, entre em contato com o suporte técnico.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withAccessibleErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorHandler?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <AccessibleErrorBoundary onError={errorHandler}>
      <Component {...props} ref={ref} />
    </AccessibleErrorBoundary>
  ));
};

export default AccessibleErrorBoundary;
