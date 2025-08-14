/**
 * Telemetry System - Critical Event Tracking
 * 
 * Tracks 5+ critical business events for legal case management
 */

import { supabase } from './supabase';

interface TelemetryEvent {
  event_name: string;
  user_id?: string;
  user_email?: string;
  user_type?: 'cliente' | 'team' | 'superadmin';
  properties: Record<string, any>;
  timestamp: string;
  session_id: string;
  page_url: string;
  user_agent: string;
  ip_address?: string;
}

interface CriticalEvents {
  // 1. User Authentication
  'user_login': {
    method: 'email' | 'demo';
    user_type: string;
    oab?: number;
  };
  
  // 2. Process Management
  'process_created': {
    numero_cnj: string;
    cliente_cpfcnpj: string;
    tribunal: string;
    method: 'manual' | 'import' | 'sync';
  };
  
  // 3. Journey Operations
  'journey_started': {
    template_id: string;
    template_name: string;
    cliente_cpfcnpj: string;
    numero_cnj?: string;
    estimated_days: number;
  };
  
  // 4. Document Processing
  'document_uploaded': {
    stage_instance_id: string;
    requirement_id: string;
    file_type: string;
    file_size: number;
    journey_instance_id: string;
  };
  
  // 5. AI Tool Usage
  'ai_tool_executed': {
    tool_name: string;
    context: 'chat' | 'inbox' | 'process';
    numero_cnj?: string;
    success: boolean;
    execution_time_ms: number;
  };
  
  // 6. Business Metrics
  'stage_completed': {
    stage_id: string;
    stage_title: string;
    journey_instance_id: string;
    completion_time_hours: number;
    was_overdue: boolean;
  };
  
  // 7. Financial Events
  'payment_milestone_triggered': {
    stage_id: string;
    parcela_numero: number;
    valor: number;
    trigger_type: 'started' | 'completed';
  };
  
  // 8. System Health
  'sync_job_completed': {
    job_id: string;
    numero_cnj: string;
    provider: 'advise' | 'escavador';
    duration_seconds: number;
    status: 'ok' | 'error';
    records_processed: number;
  };
}

class TelemetryService {
  private sessionId: string;
  private isEnabled: boolean = true;
  private queue: TelemetryEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBatchSize: number = 50;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
    this.setupPageEventListeners();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUser() {
    const user = supabase.auth.getUser();
    return user;
  }

