/**
 * Optimized Timeout Configuration
 * Provides smart timeout settings for different types of operations
 */

export interface TimeoutConfig {
  short: number;      // Quick operations (< 1s)
  medium: number;     // Standard operations (1-3s)
  long: number;       // Complex operations (3-8s)
  extended: number;   // Long-running operations (8-15s)
}

export interface OperationTimeouts {
  database_query: number;
  api_call: number;
  network_test: number;
  health_check: number;
  diagnostic_test: number;
  builder_api: number;
  supabase_operation: number;
  recovery_operation: number;
}

class TimeoutManager {
  private baseConfig: TimeoutConfig = {
    short: 1500,    // 1.5 seconds for quick operations
    medium: 3000,   // 3 seconds for standard operations  
    long: 6000,     // 6 seconds for complex operations
    extended: 12000 // 12 seconds for long operations
  };

  private operationTimeouts: OperationTimeouts = {
    database_query: 2000,      // Database queries should be fast
    api_call: 5000,            // API calls need more time for network
    network_test: 2000,        // Network tests should be quick
    health_check: 1500,        // Health checks need to be fast
    diagnostic_test: 1000,     // Diagnostics should be very quick
    builder_api: 6000,         // Builder.io API may need more time
    supabase_operation: 3000,  // Supabase operations
    recovery_operation: 4000,  // Recovery operations
  };

  constructor() {
    // Adjust timeouts based on environment
    this.adjustForEnvironment();
  }

  private adjustForEnvironment() {
    // Detect if we're in a slow environment (CI, etc.)
    const isSlowEnvironment = this.detectSlowEnvironment();
    
    if (isSlowEnvironment) {
      console.log("📊 Detected slow environment - increasing timeouts by 50%");
      this.adjustTimeouts(1.5);
    } else {
      console.log("⚡ Detected fast environment - using optimized timeouts");
    }
  }

  private detectSlowEnvironment(): boolean {
    // Check various indicators of a slow environment
    const indicators = {
      // CI environments - safely check for CI variables
      hasCI: !!(
        (typeof globalThis !== 'undefined' && globalThis.process?.env?.CI) ||
        import.meta.env?.VITE_CI ||
        import.meta.env?.CI
      ),

      // Check for slow hardware indicators
      hasLimitedMemory: typeof navigator !== 'undefined' &&
                       'deviceMemory' in navigator &&
                       (navigator as any).deviceMemory < 4,

      // Check connection speed if available
      hasSlowConnection: typeof navigator !== 'undefined' &&
                        'connection' in navigator &&
                        (navigator as any).connection?.effectiveType === 'slow-2g',
    };

    return Object.values(indicators).some(Boolean);
  }

  private adjustTimeouts(multiplier: number) {
    // Adjust base config
    Object.keys(this.baseConfig).forEach(key => {
      const typedKey = key as keyof TimeoutConfig;
      this.baseConfig[typedKey] = Math.round(this.baseConfig[typedKey] * multiplier);
    });

    // Adjust operation timeouts
    Object.keys(this.operationTimeouts).forEach(key => {
      const typedKey = key as keyof OperationTimeouts;
      this.operationTimeouts[typedKey] = Math.round(this.operationTimeouts[typedKey] * multiplier);
    });
  }

  getTimeout(operation: keyof OperationTimeouts): number {
    return this.operationTimeouts[operation];
  }

  getBaseTimeout(type: keyof TimeoutConfig): number {
    return this.baseConfig[type];
  }

  createTimeoutPromise<T>(
    operation: Promise<T>, 
    timeoutMs: number, 
    operationName: string = 'operation'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  async withTimeout<T>(
    operation: () => Promise<T>,
    operationType: keyof OperationTimeouts,
    operationName?: string
  ): Promise<T> {
    const timeout = this.getTimeout(operationType);
    const name = operationName || operationType.replace('_', ' ');
    
    console.log(`⏱️ Starting ${name} with ${timeout}ms timeout`);
    
    const start = Date.now();
    try {
      const result = await this.createTimeoutPromise(
        operation(),
        timeout,
        name
      );
      
      const duration = Date.now() - start;
      console.log(`✅ ${name} completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.warn(`⚠️ ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  async withRetryAndTimeout<T>(
    operation: () => Promise<T>,
    operationType: keyof OperationTimeouts,
    maxRetries: number = 2,
    operationName?: string
  ): Promise<T> {
    const name = operationName || operationType.replace('_', ' ');
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 ${name} attempt ${attempt}/${maxRetries + 1}`);
        return await this.withTimeout(operation, operationType, `${name} (attempt ${attempt})`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt <= maxRetries) {
          const delay = Math.min(1000 * attempt, 3000); // Progressive delay, max 3s
          console.log(`⏳ ${name} attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`${name} failed after ${maxRetries + 1} attempts`);
  }

  // Helper methods for common operations
  async timeoutDatabaseQuery<T>(operation: () => Promise<T>): Promise<T> {
    return this.withTimeout(operation, 'database_query', 'database query');
  }

  async timeoutAPICall<T>(operation: () => Promise<T>): Promise<T> {
    return this.withTimeout(operation, 'api_call', 'API call');
  }

  async timeoutHealthCheck<T>(operation: () => Promise<T>): Promise<T> {
    return this.withTimeout(operation, 'health_check', 'health check');
  }

  async timeoutWithRecovery<T>(
    operation: () => Promise<T>,
    operationType: keyof OperationTimeouts,
    recoveryOperation?: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    try {
      return await this.withTimeout(operation, operationType, operationName);
    } catch (error) {
      if (recoveryOperation) {
        console.log(`🔧 Primary operation failed, attempting recovery...`);
        return this.withTimeout(
          recoveryOperation, 
          'recovery_operation', 
          `${operationName || 'operation'} recovery`
        );
      }
      throw error;
    }
  }

  // Get optimized timeout settings for specific scenarios
  getOptimizedSettings() {
    return {
      // Fast UI interactions
      quickResponse: this.baseConfig.short,
      
      // Standard operations
      normalOperation: this.baseConfig.medium,
      
      // Complex workflows
      heavyOperation: this.baseConfig.long,
      
      // Batch operations
      batchOperation: this.baseConfig.extended,
      
      // Specific operation timeouts
      operations: { ...this.operationTimeouts },
    };
  }

  // Performance monitoring
  measureOperation<T>(operation: () => Promise<T>, operationName: string): Promise<{
    result: T;
    duration: number;
    success: boolean;
  }> {
    const start = Date.now();
    
    return operation()
      .then(result => ({
        result,
        duration: Date.now() - start,
        success: true,
      }))
      .catch(error => {
        const duration = Date.now() - start;
        console.error(`📊 Operation "${operationName}" failed after ${duration}ms:`, error);
        throw Object.assign(error, { duration, success: false });
      });
  }
}

export const timeoutManager = new TimeoutManager();

// Export commonly used timeout values for direct use
export const TIMEOUTS = timeoutManager.getOptimizedSettings();

// Utility functions for common patterns
export const withDatabaseTimeout = <T>(operation: () => Promise<T>) => 
  timeoutManager.timeoutDatabaseQuery(operation);

export const withAPITimeout = <T>(operation: () => Promise<T>) => 
  timeoutManager.timeoutAPICall(operation);

export const withHealthTimeout = <T>(operation: () => Promise<T>) => 
  timeoutManager.timeoutHealthCheck(operation);

export const withRetry = <T>(
  operation: () => Promise<T>, 
  operationType: keyof OperationTimeouts,
  maxRetries: number = 2
) => timeoutManager.withRetryAndTimeout(operation, operationType, maxRetries);
