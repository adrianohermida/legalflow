import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { CheckCircle, XCircle, AlertCircle, Play, Database, Key, Settings, TestTube } from "lucide-react";
import { autofixHistory, BuilderPromptRequest } from "../lib/autofix-history";
import { createAutofixTables, insertSampleData, validateDatabaseSetup, getSetupInstructions, checkTablesExist } from "../lib/supabase-setup-helper";
import { useToast } from "../hooks/use-toast";

interface TestResult {
  name: string;
  status: "success" | "error" | "warning" | "pending";
  message: string;
  details?: any;
  timestamp: string;
}

const AutofixTesting: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [databaseSetup, setDatabaseSetup] = useState<any>(null);
  const [testPrompt, setTestPrompt] = useState({
    prompt: "Fix any TypeScript errors in the components folder",
    context: "Analyzing React components for type safety improvements",
    priority: "medium" as const,
    category: "bug_fix" as const,
  });
  const { toast } = useToast();

  useEffect(() => {
    initializeTests();
  }, []);

  const addTestResult = (result: Omit<TestResult, "timestamp">) => {
    const newResult: TestResult = {
      ...result,
      timestamp: new Date().toISOString(),
    };
    setTestResults(prev => [newResult, ...prev]);
  };

  const initializeTests = async () => {
    // Check credentials status
    const credStatus = autofixHistory.getCredentialsStatus();
    setCredentials(credStatus);

    addTestResult({
      name: "Credentials Check",
      status: credStatus.public_key_configured && credStatus.private_key_configured ? "success" : "warning",
      message: credStatus.public_key_configured && credStatus.private_key_configured 
        ? "Builder.io API credentials configured successfully" 
        : "Some API credentials are missing",
      details: credStatus,
    });
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    try {
      // Test 1: Database Setup
      await testDatabaseSetup();
      
      // Test 2: Credentials
      await testCredentials();
      
      // Test 3: Database Operations
      await testDatabaseOperations();
      
      // Test 4: Builder.io Integration
      await testBuilderIntegration();
      
      // Test 5: Git History Import
      await testGitHistoryImport();
      
      // Test 6: Stats Retrieval
      await testStatsRetrieval();

      toast({
        title: "Tests Completed",
        description: "All autofix system tests have been executed successfully.",
      });

    } catch (error) {
      addTestResult({
        name: "Test Suite",
        status: "error",
        message: `Test suite failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const testDatabaseSetup = async () => {
    addTestResult({
      name: "Database Setup",
      status: "pending",
      message: "Verificando configuração do banco de dados...",
    });

    try {
      // First check if tables exist
      const tablesStatus = await checkTablesExist();

      if (tablesStatus.both_exist) {
        addTestResult({
          name: "Database Setup",
          status: "success",
          message: "✅ Tabelas do autofix já existem e estão acessíveis",
          details: { tables_found: ["autofix_history", "builder_prompts"], method: "existing" },
        });
      } else {
        // Try automatic setup
        const setupResult = await createAutofixTables();
        setDatabaseSetup(setupResult);

        if (setupResult.success) {
          addTestResult({
            name: "Database Setup",
            status: "success",
            message: "✅ Setup automático concluído com sucesso",
            details: setupResult,
          });
        } else {
          addTestResult({
            name: "Database Setup",
            status: "warning",
            message: "⚠️ Setup automático não disponível - Configure manualmente",
            details: setupResult,
          });
        }
      }

      // Validate complete setup
      const validation = await validateDatabaseSetup();
      addTestResult({
        name: "Database Validation",
        status: validation.success ? "success" : "error",
        message: validation.message,
        details: validation.details,
      });

      // Try to insert sample data if validation passed
      if (validation.success) {
        const sampleResult = await insertSampleData();
        addTestResult({
          name: "Sample Data",
          status: sampleResult.success ? "success" : "warning",
          message: sampleResult.success
            ? `✅ Dados de exemplo: ${sampleResult.inserted_count || 0} registros`
            : `⚠️ ${sampleResult.error}`,
          details: sampleResult,
        });
      }

    } catch (error) {
      addTestResult({
        name: "Database Setup",
        status: "error",
        message: `❌ Erro no setup do banco: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const testCredentials = async () => {
    const credStatus = autofixHistory.getCredentialsStatus();
    
    addTestResult({
      name: "API Credentials",
      status: credStatus.public_key_configured && credStatus.private_key_configured ? "success" : "error",
      message: credStatus.public_key_configured && credStatus.private_key_configured 
        ? "All API credentials are properly configured"
        : "Missing required API credentials",
      details: credStatus,
    });
  };

  const testDatabaseOperations = async () => {
    addTestResult({
      name: "Database Operations",
      status: "pending",
      message: "Testing database operations...",
    });

    try {
      // Test recording a modification
      const modId = await autofixHistory.recordModification({
        type: "manual",
        module: "testing",
        description: "Test modification entry for validation",
        changes: ["Test change 1", "Test change 2"],
        success: true,
        context: {
          test_mode: true,
        },
        metadata: {
          test_timestamp: new Date().toISOString(),
          test_user: "Adriano Hermida Maia",
        },
      });

      // Test retrieving modifications
      const history = await autofixHistory.getModificationHistory(5);

      addTestResult({
        name: "Database Operations",
        status: "success",
        message: `Database operations successful. Created modification ID: ${modId}`,
        details: {
          modification_id: modId,
          history_count: history.length,
          latest_entry: history[0],
        },
      });
    } catch (error) {
      addTestResult({
        name: "Database Operations",
        status: "error",
        message: `Database operations failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const testBuilderIntegration = async () => {
    addTestResult({
      name: "Builder.io Integration",
      status: "pending",
      message: "Testing Builder.io API connection...",
    });

    try {
      const connectionTest = await autofixHistory.testBuilderConnection();
      
      addTestResult({
        name: "Builder.io Integration",
        status: connectionTest.success ? "success" : "error",
        message: connectionTest.message,
        details: connectionTest.details,
      });
    } catch (error) {
      addTestResult({
        name: "Builder.io Integration",
        status: "error",
        message: `Builder.io integration test failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const testGitHistoryImport = async () => {
    addTestResult({
      name: "Git History Import",
      status: "pending",
      message: "Testing Git history import functionality...",
    });

    try {
      await autofixHistory.importGitHistory();
      
      addTestResult({
        name: "Git History Import",
        status: "success",
        message: "Git history imported successfully",
      });
    } catch (error) {
      addTestResult({
        name: "Git History Import",
        status: "error",
        message: `Git history import failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const testStatsRetrieval = async () => {
    addTestResult({
      name: "Stats Retrieval",
      status: "pending",
      message: "Testing system statistics retrieval...",
    });

    try {
      const stats = await autofixHistory.getSystemStats();
      
      addTestResult({
        name: "Stats Retrieval",
        status: "success",
        message: `Statistics retrieved successfully. Total modifications: ${stats.total_modifications}`,
        details: stats,
      });
    } catch (error) {
      addTestResult({
        name: "Stats Retrieval",
        status: "error",
        message: `Stats retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const executeCustomPrompt = async () => {
    try {
      addTestResult({
        name: "Custom Builder.io Prompt",
        status: "pending",
        message: "Executing custom Builder.io prompt...",
      });

      const response = await autofixHistory.executeBuilderPrompt(testPrompt);
      
      addTestResult({
        name: "Custom Builder.io Prompt",
        status: response.status === "completed" ? "success" : "error",
        message: response.result?.summary || response.error || "Prompt executed",
        details: response,
      });

      toast({
        title: "Prompt Executed",
        description: "Custom Builder.io prompt has been processed successfully.",
      });
    } catch (error) {
      addTestResult({
        name: "Custom Builder.io Prompt",
        status: "error",
        message: `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "pending":
        return <Play className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      pending: "outline",
    } as const;

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Autofix System Testing</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite for the autofix module with Builder.io integration
          </p>
        </div>
        <Button 
          onClick={runAllTests} 
          disabled={isRunningTests}
          className="min-w-[140px]"
        >
          {isRunningTests ? (
            <>
              <Play className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="credentials">Credentials Status</TabsTrigger>
          <TabsTrigger value="custom">Custom Testing</TabsTrigger>
          <TabsTrigger value="setup">Manual Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                Live results from autofix system validation tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No tests have been run yet. Click "Run All Tests" to start validation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{result.name}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Credentials Status
              </CardTitle>
              <CardDescription>
                Current status of Builder.io API credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              {credentials ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Public Key</Label>
                      <div className="flex items-center gap-2">
                        <Input value={credentials.public_key_preview} readOnly />
                        {credentials.public_key_configured ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Private Key</Label>
                      <div className="flex items-center gap-2">
                        <Input value={credentials.private_key_preview} readOnly />
                        {credentials.private_key_configured ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertDescription>
                      {credentials.public_key_configured && credentials.private_key_configured
                        ? "✅ All API credentials are properly configured and ready for use."
                        : "⚠️ Some API credentials are missing. Please configure them in the environment variables."}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Loading credentials status...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Builder.io Prompt Testing</CardTitle>
              <CardDescription>
                Test the Builder.io integration with custom prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={testPrompt.prompt}
                  onChange={(e) => setTestPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Enter your Builder.io prompt here..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Context</Label>
                <Textarea
                  value={testPrompt.context}
                  onChange={(e) => setTestPrompt(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Provide context for the prompt..."
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={testPrompt.priority}
                    onValueChange={(value: any) => setTestPrompt(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={testPrompt.category}
                    onValueChange={(value: any) => setTestPrompt(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug_fix">Bug Fix</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="refactor">Refactor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={executeCustomPrompt} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Execute Prompt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Manual Database Setup
              </CardTitle>
              <CardDescription>
                Instructions for manual database configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  If automatic setup fails, execute the following SQL script in your Supabase SQL Editor:
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <Label>SQL Script Location</Label>
                <Input value="/AUTOFIX_DATABASE_SETUP.sql" readOnly className="mt-1" />
                <p className="text-sm text-muted-foreground mt-1">
                  Copy the contents of this file and execute it in the Supabase SQL Editor.
                </p>
              </div>

              {databaseSetup && !databaseSetup.success && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Setup Error:</strong> {databaseSetup.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutofixTesting;
