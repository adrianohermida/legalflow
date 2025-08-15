import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Download, Copy, ExternalLink, Database, FileText } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export interface SQLFile {
  filename: string;
  content: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "secondary";
  icon?: React.ComponentType<{ className?: string }>;
}

interface GenericSQLDownloaderProps {
  title: string;
  description?: string;
  files: SQLFile[];
  className?: string;
  showSupabaseLink?: boolean;
  instructions?: string[];
  additionalInfo?: string[];
}

export const GenericSQLDownloader: React.FC<GenericSQLDownloaderProps> = ({
  title,
  description,
  files,
  className,
  showSupabaseLink = true,
  instructions = [
    "Baixe ou copie o script SQL",
    "Abra o Supabase SQL Editor",
    "Cole e execute o script completo",
    "Volte aqui e verifique a instalação",
  ],
  additionalInfo = [],
}) => {
  const { toast } = useToast();

  const downloadSQL = (file: SQLFile) => {
    try {
      const blob = new Blob([file.content], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Arquivo baixado",
        description: `${file.filename} foi baixado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro no download",
        description: `Não foi possível baixar ${file.filename}`,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (file: SQLFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      toast({
        title: "✅ Copiado",
        description: `Conteúdo de ${file.filename} copiado para a área de transferência`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao copiar",
        description: `Não foi possível copiar o conteúdo de ${file.filename}`,
        variant: "destructive",
      });
    }
  };

  const openSupabase = () => {
    window.open("https://supabase.com/dashboard/project/_/sql/new", "_blank");
  };

  const getVariantClasses = (variant: SQLFile["variant"]) => {
    switch (variant) {
      case "destructive":
        return "border-red-200 bg-red-50";
      case "secondary":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-green-200 bg-green-50";
    }
  };

  const getButtonVariant = (variant: SQLFile["variant"]) => {
    switch (variant) {
      case "destructive":
        return "destructive" as const;
      case "secondary":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Arquivos SQL */}
          <div className="space-y-4">
            {files.map((file, index) => {
              const IconComponent = file.icon || FileText;
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getVariantClasses(file.variant)}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <IconComponent className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm">{file.title}</h4>
                        {file.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={() => downloadSQL(file)}
                        variant={getButtonVariant(file.variant)}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Baixar {file.filename}
                      </Button>

                      <Button
                        onClick={() => copyToClipboard(file)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link para Supabase */}
          {showSupabaseLink && (
            <div className="flex justify-center">
              <Button
                onClick={openSupabase}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir Supabase SQL Editor
              </Button>
            </div>
          )}

          {/* Instru��ões */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <strong className="flex items-center gap-1">📋 Como usar:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              {instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>

            {additionalInfo.length > 0 && (
              <div className="mt-3 pt-2 border-t border-muted-foreground/20">
                <strong>📌 Informações importantes:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {additionalInfo.map((info, index) => (
                    <li key={index}>{info}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenericSQLDownloader;
