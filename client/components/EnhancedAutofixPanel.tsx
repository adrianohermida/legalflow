import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Settings, 
  Trash2,
  Zap,
  FileText,
  Timer
} from 'lucide-react';
import { enhancedAutofixSystem, AutofixError, AutofixStats } from '../lib/enhanced-autofix-system';
import { ImprovedTestRunner } from '../lib/improved-test-runner';
import { useToast } from '../hooks/use-toast';

interface TestTimer {
  isRunning: boolean;
  startTime: number;
  elapsed: number;
  expectedDuration: number;
  isOverdue: boolean;
}

const EnhancedAutofixPanel: React.FC = () => {
  const [errors, setErrors] = useState<AutofixError[]>([]);
  const [stats, setStats] = useState<AutofixStats | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [timer, setTimer] = useState<TestTimer>({
    isRunning: false,
    startTime: 0,
    elapsed: 0,
    expectedDuration: 60, // 60 seconds expected
    isOverdue: false,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    category: 'all',
    autoFixable: 'all',
  });
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize autofix system with callback
    enhancedAutofixSystem.constructor((error: AutofixError) => {
      setErrors(prev => {
        const updated = prev.filter(e => e.id !== error.id);
        updated.push(error);
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
      updateStats();
    });

    // Load existing errors
    setErrors(enhancedAutofixSystem.getErrors());
    updateStats();
  }, []);

  useEffect(() => {
    if (timer.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          const elapsed = Date.now() - prev.startTime;
          const isOverdue = elapsed > prev.expectedDuration * 1000;
          
          return {
            ...prev,
            elapsed,
            isOverdue,
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning]);

  const updateStats = () => {
    setStats(enhancedAutofixSystem.getStats());
  };

  const startTestRunner = async () => {
    setIsRunningTests(true);
    setTimer({
      isRunning: true,
      startTime: Date.now(),
      elapsed: 0,
      expectedDuration: 60,
      isOverdue: false,
    });

    try {
      const testRunner = new ImprovedTestRunner();
      const testSuite = await testRunner.runAllTests();
      
      // Analyze results for autofix opportunities
      const autofixErrors = await enhancedAutofixSystem.analyzeTestResults(testSuite.tests);
      
      setErrors(enhancedAutofixSystem.getErrors());
      updateStats();

      toast({
        title: "Test Analysis Complete",
        description: `Found ${autofixErrors.length} autofix opportunities`,
      });

    } catch (error) {
      toast({
        title: "Test Runner Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunningTests(false);
      setTimer(prev => ({ ...prev, isRunning: false }));
    }
  };

  const stopTests = () => {
    setIsRunningTests(false);
    setTimer(prev => ({ ...prev, isRunning: false }));
    
    toast({
      title: "Tests Stopped",
      description: "Test execution was manually stopped",
      variant: "default",
    });
  };

  const restartTests = () => {
    if (timer.isOverdue) {
      toast({
        title: "Restarting Tests",
        description: "Tests were taking longer than expected, restarting...",
        variant: "default",
      });
    }
    
    stopTests();
    setTimeout(() => startTestRunner(), 1000);
  };

  const executeAutofix = async (errorId: string) => {
    const error = errors.find(e => e.id === errorId);
    if (!error) return;

    toast({
      title: "Executing Autofix",
      description: `Attempting to fix: ${error.name}`,
    });

    const result = await enhancedAutofixSystem.executeAutofix(errorId);
    
    setErrors(enhancedAutofixSystem.getErrors());
    updateStats();

    toast({
      title: result.success ? "Autofix Successful" : "Autofix Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  const executeBatchAutofix = async () => {
    const autoFixableErrors = errors.filter(e => 
      e.auto_fixable && 
      e.status === 'identified' &&
      (selectedErrors.size === 0 || selectedErrors.has(e.id))
    );

    if (autoFixableErrors.length === 0) {
      toast({
        title: "No Auto-fixable Errors",
        description: "No errors selected or available for automatic fixing",
        variant: "default",
      });
      return;
    }

    toast({
      title: "Batch Autofix Started",
      description: `Fixing ${autoFixableErrors.length} errors...`,
    });

    let successCount = 0;
    for (const error of autoFixableErrors) {
      const result = await enhancedAutofixSystem.executeAutofix(error.id);
      if (result.success) successCount++;
    }

    setErrors(enhancedAutofixSystem.getErrors());
    updateStats();

    toast({
      title: "Batch Autofix Complete",
      description: `Successfully fixed ${successCount}/${autoFixableErrors.length} errors`,
      variant: successCount === autoFixableErrors.length ? "default" : "destructive",
    });
  };

  const exportReport = () => {
    const markdown = enhancedAutofixSystem.exportToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autofix-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Autofix report downloaded as Markdown file",
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getFilteredErrors = () => {
    return errors.filter(error => {
      if (filters.status !== 'all' && error.status !== filters.status) return false;
      if (filters.severity !== 'all' && error.severity !== filters.severity) return false;
      if (filters.category !== 'all' && error.category !== filters.category) return false;
      if (filters.autoFixable === 'true' && !error.auto_fixable) return false;
      if (filters.autoFixable === 'false' && error.auto_fixable) return false;
      return true;
    });
  };

  const getSeverityColor = (severity: AutofixError['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: AutofixError['status']) => {
    switch (status) {
      case 'fixed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'discarded': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const filteredErrors = getFilteredErrors();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">🔧 Enhanced Autofix System</h1>
          <p className="text-muted-foreground">
            Intelligent error detection, analysis, and automated correction
          </p>
          
          {/* Timer Display */}
          {timer.isRunning && (
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4" />
              <span>Test Duration: {formatTime(timer.elapsed)}</span>
              {timer.isOverdue && (
                <Badge variant="destructive" className="ml-2">
                  Overdue by {formatTime(timer.elapsed - timer.expectedDuration * 1000)}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={startTestRunner}
            disabled={isRunningTests}
            className="min-w-[120px]"
          >
            <Play className="mr-2 h-4 w-4" />
            {isRunningTests ? 'Running...' : 'Run Tests'}
          </Button>
          
          {isRunningTests && (
            <Button onClick={stopTests} variant="outline">
              <Pause className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}

          {timer.isOverdue && (
            <Button onClick={restartTests} variant="destructive">
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart
            </Button>
          )}

          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export MD
          </Button>
        </div>
      </div>

      {/* Overdue Warning */}
      {timer.isOverdue && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tests are taking longer than expected ({formatTime(timer.expectedDuration * 1000)}). 
            Consider restarting if the system appears stuck.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_errors}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Auto-fixable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.auto_fixable_count}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Fixed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.by_status.fixed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Est. Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.estimated_total_time}m</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="errors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="errors">Error Management</TabsTrigger>
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="identified">Identified</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="discarded">Discarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Severity</Label>
                <Select value={filters.severity} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, severity: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={filters.category} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="environment">Environment</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="configuration">Configuration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Auto-fixable</Label>
                <Select value={filters.autoFixable} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, autoFixable: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <div className="space-y-4">
            {filteredErrors.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Errors Found</h3>
                  <p className="text-muted-foreground">
                    {errors.length === 0 
                      ? "Run tests to identify autofix opportunities"
                      : "All errors match your current filters"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredErrors.map((error) => (
                <Card key={error.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(error.status)}
                        <div>
                          <CardTitle className="text-base">{error.name}</CardTitle>
                          <CardDescription>{error.description}</CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`text-white ${getSeverityColor(error.severity)}`}
                        >
                          {error.severity}
                        </Badge>
                        <Badge variant="outline">{error.category}</Badge>
                        {error.auto_fixable && (
                          <Badge variant="secondary">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Correction Prompt:</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {error.correction_prompt}
                        </pre>
                      </div>
                    </div>

                    {error.fix_result && (
                      <div>
                        <Label className="text-sm font-medium">Fix Result:</Label>
                        <div className={`mt-1 p-3 rounded-md text-sm ${
                          error.fix_result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {error.fix_result.message}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Est. fix time: {error.estimated_fix_time} minutes
                      </div>
                      
                      <div className="flex gap-2">
                        {error.auto_fixable && error.status === 'identified' && (
                          <Button
                            size="sm"
                            onClick={() => executeAutofix(error.id)}
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Auto Fix
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => enhancedAutofixSystem.discardError(error.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Discard
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Operations</CardTitle>
              <CardDescription>
                Execute operations on multiple errors at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={executeBatchAutofix}
                className="w-full"
                size="lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                Fix All Auto-fixable Errors
              </Button>

              <Button
                onClick={exportReport}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <FileText className="h-5 w-5 mr-2" />
                Export Complete Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Expected Test Duration (seconds)</Label>
                <Input
                  type="number"
                  value={timer.expectedDuration}
                  onChange={(e) => setTimer(prev => ({ 
                    ...prev, 
                    expectedDuration: parseInt(e.target.value) || 60 
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAutofixPanel;
