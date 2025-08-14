import { supabase } from "./supabase";

export interface ModificationEntry {
  id: string;
  timestamp: string;
  type: "autofix" | "manual" | "builder_prompt" | "git_import";
  module: string;
  description: string;
  changes: string[];
  success: boolean;
  context?: {
    user_id?: string;
    git_commit?: string;
    builder_prompt_id?: string;
    error_details?: string;
    files_modified?: string[];
  };
  metadata?: Record<string, any>;
}

export interface GitCommitEntry {
  commit_hash: string;
  author: string;
  date: string;
  message: string;
  files_changed: string[];
  additions: number;
  deletions: number;
}

export interface BuilderPromptRequest {
  prompt: string;
  context: string;
  expected_files?: string[];
  priority: "low" | "medium" | "high";
  category: "bug_fix" | "feature" | "improvement" | "refactor";
}

export interface BuilderPromptResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    modifications: ModificationEntry[];
    files_changed: string[];
    summary: string;
  };
  error?: string;
}

class AutofixHistoryManager {
  async recordModification(entry: Omit<ModificationEntry, "id" | "timestamp">): Promise<string> {
    const modificationEntry: ModificationEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const { error } = await supabase
      .from("autofix_history")
      .insert([modificationEntry]);

    if (error) {
      console.error("Failed to record modification:", error.message || error);
      throw new Error(`Database error: ${error.message || error.code || "Unknown error"}`);
    }

    return modificationEntry.id;
  }

  async getModificationHistory(
    limit: number = 50,
    offset: number = 0,
    module?: string,
    type?: ModificationEntry["type"]
  ): Promise<ModificationEntry[]> {
    let query = supabase
      .from("autofix_history")
      .select("*")
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (module) {
      query = query.eq("module", module);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch modification history:", error.message || error);
      throw new Error(`Database error: ${error.message || error.code || "Unknown error"}`);
    }

    return data || [];
  }

  async importGitHistory(): Promise<void> {
    try {
      // Simulate git log parsing - in real implementation, this would call git API
      const gitCommits = await this.fetchGitCommits();
      
      for (const commit of gitCommits) {
        const modificationEntry: Omit<ModificationEntry, "id" | "timestamp"> = {
          type: "git_import",
          module: "repository",
          description: `Git commit: ${commit.message}`,
          changes: commit.files_changed.map(file => `Modified ${file}`),
          success: true,
          context: {
            git_commit: commit.commit_hash,
            files_modified: commit.files_changed,
          },
          metadata: {
            author: commit.author,
            commit_date: commit.date,
            additions: commit.additions,
            deletions: commit.deletions,
          },
        };

        await this.recordModification(modificationEntry);
      }
    } catch (error) {
      console.error("Failed to import git history:", error);
      throw error;
    }
  }

  private async fetchGitCommits(): Promise<GitCommitEntry[]> {
    // Mock implementation - in real scenario, this would fetch from git API
    return [
      {
        commit_hash: "abc123",
        author: "Adriano Hermida Maia",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        message: "feat: Implement office modules reorganization",
        files_changed: [
          "client/components/Sidebar.tsx",
          "client/components/OfficeModulesWindow.tsx",
          "client/components/AppShell.tsx"
        ],
        additions: 354,
        deletions: 73,
      },
      {
        commit_hash: "def456",
        author: "Adriano Hermida Maia", 
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        message: "fix: Resolve Label import error in InboxLegalV2",
        files_changed: [
          "client/pages/InboxLegalV2.tsx"
        ],
        additions: 1,
        deletions: 0,
      },
      {
        commit_hash: "ghi789",
        author: "Adriano Hermida Maia",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        message: "fix: Update toast components to use Radix UI properly",
        files_changed: [
          "client/components/ui/toast.tsx",
          "client/components/ui/toaster.tsx",
          "client/hooks/use-toast.ts",
          "client/global.css"
        ],
        additions: 89,
        deletions: 45,
      }
    ];
  }

  async executeBuilderPrompt(request: BuilderPromptRequest): Promise<BuilderPromptResponse> {
    const promptId = crypto.randomUUID();
    
    try {
      // Record the prompt request
      await this.recordModification({
        type: "builder_prompt",
        module: "builder_integration",
        description: `Builder.io prompt: ${request.prompt.substring(0, 100)}...`,
        changes: [`Prompt execution requested: ${request.category}`],
        success: true,
        context: {
          builder_prompt_id: promptId,
        },
        metadata: {
          prompt: request.prompt,
          context: request.context,
          priority: request.priority,
          category: request.category,
        },
      });

      // Simulate Builder.io API call
      const response = await this.callBuilderAPI(request, promptId);
      
      // Record the results
      if (response.status === "completed" && response.result) {
        for (const modification of response.result.modifications) {
          await this.recordModification({
            ...modification,
            context: {
              ...modification.context,
              builder_prompt_id: promptId,
            },
          });
        }
      }

      return response;
    } catch (error) {
      await this.recordModification({
        type: "builder_prompt",
        module: "builder_integration",
        description: `Failed Builder.io prompt: ${request.prompt.substring(0, 100)}...`,
        changes: [],
        success: false,
        context: {
          builder_prompt_id: promptId,
          error_details: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  private async callBuilderAPI(
    request: BuilderPromptRequest, 
    promptId: string
  ): Promise<BuilderPromptResponse> {
    // Mock Builder.io API integration
    // In real implementation, this would call Builder.io's API
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock successful response
    const mockModifications: ModificationEntry[] = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "builder_prompt",
        module: "autofix_enhancement",
        description: `Applied fix for: ${request.prompt}`,
        changes: [
          "Enhanced autofix system with history tracking",
          "Added Builder.io integration",
          "Implemented modification logging",
        ],
        success: true,
        context: {
          builder_prompt_id: promptId,
          files_modified: request.expected_files || [],
        },
      },
    ];

    return {
      id: promptId,
      status: "completed",
      result: {
        modifications: mockModifications,
        files_changed: request.expected_files || [],
        summary: `Successfully applied ${request.category} modifications based on prompt`,
      },
    };
  }

  async getSystemStats(): Promise<{
    total_modifications: number;
    successful_modifications: number;
    failed_modifications: number;
    modifications_by_type: Record<ModificationEntry["type"], number>;
    recent_activity: ModificationEntry[];
  }> {
    const { data: allMods, error } = await supabase
      .from("autofix_history")
      .select("*");

    if (error) {
      console.error("Failed to fetch system stats:", error.message || error);
      throw new Error(`Database error: ${error.message || error.code || "Unknown error"}`);
    }

    const modifications = allMods || [];
    const successful = modifications.filter(m => m.success);
    const failed = modifications.filter(m => !m.success);

    const byType = modifications.reduce((acc, mod) => {
      acc[mod.type] = (acc[mod.type] || 0) + 1;
      return acc;
    }, {} as Record<ModificationEntry["type"], number>);

    const recent = modifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      total_modifications: modifications.length,
      successful_modifications: successful.length,
      failed_modifications: failed.length,
      modifications_by_type: byType,
      recent_activity: recent,
    };
  }
}

export const autofixHistory = new AutofixHistoryManager();
