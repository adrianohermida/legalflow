import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { CheckCircle2, X, ArrowRight, Sparkles } from "lucide-react";

interface UpdateBannerProps {
  onDismiss?: () => void;
}

export function UpdateBanner({ onDismiss }: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert className="border-green-200 bg-green-50 mb-6">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <div className="flex items-center justify-between flex-1">
        <div className="flex-1">
          <AlertDescription className="text-green-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <strong>Novas funcionalidades implementadas!</strong>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                • Dados completos da capa: tribunal, valor da causa, situação
              </div>
              <div>• Campo resumo com geração por IA</div>
              <div>• Gerenciamento financeiro integrado</div>
              <div>• Monitoramento avançado de processos</div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="outline" className="bg-white">
                <Link to="/processos-v2">
                  Ver Processos V2
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white">
                <Link to="/inbox-v2">
                  Ver Inbox V2
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="ml-4"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

export default UpdateBanner;
