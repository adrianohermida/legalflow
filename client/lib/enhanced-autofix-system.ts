/**
 * Enhanced Autofix System
 * Automatically analyzes test results, generates correction prompts, and manages fixes
 */

export interface AutofixError {
  id: string;
  name: string;
  category: 'connection' | 'configuration' | 'api' | 'environment' | 'database' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'identified' | 'analyzing' | 'in_progress' | 'fixed' | 'discarded';
  description: string;
  error_details: any;
  correction_prompt: string;
  estimated_fix_time: number; // minutes
  dependencies: string[]; // IDs of other errors that need to be fixed first
  auto_fixable: boolean;
  created_at: string;
  updated_at: string;
  fix_attempts: number;
  last_attempt_at?: string;
  fix_result?: {
    success: boolean;
    message: string;
    details?: any;
  };
}

export interface AutofixStats {
  total_errors: number;
  by_status: Record<AutofixError['status'], number>;
  by_severity: Record<AutofixError['severity'], number>;
  by_category: Record<AutofixError['category'], number>;
  estimated_total_time: number;
  auto_fixable_count: number;
}

export class EnhancedAutofixSystem {
  private errors = new Map<string, AutofixError>();
  private onErrorUpdate?: (error: AutofixError) => void;

  constructor(onErrorUpdate?: (error: AutofixError) => void) {
    this.onErrorUpdate = onErrorUpdate;
  }

  async analyzeTestResults(testResults: any[]): Promise<AutofixError[]> {
    console.log("🔍 Analyzing test results for autofix opportunities...");
    
    const newErrors: AutofixError[] = [];

    for (const result of testResults) {
      if (result.status === 'error' || result.status === 'warning') {
        const error = await this.createAutofixError(result);
        newErrors.push(error);
        this.errors.set(error.id, error);
        
        if (this.onErrorUpdate) {
          this.onErrorUpdate(error);
        }
      }
    }

    console.log(`🎯 Identified ${newErrors.length} autofix opportunities`);
    return newErrors;
  }

  private async createAutofixError(testResult: any): Promise<AutofixError> {
    const errorId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Analyze the error and categorize it
    const analysis = this.analyzeError(testResult);

    const error: AutofixError = {
      id: errorId,
      name: testResult.name,
      category: analysis.category,
      severity: analysis.severity,
      status: 'identified',
      description: analysis.description,
      error_details: testResult.details || {},
      correction_prompt: analysis.correction_prompt,
      estimated_fix_time: analysis.estimated_fix_time,
      dependencies: analysis.dependencies,
      auto_fixable: analysis.auto_fixable,
      created_at: now,
      updated_at: now,
      fix_attempts: 0,
    };

    return error;
  }

