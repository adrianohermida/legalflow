import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'page' | 'component';
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  isDetailsExpanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: '',
    isDetailsExpanded: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (import.meta.env.MODE === 'development') {
      console.error('🚨 Error Boundary Caught:', error);
      console.error('📋 Error Info:', errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send error to monitoring service in production
    if (import.meta.env.MODE === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Implement error reporting to external service
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      name: this.props.name,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console for now (replace with actual service call)
    console.error('📊 Error Report:', errorReport);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
      isDetailsExpanded: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const errorDetails = this.getErrorDetailsText();
    navigator.clipboard.writeText(errorDetails);
  };

  private downloadErrorReport = () => {
    const errorDetails = this.getErrorDetailsText();
    const blob = new Blob([errorDetails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-report-${this.state.errorId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  private getErrorDetailsText = (): string => {
    const { error, errorInfo, errorId } = this.state;
    const { level, name } = this.props;
    
    return `
ERROR REPORT
============
Error ID: ${errorId}
Level: ${level || 'component'}
Component: ${name || 'Unknown'}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

ERROR DETAILS
=============
Message: ${error?.message || 'Unknown error'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

REPRODUCTION STEPS
==================
1. Navigate to: ${window.location.href}
2. [Add user actions that led to this error]

ADDITIONAL CONTEXT
==================
[Add any additional context about the error]
    `.trim();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on level
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { error, errorInfo, errorId } = this.state;
    const { level = 'component', name } = this.props;
    
    const isAppLevel = level === 'app';
    const isPageLevel = level === 'page';

    return (
      <div className={`flex items-center justify-center p-6 ${isAppLevel ? 'min-h-screen bg-neutral-50' : ''}`}>
        <Card className={`max-w-2xl w-full ${isAppLevel ? 'shadow-lg' : ''}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {isAppLevel ? 'Erro na Aplicação' : isPageLevel ? 'Erro na Página' : 'Erro no Componente'}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {name || 'Componente'}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    {errorId}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600 mb-4">
                {isAppLevel 
                  ? 'Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada automaticamente.'
                  : isPageLevel
                  ? 'Ocorreu um erro ao carregar esta página. Você pode tentar recarregar ou voltar ao início.'
                  : 'Este componente encontrou um problema. Você pode tentar novamente ou continuar navegando.'}
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">Detalhes do Erro:</p>
                  <p className="text-sm text-red-700 font-mono">{error.message}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!isAppLevel && (
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
              
              {(isAppLevel || isPageLevel) && (
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar Página
                </Button>
              )}
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                size="sm"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir ao Início
              </Button>
            </div>

            {/* Technical Details (Development mode or expanded) */}
            {(import.meta.env.MODE === 'development' || this.state.isDetailsExpanded) && (
              <Collapsible 
                open={this.state.isDetailsExpanded}
                onOpenChange={(isOpen) => this.setState({ isDetailsExpanded: isOpen })}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center">
                      <Bug className="w-4 h-4 mr-2" />
                      Detalhes Técnicos
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={this.copyErrorDetails}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Detalhes
                    </Button>
                    <Button
                      onClick={this.downloadErrorReport}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Relatório
                    </Button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Stack Trace:
                    </label>
                    <Textarea
                      value={error?.stack || 'No stack trace available'}
                      readOnly
                      className="font-mono text-xs h-32"
                    />
                  </div>
                  
                  {errorInfo && (
                    <div>
                      <label className="text-sm font-medium text-neutral-700 mb-2 block">
                        Component Stack:
                      </label>
                      <Textarea
                        value={errorInfo.componentStack}
                        readOnly
                        className="font-mono text-xs h-24"
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {import.meta.env.MODE === 'production' && !this.state.isDetailsExpanded && (
              <Button
                onClick={() => this.setState({ isDetailsExpanded: true })}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <Bug className="w-4 h-4 mr-2" />
                Mostrar Detalhes Técnicos
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

// Convenient wrapper components for different levels
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="app" name="App">
    {children}
  </ErrorBoundary>
);

export const PageErrorBoundary: React.FC<{ children: ReactNode; pageName?: string }> = ({ 
  children, 
  pageName 
}) => (
  <ErrorBoundary level="page" name={pageName}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  componentName?: string;
  fallback?: ReactNode;
}> = ({ children, componentName, fallback }) => (
  <ErrorBoundary level="component" name={componentName} fallback={fallback}>
    {children}
  </ErrorBoundary>
);

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <ComponentErrorBoundary componentName={componentName || Component.name}>
      <Component {...props} />
    </ComponentErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error reporting in functional components
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error(`🚨 Manual Error Report${context ? ` (${context})` : ''}:`, error);
    
    // In production, send to monitoring service
    if (import.meta.env.MODE === 'production') {
      // Implement error reporting
    }
  }, []);

  const handleAsyncError = React.useCallback((asyncFn: () => Promise<any>, context?: string) => {
    return asyncFn().catch(error => {
      reportError(error, context);
      throw error; // Re-throw to maintain error handling flow
    });
  }, [reportError]);

  return { reportError, handleAsyncError };
};
