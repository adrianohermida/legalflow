/**
 * Builder.io API Diagnostics
 * Helper functions to diagnose Builder.io API connectivity issues
 */

export interface APIEndpointStatus {
  endpoint: string;
  accessible: boolean;
  status_code?: number;
  error?: string;
  response_time?: number;
  cors_enabled?: boolean;
}

export interface APICredentialsStatus {
  public_key: {
    configured: boolean;
    format_valid: boolean;
    preview: string;
  };
  private_key: {
    configured: boolean;
    format_valid: boolean;
    preview: string;
  };
}

export class BuilderAPIDiagnostics {
  private static readonly API_ENDPOINTS = [
    'https://builder.io/api/v1/ai-code-gen',
    'https://builder.io/api/v1/prompts',
    'https://builder.io/api/v1/content',
    'https://api.builder.io/v1/ai-code-gen',
    'https://api.builder.io/v1/prompts',
  ];

  static async checkAPIEndpoints(): Promise<APIEndpointStatus[]> {
    const results: APIEndpointStatus[] = [];

    for (const endpoint of this.API_ENDPOINTS) {
      results.push(await this.checkSingleEndpoint(endpoint));
    }

    return results;
  }

  private static async checkSingleEndpoint(endpoint: string): Promise<APIEndpointStatus> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Checking endpoint: ${endpoint}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout for diagnostics

      // Try a simple GET request first to avoid CORS preflight
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors', // This will avoid CORS but limit response info
        headers: {
          'User-Agent': 'Autofix-Diagnostics/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // For no-cors mode, we can't check status but if we get here, the endpoint is reachable
      return {
        endpoint,
        accessible: true,
        status_code: response.status || 0, // no-cors returns 0
        response_time: responseTime,
        cors_enabled: response.type === 'cors',
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout (>3s)';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network unreachable or blocked';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Network connectivity issue';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        endpoint,
        accessible: false,
        error: errorMessage,
        response_time: responseTime,
        cors_enabled: false,
      };
    }
  }

  static checkCredentials(publicKey: string, privateKey: string): APICredentialsStatus {
    return {
      public_key: {
        configured: !!publicKey,
        format_valid: publicKey && publicKey.length >= 20 && !publicKey.includes('YOUR_'),
        preview: publicKey ? `${publicKey.substring(0, 8)}...` : 'Not configured',
      },
      private_key: {
        configured: !!privateKey,
        format_valid: privateKey && privateKey.length >= 20 && privateKey.startsWith('bpk-'),
        preview: privateKey ? `${privateKey.substring(0, 8)}...` : 'Not configured',
      },
    };
  }

  static async runCompleteDiagnostics(publicKey: string, privateKey: string): Promise<{
    credentials: APICredentialsStatus;
    endpoints: APIEndpointStatus[];
    recommendations: string[];
    overall_status: 'healthy' | 'issues' | 'critical';
  }> {
    console.log("🔬 Running complete Builder.io API diagnostics...");

    const credentials = this.checkCredentials(publicKey, privateKey);
    const endpoints = await this.checkAPIEndpoints();

    const recommendations: string[] = [];
    let issues = 0;

    // Check credentials
    if (!credentials.public_key.configured || !credentials.private_key.configured) {
      recommendations.push("❌ Configure missing API credentials");
      issues += 2;
    } else {
      if (!credentials.public_key.format_valid) {
        recommendations.push("⚠️ Public key format appears invalid");
        issues += 1;
      }
      if (!credentials.private_key.format_valid) {
        recommendations.push("⚠️ Private key format appears invalid (should start with 'bpk-')");
        issues += 1;
      }
    }

    // Check endpoints
    const accessibleEndpoints = endpoints.filter(e => e.accessible);
    if (accessibleEndpoints.length === 0) {
      recommendations.push("❌ No Builder.io API endpoints are accessible");
      recommendations.push("🔍 Check network connectivity and CORS settings");
      issues += 3;
    } else if (accessibleEndpoints.length < endpoints.length / 2) {
      recommendations.push("⚠️ Some Builder.io API endpoints are not accessible");
      recommendations.push("🔍 May indicate partial connectivity issues");
      issues += 1;
    } else {
      recommendations.push("✅ Builder.io API endpoints are accessible");
    }

    // CORS issues
    const corsIssues = endpoints.filter(e => e.accessible && !e.cors_enabled);
    if (corsIssues.length > 0) {
      recommendations.push("⚠️ CORS may not be properly configured for some endpoints");
      issues += 1;
    }

    // Overall status
    let overallStatus: 'healthy' | 'issues' | 'critical';
    if (issues === 0) {
      overallStatus = 'healthy';
      recommendations.push("🎉 All systems appear to be working correctly");
    } else if (issues <= 2) {
      overallStatus = 'issues';
      recommendations.push("🔧 Minor issues detected - system should work with fallbacks");
    } else {
      overallStatus = 'critical';
      recommendations.push("🚨 Major issues detected - mock API will be used");
    }

    return {
      credentials,
      endpoints,
      recommendations,
      overall_status: overallStatus,
    };
  }
}

// Quick diagnostic function for easy use
export async function quickBuilderAPIDiagnostic(): Promise<{
  status: 'healthy' | 'issues' | 'critical';
  message: string;
  recommendations: string[];
}> {
  try {
    // Get credentials from environment
    const publicKey = import.meta.env.VITE_BUILDER_IO_PUBLIC_KEY || "";
    const privateKey = import.meta.env.VITE_BUILDER_IO_PRIVATE_KEY || "";

    const diagnostics = await BuilderAPIDiagnostics.runCompleteDiagnostics(publicKey, privateKey);

    let message = "";
    switch (diagnostics.overall_status) {
      case 'healthy':
        message = "✅ Builder.io API appears to be working correctly";
        break;
      case 'issues':
        message = "⚠️ Builder.io API has some issues but should work with fallbacks";
        break;
      case 'critical':
        message = "❌ Builder.io API has critical issues - using mock implementation";
        break;
    }

    return {
      status: diagnostics.overall_status,
      message,
      recommendations: diagnostics.recommendations,
    };
  } catch (error) {
    return {
      status: 'critical',
      message: `❌ Diagnostic check failed: ${error instanceof Error ? error.message : String(error)}`,
      recommendations: ["🔧 Check network connectivity", "🔍 Verify API credentials"],
    };
  }
}