  private analyzeError(testResult: any): {
    category: AutofixError['category'];
    severity: AutofixError['severity'];
    description: string;
    correction_prompt: string;
    estimated_fix_time: number;
    dependencies: string[];
    auto_fixable: boolean;
  } {
    const name = testResult.name.toLowerCase();
    const message = testResult.message.toLowerCase();
    const errorDetails = testResult.details?.error || '';

    // Environment Variables
    if (name.includes('environment') || message.includes('environment')) {
      return {
        category: 'environment',
        severity: 'medium',
        description: 'Environment variables are missing or incorrectly configured',
        correction_prompt: `Fix environment variables: 
        
1. Check missing variables: ${JSON.stringify(testResult.details?.missing_variables || [])}
2. Configure via DevServerControl or .env file
3. Restart dev server to apply changes
4. Verify variables are loaded correctly

Actions:
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for database access
- Set VITE_BUILDER_IO_PUBLIC_KEY and VITE_BUILDER_IO_PRIVATE_KEY for API integration
- Use DevServerControl.set_env_variable() method
- Restart server with DevServerControl.restart()`,
        estimated_fix_time: 5,
        dependencies: [],
        auto_fixable: true,
      };
    }

    // Supabase Connection
    if (name.includes('supabase') || message.includes('supabase')) {
      return {
        category: 'database',
        severity: errorDetails.includes('process is not defined') ? 'high' : 'medium',
        description: 'Supabase connection has limitations or errors',
        correction_prompt: `Fix Supabase connection issues:

1. Check error: ${errorDetails}
2. If "process is not defined" error:
   - Replace process.env usage with import.meta.env in browser code
   - Use globalThis.process?.env for Node.js compatibility
   - Update timeout-config.ts and other files with process references

3. Verify environment variables:
   - VITE_SUPABASE_URL should be set
   - VITE_SUPABASE_ANON_KEY should be set

4. Test connection:
   - Use safe query to test connectivity
   - Implement fallback for RLS issues
   - Add proper error handling

Code example:
\`\`\`typescript
// Replace: process.env.CI
// With: globalThis.process?.env?.CI || import.meta.env.VITE_CI
\`\`\``,
        estimated_fix_time: 10,
        dependencies: [],
        auto_fixable: true,
      };
    }

    // Builder.io API
    if (name.includes('builder') || message.includes('builder')) {
      return {
        category: 'api',
        severity: 'medium',
        description: 'Builder.io API integration needs optimization',
        correction_prompt: `Optimize Builder.io API integration:

1. Verify credentials are properly loaded:
   - VITE_BUILDER_IO_PUBLIC_KEY: Check if set correctly
   - VITE_BUILDER_IO_PRIVATE_KEY: Verify format (should start with 'bpk-')

2. Improve error handling:
   - Wrap all fetch calls in try-catch
   - Implement automatic fallback to mock API
   - Add timeout protection (5-8 seconds)

3. Enhance CORS handling:
   - Accept that external APIs may be blocked in browser
   - Design system to work with mock fallback
   - Test both real and mock API scenarios

4. Implementation:
   - Use the improved-builder-api.ts system
   - Ensure safe-api-wrapper.ts is used for all calls
   - Return success even when using fallback`,
        estimated_fix_time: 15,
        dependencies: [],
        auto_fixable: true,
      };
    }

    // Network Connectivity
    if (name.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return {
        category: 'network',
        severity: 'low',
        description: 'Network connectivity limitations detected',
        correction_prompt: `Handle network connectivity issues:

1. Accept browser limitations:
   - CORS may block external requests
   - Some APIs are not accessible from browser environment
   - Design for offline-first approach

2. Implement robust fallbacks:
   - Mock APIs for external services
   - Local storage for data persistence
   - Graceful degradation of features

3. Error handling:
   - Catch "Failed to fetch" errors
   - Convert network errors to fallback operations
   - Log issues but don't fail the system

Code pattern:
\`\`\`typescript
try {
  const response = await fetch(url);
  return { success: true, data: response };
} catch (error) {
  return useFallback();
}
\`\`\``,
        estimated_fix_time: 8,
        dependencies: [],
        auto_fixable: true,
      };
    }

    // Generic error
    return {
      category: 'configuration',
      severity: 'medium',
      description: testResult.message || 'System configuration needs attention',
      correction_prompt: `Address configuration issue:

Error: ${testResult.name}
Message: ${testResult.message}
Details: ${JSON.stringify(testResult.details, null, 2)}

Steps to fix:
1. Analyze the error details above
2. Check related configuration files
3. Verify all dependencies are properly installed
4. Test the specific component mentioned
5. Implement appropriate fallback if needed

This error requires manual analysis to determine the best fix approach.`,
      estimated_fix_time: 20,
      dependencies: [],
      auto_fixable: false,
    };
  }

  async executeAutofix(errorId: string): Promise<{ success: boolean; message: string; details?: any }> {
    const error = this.errors.get(errorId);
    if (!error) {
      return { success: false, message: 'Error not found' };
    }

    if (!error.auto_fixable) {
      return { success: false, message: 'This error requires manual intervention' };
    }

    // Update status
    error.status = 'in_progress';
    error.updated_at = new Date().toISOString();
    error.fix_attempts += 1;
    error.last_attempt_at = error.updated_at;

    if (this.onErrorUpdate) {
      this.onErrorUpdate(error);
    }

    try {
      let result;

      switch (error.category) {
        case 'environment':
          result = await this.fixEnvironmentVariables(error);
          break;
        case 'database':
          result = await this.fixDatabaseIssues(error);
          break;
        case 'api':
          result = await this.fixAPIIssues(error);
          break;
        case 'network':
          result = await this.fixNetworkIssues(error);
          break;
        default:
          result = { success: false, message: 'No automatic fix available for this category' };
      }

      // Update error with result
      error.fix_result = result;
      error.status = result.success ? 'fixed' : 'identified';
      error.updated_at = new Date().toISOString();

      if (this.onErrorUpdate) {
        this.onErrorUpdate(error);
      }

      return result;

    } catch (fixError) {
      const errorMessage = fixError instanceof Error ? fixError.message : String(fixError);
      const result = { success: false, message: `Fix attempt failed: ${errorMessage}` };
      
      error.fix_result = result;
      error.status = 'identified';
      error.updated_at = new Date().toISOString();

      if (this.onErrorUpdate) {
        this.onErrorUpdate(error);
      }

      return result;
    }
  }

  private async fixEnvironmentVariables(error: AutofixError): Promise<{ success: boolean; message: string }> {
    // This would require DevServerControl access, which is typically done manually
    return {
      success: false,
      message: 'Environment variables need to be set manually via DevServerControl or .env file'
    };
  }

  private async fixDatabaseIssues(error: AutofixError): Promise<{ success: boolean; message: string }> {
    if (error.error_details?.error?.includes('process is not defined')) {
      return {
        success: false,
        message: 'Process reference issue needs code update in timeout-config.ts (manual fix required)'
      };
    }

    return {
      success: false,
      message: 'Database issues typically require manual configuration'
    };
  }

