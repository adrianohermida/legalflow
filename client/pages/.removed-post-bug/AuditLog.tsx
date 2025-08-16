/**
 * Audit Log Page
 * System audit log viewer for tracking all audit activities and system changes
 */

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  event_type:
    | "audit_run"
    | "autofix_applied"
    | "module_check"
    | "system_change"
    | "user_action";
  module: string;
  status: "success" | "warning" | "error" | "info";
  message: string;
  details?: Record<string, any>;
  user_id?: string;
  user_name?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface AuditLogFilters {
  search?: string;
  event_type?: string;
  status?: string;
  module?: string;
  date_from?: string;
  date_to?: string;
}

export default function AuditLog() {
  const { toast } = useToast();

  // States
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch audit logs
  const {
    data: auditLogs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockLogs: AuditLogEntry[] = [
        {
          id: "1",
          timestamp: "2024-01-22T10:30:00Z",
          event_type: "audit_run",
          module: "database",
          status: "success",
          message: "Database audit completed successfully",
          details: {
            tables_checked: 45,
            issues_found: 0,
            duration_ms: 1250,
          },
          user_id: "user-1",
          user_name: "Dr. João Silva",
          session_id: "sess-abc123",
          ip_address: "192.168.1.100",
        },
        {
          id: "2",
          timestamp: "2024-01-22T10:25:00Z",
          event_type: "autofix_applied",
          module: "schema",
          status: "success",
          message: "Applied schema fix for missing indexes",
          details: {
            patch_name: "SF8_INDEX_FIX",
            tables_affected: ["documents", "processes"],
            changes_applied: 3,
          },
          user_id: "user-1",
          user_name: "Dr. João Silva",
          session_id: "sess-abc123",
          ip_address: "192.168.1.100",
        },
        {
          id: "3",
          timestamp: "2024-01-22T10:20:00Z",
          event_type: "module_check",
          module: "inbox",
          status: "warning",
          message: "Inbox module has performance issues",
          details: {
            warning_type: "performance",
            response_time_ms: 2500,
            threshold_ms: 2000,
            recommendation: "Consider optimizing queries",
          },
          user_id: "system",
          user_name: "System",
          session_id: "sess-system",
        },
        {
          id: "4",
          timestamp: "2024-01-22T10:15:00Z",
          event_type: "user_action",
          module: "journey",
          status: "info",
          message: "User started new journey instance",
          details: {
            action: "start_journey",
            template_id: "template-123",
            client_id: "client-456",
            journey_instance_id: "instance-789",
          },
          user_id: "user-2",
          user_name: "Dra. Ana Costa",
          session_id: "sess-def456",
          ip_address: "192.168.1.101",
        },
        {
          id: "5",
          timestamp: "2024-01-22T10:10:00Z",
          event_type: "system_change",
          module: "configuration",
          status: "error",
          message: "Failed to update system configuration",
          details: {
            config_key: "mail_settings",
            error: "SMTP connection timeout",
            stack_trace: "Error: ECONNREFUSED...",
          },
          user_id: "user-1",
          user_name: "Dr. João Silva",
          session_id: "sess-abc123",
          ip_address: "192.168.1.100",
        },
      ];

      // Apply filters
      let filteredLogs = mockLogs;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.message.toLowerCase().includes(searchLower) ||
            log.module.toLowerCase().includes(searchLower) ||
            log.user_name?.toLowerCase().includes(searchLower),
        );
      }

      if (filters.event_type) {
        filteredLogs = filteredLogs.filter(
          (log) => log.event_type === filters.event_type,
        );
      }

      if (filters.status) {
        filteredLogs = filteredLogs.filter(
          (log) => log.status === filters.status,
        );
      }

      if (filters.module) {
        filteredLogs = filteredLogs.filter(
          (log) => log.module === filters.module,
        );
      }

      return filteredLogs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    },
    refetchInterval: autoRefresh ? 10000 : false, // Auto-refresh every 10 seconds if enabled
  });

  // Get unique modules for filter
  const modules = [...new Set(auditLogs.map((log) => log.module))];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels = {
      audit_run: "Auditoria",
      autofix_applied: "Autofix",
      module_check: "Verificação",
      system_change: "Alteração",
      user_action: "Ação do Usuário",
    };
    return labels[eventType as keyof typeof labels] || eventType;
  };

  const handleViewDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(auditLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Log exportado",
      description: "Arquivo de log de auditoria foi baixado com sucesso",
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log de Auditoria</h1>
          <p className="text-gray-600">
            Histórico de eventos e alterações do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`}
            />
            Auto-refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar eventos..."
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.event_type || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, event_type: value || undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                <SelectItem value="audit_run">Auditoria</SelectItem>
                <SelectItem value="autofix_applied">Autofix</SelectItem>
                <SelectItem value="module_check">Verificação</SelectItem>
                <SelectItem value="system_change">Alteração</SelectItem>
                <SelectItem value="user_action">Ação do Usuário</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value || undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.module || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, module: value || undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os módulos</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setFilters({})}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getEventTypeLabel(entry.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.module}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(entry.status)}
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {entry.message}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.user_name || "Sistema"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      Nenhum evento encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedEntry && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Evento</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>ID:</strong> {selectedEntry.id}
                </div>
                <div>
                  <strong>Timestamp:</strong>{" "}
                  {formatTimestamp(selectedEntry.timestamp)}
                </div>
                <div>
                  <strong>Tipo:</strong>{" "}
                  {getEventTypeLabel(selectedEntry.event_type)}
                </div>
                <div>
                  <strong>Módulo:</strong> {selectedEntry.module}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span className="ml-2">
                    <Badge className={getStatusColor(selectedEntry.status)}>
                      {selectedEntry.status}
                    </Badge>
                  </span>
                </div>
                <div>
                  <strong>Usuário:</strong>{" "}
                  {selectedEntry.user_name || "Sistema"}
                </div>
              </div>

              <div>
                <strong>Mensagem:</strong>
                <p className="mt-1 p-2 bg-gray-50 rounded">
                  {selectedEntry.message}
                </p>
              </div>

              {selectedEntry.details && (
                <div>
                  <strong>Detalhes:</strong>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEntry.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.session_id && (
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                  <div>
                    <strong>Session ID:</strong> {selectedEntry.session_id}
                  </div>
                  <div>
                    <strong>IP Address:</strong> {selectedEntry.ip_address}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