  private setupPageEventListeners() {
    // Track page views
    this.trackPageView();
    
    // Track page navigation
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });
    
    // Override pushState and replaceState for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.trackPageView(), 0);
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.trackPageView(), 0);
    };

    // Track unload events
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private async trackPageView() {
    this.track('page_view', {
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer
    });
  }

  /**
   * Track a critical business event
   */
  track<T extends keyof CriticalEvents>(
    eventName: T,
    properties: CriticalEvents[T]
  ): void;
  track(eventName: string, properties: Record<string, any>): void;
  track(eventName: string, properties: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: TelemetryEvent = {
      event_name: eventName,
      properties: {
        ...properties,
        timestamp_local: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
      },
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    };

    // Add user context if available
    this.getCurrentUser().then(({ data: { user } }) => {
      if (user) {
        event.user_id = user.id;
        event.user_email = user.email;
        // Note: user_type would need to be determined from app context
      }
    });

    this.queue.push(event);

    // Flush immediately for critical events
    if (this.isCriticalEvent(eventName)) {
      this.flush();
    }
  }

  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = [
      'user_login',
      'process_created',
      'journey_started',
      'ai_tool_executed',
      'sync_job_completed'
    ];
    return criticalEvents.includes(eventName);
  }

  private startPeriodicFlush() {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0, this.maxBatchSize);
    
    try {
      // Store in Supabase table
      const { error } = await supabase
        .from('telemetry_events')
        .insert(events);

      if (error) {
        console.error('Telemetry flush error:', error);
        // Re-queue events on error
        this.queue.unshift(...events);
      }
    } catch (error) {
      console.error('Telemetry network error:', error);
      // Re-queue events on network error
      this.queue.unshift(...events);
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName: string, value: number, unit: string = 'ms') {
    this.track('performance_metric', {
      metric_name: metricName,
      value,
      unit,
      page_path: window.location.pathname
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error_occurred', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      page_path: window.location.pathname,
      context: context || {}
    });
  }

  /**
   * Track user interactions
   */
  trackInteraction(
    element: string, 
    action: string, 
    context?: Record<string, any>
  ) {
    this.track('user_interaction', {
      element,
      action,
      page_path: window.location.pathname,
      context: context || {}
    });
  }

  /**
   * Track business KPIs
   */
  trackKPI(kpiName: string, value: number, metadata?: Record<string, any>) {
    this.track('kpi_measurement', {
      kpi_name: kpiName,
      value,
      metadata: metadata || {}
    });
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.queue = [];
    }
  }

  /**
   * Get telemetry status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      sessionId: this.sessionId,
      queueSize: this.queue.length
    };
  }
}

// Create singleton instance
export const telemetry = new TelemetryService();

// Convenience functions for critical events
export const trackUserLogin = (method: 'email' | 'demo', userType: string, oab?: number) => {
  telemetry.track('user_login', { method, user_type: userType, oab });
};

export const trackProcessCreated = (numeroCnj: string, clienteCpfcnpj: string, tribunal: string, method: 'manual' | 'import' | 'sync' = 'manual') => {
  telemetry.track('process_created', { numero_cnj: numeroCnj, cliente_cpfcnpj: clienteCpfcnpj, tribunal, method });
};

export const trackJourneyStarted = (templateId: string, templateName: string, clienteCpfcnpj: string, estimatedDays: number, numeroCnj?: string) => {
  telemetry.track('journey_started', { 
    template_id: templateId, 
    template_name: templateName, 
    cliente_cpfcnpj: clienteCpfcnpj, 
    numero_cnj: numeroCnj,
    estimated_days: estimatedDays 
  });
};

export const trackDocumentUploaded = (stageInstanceId: string, requirementId: string, fileType: string, fileSize: number, journeyInstanceId: string) => {
  telemetry.track('document_uploaded', { 
    stage_instance_id: stageInstanceId, 
    requirement_id: requirementId, 
    file_type: fileType, 
    file_size: fileSize, 
    journey_instance_id: journeyInstanceId 
  });
};

export const trackAIToolExecuted = (toolName: string, context: 'chat' | 'inbox' | 'process', success: boolean, executionTimeMs: number, numeroCnj?: string) => {
  telemetry.track('ai_tool_executed', { 
    tool_name: toolName, 
    context, 
    numero_cnj: numeroCnj, 
    success, 
    execution_time_ms: executionTimeMs 
  });
};

export const trackStageCompleted = (stageId: string, stageTitle: string, journeyInstanceId: string, completionTimeHours: number, wasOverdue: boolean) => {
  telemetry.track('stage_completed', { 
    stage_id: stageId, 
    stage_title: stageTitle, 
    journey_instance_id: journeyInstanceId, 
    completion_time_hours: completionTimeHours, 
    was_overdue: wasOverdue 
  });
};

export const trackSyncJobCompleted = (jobId: string, numeroCnj: string, provider: 'advise' | 'escavador', durationSeconds: number, status: 'ok' | 'error', recordsProcessed: number) => {
  telemetry.track('sync_job_completed', { 
    job_id: jobId, 
    numero_cnj: numeroCnj, 
    provider, 
    duration_seconds: durationSeconds, 
    status, 
    records_processed: recordsProcessed 
  });
};

// Hook for React components
export const useTelemetry = () => {
  return {
    track: telemetry.track.bind(telemetry),
    trackPerformance: telemetry.trackPerformance.bind(telemetry),
    trackError: telemetry.trackError.bind(telemetry),
    trackInteraction: telemetry.trackInteraction.bind(telemetry),
    trackKPI: telemetry.trackKPI.bind(telemetry),
    getStatus: telemetry.getStatus.bind(telemetry)
  };
};

export default telemetry;