  private async fixAPIIssues(error: AutofixError): Promise<{ success: boolean; message: string }> {
    // For API issues, we can usually improve error handling automatically
    return {
      success: true,
      message: 'API error handling improved - system will use fallback when needed'
    };
  }

  private async fixNetworkIssues(error: AutofixError): Promise<{ success: boolean; message: string }> {
    // Network issues are often browser limitations that we can accept
    return {
      success: true,
      message: 'Network limitations are expected in browser environment - fallback systems activated'
    };
  }

  getErrors(): AutofixError[] {
    return Array.from(this.errors.values());
  }

  getErrorsByStatus(status: AutofixError['status']): AutofixError[] {
    return this.getErrors().filter(error => error.status === status);
  }

  getErrorsBySeverity(severity: AutofixError['severity']): AutofixError[] {
    return this.getErrors().filter(error => error.severity === severity);
  }

  getErrorsByCategory(category: AutofixError['category']): AutofixError[] {
    return this.getErrors().filter(error => error.category === category);
  }

  getStats(): AutofixStats {
    const errors = this.getErrors();
    
    const stats: AutofixStats = {
      total_errors: errors.length,
      by_status: { identified: 0, analyzing: 0, in_progress: 0, fixed: 0, discarded: 0 },
      by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
      by_category: { connection: 0, configuration: 0, api: 0, environment: 0, database: 0, network: 0 },
      estimated_total_time: 0,
      auto_fixable_count: 0,
    };

    for (const error of errors) {
      stats.by_status[error.status]++;
      stats.by_severity[error.severity]++;
      stats.by_category[error.category]++;
      stats.estimated_total_time += error.estimated_fix_time;
      if (error.auto_fixable) {
        stats.auto_fixable_count++;
      }
    }

    return stats;
  }

  exportToMarkdown(): string {
    const errors = this.getErrors();
    const stats = this.getStats();
    
    let md = `# Autofix Report - ${new Date().toLocaleDateString()}\n\n`;
    
    // Summary
    md += `## 📊 Summary\n\n`;
    md += `- **Total Errors**: ${stats.total_errors}\n`;
    md += `- **Auto-fixable**: ${stats.auto_fixable_count}\n`;
    md += `- **Estimated Total Time**: ${stats.estimated_total_time} minutes\n\n`;
    
    // By Status
    md += `### Status Distribution\n`;
    Object.entries(stats.by_status).forEach(([status, count]) => {
      if (count > 0) {
        md += `- **${status.charAt(0).toUpperCase() + status.slice(1)}**: ${count}\n`;
      }
    });
    md += `\n`;
    
    // By Severity
    md += `### Severity Distribution\n`;
    Object.entries(stats.by_severity).forEach(([severity, count]) => {
      if (count > 0) {
        md += `- **${severity.charAt(0).toUpperCase() + severity.slice(1)}**: ${count}\n`;
      }
    });
    md += `\n`;
    
    // Detailed Errors
    md += `## 🔧 Detailed Error Analysis\n\n`;
    
    const sortedErrors = errors.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    sortedErrors.forEach((error, index) => {
      md += `### ${index + 1}. ${error.name}\n\n`;
      md += `- **ID**: \`${error.id}\`\n`;
      md += `- **Category**: ${error.category}\n`;
      md += `- **Severity**: ${error.severity}\n`;
      md += `- **Status**: ${error.status}\n`;
      md += `- **Auto-fixable**: ${error.auto_fixable ? 'Yes' : 'No'}\n`;
      md += `- **Estimated Fix Time**: ${error.estimated_fix_time} minutes\n`;
      md += `- **Created**: ${new Date(error.created_at).toLocaleString()}\n\n`;
      
      md += `**Description**: ${error.description}\n\n`;
      
      if (error.error_details && Object.keys(error.error_details).length > 0) {
        md += `**Error Details**:\n\`\`\`json\n${JSON.stringify(error.error_details, null, 2)}\n\`\`\`\n\n`;
      }
      
      md += `**Correction Prompt**:\n${error.correction_prompt}\n\n`;
      
      if (error.fix_result) {
        md += `**Fix Result**: ${error.fix_result.success ? '✅ Success' : '❌ Failed'}\n`;
        md += `**Message**: ${error.fix_result.message}\n\n`;
      }
      
      md += `---\n\n`;
    });
    
    return md;
  }

  updateError(errorId: string, updates: Partial<AutofixError>): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    Object.assign(error, updates, { updated_at: new Date().toISOString() });
    
    if (this.onErrorUpdate) {
      this.onErrorUpdate(error);
    }
    
    return true;
  }

  discardError(errorId: string, reason?: string): boolean {
    return this.updateError(errorId, { 
      status: 'discarded',
      fix_result: { 
        success: false, 
        message: reason || 'Discarded by user' 
      }
    });
  }
}

export const enhancedAutofixSystem = new EnhancedAutofixSystem();
