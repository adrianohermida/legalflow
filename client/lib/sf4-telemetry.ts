import { supabase, lf } from './supabase';

export interface SF4TelemetryEvent {
  event_name: 'sf4_vincular_cnj' | 'sf4_criar_etapa' | 'sf4_notificar' | 'sf4_buscar_cadastrar' | 'sf4_filter_change' | 'sf4_tab_switch' | 'sf4_save_view';
  properties: Record<string, any>;
  user_id?: string;
  session_id?: string;
}

export interface SF4SavedView {
  id?: string;
  name: string;
  user_id: string;
  view_type: 'inbox_publicacoes' | 'inbox_movimentacoes';
  filters: {
    dateFrom: string;
    dateTo: string;
    tribunal: string;
    searchText: string;
  };
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

class SF4TelemetryManager {
  private sessionId: string;
  private userId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeUser();
  }

  private generateSessionId(): string {
    return `sf4_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id || null;
    } catch (error) {
      console.warn('Failed to get user for telemetry:', error);
    }
  }

  async trackEvent(event: SF4TelemetryEvent): Promise<void> {
    try {
      const eventData = {
        event_name: event.event_name,
        properties: {
          ...event.properties,
          session_id: this.sessionId,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          feature: 'sf4_inbox',
        },
        user_id: this.userId,
        created_at: new Date().toISOString(),
      };

      // Track in public telemetry_events table
      const { error } = await supabase
        .from('telemetry_events')
        .insert(eventData);

      if (error) {
        console.warn('Failed to track telemetry event:', error);
      }
    } catch (error) {
      console.warn('Telemetry tracking error:', error);
    }
  }

  async trackVincularCnj(itemId: number, cnj: string, tab: string): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_vincular_cnj',
      properties: {
        item_id: itemId,
        cnj,
        tab,
        action_type: 'link_process',
      }
    });
  }

  async trackCriarEtapa(itemId: number, journeyInstanceId: string, templateStageId: string, createdActivity: boolean, tab: string): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_criar_etapa',
      properties: {
        item_id: itemId,
        journey_instance_id: journeyInstanceId,
        template_stage_id: templateStageId,
        created_activity: createdActivity,
        tab,
        action_type: 'create_stage',
      }
    });
  }

  async trackNotificar(itemId: number, tab: string, hasCustomMessage: boolean): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_notificar',
      properties: {
        item_id: itemId,
        tab,
        has_custom_message: hasCustomMessage,
        action_type: 'notify_responsible',
      }
    });
  }

  async trackBuscarCadastrar(itemId: number, source: 'advise' | 'escavador', tab: string): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_buscar_cadastrar',
      properties: {
        item_id: itemId,
        source,
        tab,
        action_type: 'search_register',
      }
    });
  }

  async trackFilterChange(filterType: string, filterValue: any, tab: string): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_filter_change',
      properties: {
        filter_type: filterType,
        filter_value: filterValue,
        tab,
        action_type: 'filter_update',
      }
    });
  }

  async trackTabSwitch(fromTab: string, toTab: string): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_tab_switch',
      properties: {
        from_tab: fromTab,
        to_tab: toTab,
        action_type: 'tab_navigation',
      }
    });
  }

  async trackSaveView(viewName: string, viewType: string, filters: any): Promise<void> {
    await this.trackEvent({
      event_name: 'sf4_save_view',
      properties: {
        view_name: viewName,
        view_type: viewType,
        filters,
        action_type: 'save_view',
      }
    });
  }
}

class SF4SavedViewManager {
  private userId: string | null = null;

  constructor() {
    this.initializeUser();
  }

  private async initializeUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id || null;
    } catch (error) {
      console.warn('Failed to get user for saved views:', error);
    }
  }

  async saveView(view: Omit<SF4SavedView, 'id' | 'created_at' | 'updated_at'>): Promise<SF4SavedView | null> {
    if (!this.userId) {
      console.warn('No user ID available for saving view');
      return null;
    }

    try {
      const viewData = {
        ...view,
        user_id: this.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await lf
        .from('saved_views')
        .insert(viewData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to save view:', error);
      return null;
    }
  }

  async loadViews(viewType: 'inbox_publicacoes' | 'inbox_movimentacoes'): Promise<SF4SavedView[]> {
    if (!this.userId) return [];

    try {
      const { data, error } = await lf
        .from('saved_views')
        .select('*')
        .eq('user_id', this.userId)
        .eq('view_type', viewType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to load views:', error);
      return [];
    }
  }

  async updateView(viewId: string, updates: Partial<SF4SavedView>): Promise<SF4SavedView | null> {
    try {
      const { data, error } = await lf
        .from('saved_views')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', viewId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to update view:', error);
      return null;
    }
  }

  async deleteView(viewId: string): Promise<boolean> {
    try {
      const { error } = await lf
        .from('saved_views')
        .delete()
        .eq('id', viewId)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete view:', error);
      return false;
    }
  }

  async setDefaultView(viewId: string, viewType: 'inbox_publicacoes' | 'inbox_movimentacoes'): Promise<boolean> {
    try {
      // First, unset all default views for this view type
      await lf
        .from('saved_views')
        .update({ is_default: false })
        .eq('user_id', this.userId)
        .eq('view_type', viewType);

      // Then set the selected view as default
      const { error } = await lf
        .from('saved_views')
        .update({ is_default: true })
        .eq('id', viewId)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to set default view:', error);
      return false;
    }
  }

  async getDefaultView(viewType: 'inbox_publicacoes' | 'inbox_movimentacoes'): Promise<SF4SavedView | null> {
    if (!this.userId) return null;

    try {
      const { data, error } = await lf
        .from('saved_views')
        .select('*')
        .eq('user_id', this.userId)
        .eq('view_type', viewType)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data || null;
    } catch (error) {
      console.error('Failed to get default view:', error);
      return null;
    }
  }
}

// Export singleton instances
export const sf4Telemetry = new SF4TelemetryManager();
export const sf4SavedViews = new SF4SavedViewManager();

// Export utility functions for common operations
export const sf4Utils = {
  // Debounced filter tracking to avoid too many events
  trackFilterChangeDebounced: (() => {
    let timeout: NodeJS.Timeout;
    return (filterType: string, filterValue: any, tab: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sf4Telemetry.trackFilterChange(filterType, filterValue, tab);
      }, 1000); // Track after 1 second of no changes
    };
  })(),

  // Generate filter summary for telemetry
  getFilterSummary: (filters: any) => ({
    has_date_filter: !!(filters.dateFrom && filters.dateTo),
    has_tribunal_filter: filters.tribunal !== 'all',
    has_search_filter: !!filters.searchText,
    total_active_filters: [
      filters.dateFrom && filters.dateTo,
      filters.tribunal !== 'all',
      filters.searchText,
    ].filter(Boolean).length,
  }),

  // Validate CNJ format for telemetry quality
  isValidCnj: (cnj: string): boolean => {
    const cnjPattern = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;
    return cnjPattern.test(cnj);
  },
};
