export interface RoutePerformanceMetrics {
  path: string;
  loadTime: number;
  renderTime: number;
  resourceCount: number;
  memoryUsage?: number;
  timestamp: string;
  userAgent: string;
  viewport: string;
}

export interface PerformanceBenchmark {
  path: string;
  target_load_time: number; // Expected load time in ms
  target_render_time: number; // Expected render time in ms
  priority: "critical" | "high" | "medium" | "low";
  tolerance: number; // Acceptable variance percentage
}

export class RoutePerformanceMonitor {
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private metrics: RoutePerformanceMetrics[] = [];

  constructor() {
    this.initializeBenchmarks();
  }

  private initializeBenchmarks() {
    // Define performance benchmarks for critical routes
    const benchmarks: PerformanceBenchmark[] = [
      {
        path: "/",
        target_load_time: 300,
        target_render_time: 200,
        priority: "critical",
        tolerance: 20,
      },
      {
        path: "/processos",
        target_load_time: 500,
        target_render_time: 300,
        priority: "critical",
        tolerance: 25,
      },
      {
        path: "/clientes",
        target_load_time: 400,
        target_render_time: 250,
        priority: "high",
        tolerance: 30,
      },
      {
        path: "/crm/contatos",
        target_load_time: 600,
        target_render_time: 400,
        priority: "high",
        tolerance: 25,
      },
      {
        path: "/portal/chat",
        target_load_time: 350,
        target_render_time: 200,
        priority: "critical",
        tolerance: 20,
      },
      {
        path: "/portal/processos",
        target_load_time: 450,
        target_render_time: 300,
        priority: "high",
        tolerance: 25,
      },
    ];

    benchmarks.forEach((benchmark) => {
      this.benchmarks.set(benchmark.path, benchmark);
    });
  }

  async measureRoutePerformance(
    path: string,
  ): Promise<RoutePerformanceMetrics> {
    const startTime = performance.now();

    try {
      // Measure navigation timing if available
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;

      const loadTime = navigation
        ? navigation.loadEventEnd - navigation.fetchStart
        : 0;
      const renderTime = performance.now() - startTime;

      // Get resource count
      const resources = performance.getEntriesByType("resource");
      const resourceCount = resources.length;

      // Get memory usage if available
      const memory = (performance as any).memory;
      const memoryUsage = memory ? memory.usedJSHeapSize : undefined;

      // Get viewport info
      const viewport = `${window.innerWidth}x${window.innerHeight}`;

      const metrics: RoutePerformanceMetrics = {
        path,
        loadTime: Math.round(loadTime),
        renderTime: Math.round(renderTime),
        resourceCount,
        memoryUsage,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport,
      };

      this.metrics.push(metrics);

      // Keep only last 100 metrics to prevent memory bloat
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      return metrics;
    } catch (error) {
      console.warn("Performance measurement failed:", error);

      return {
        path,
        loadTime: 0,
        renderTime: performance.now() - startTime,
        resourceCount: 0,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };
    }
  }

  getBenchmark(path: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(path);
  }

  evaluatePerformance(metrics: RoutePerformanceMetrics): {
    status: "excellent" | "good" | "acceptable" | "poor";
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const benchmark = this.getBenchmark(metrics.path);
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!benchmark) {
      return {
        status: "acceptable",
        score: 75,
        issues: ["No benchmark defined for this route"],
        recommendations: [
          "Define performance benchmarks for better monitoring",
        ],
      };
    }

    let score = 100;

    // Check load time
    const loadTimeVariance =
      ((metrics.loadTime - benchmark.target_load_time) /
        benchmark.target_load_time) *
      100;
    if (loadTimeVariance > benchmark.tolerance) {
      const penalty = Math.min(30, loadTimeVariance - benchmark.tolerance);
      score -= penalty;
      issues.push(
        `Load time ${metrics.loadTime}ms exceeds target ${benchmark.target_load_time}ms`,
      );
      recommendations.push("Optimize asset loading and reduce bundle size");
    }

    // Check render time
    const renderTimeVariance =
      ((metrics.renderTime - benchmark.target_render_time) /
        benchmark.target_render_time) *
      100;
    if (renderTimeVariance > benchmark.tolerance) {
      const penalty = Math.min(25, renderTimeVariance - benchmark.tolerance);
      score -= penalty;
      issues.push(
        `Render time ${metrics.renderTime}ms exceeds target ${benchmark.target_render_time}ms`,
      );
      recommendations.push(
        "Optimize component rendering and reduce computational complexity",
      );
    }

    // Check resource count (general guideline: <50 resources is good)
    if (metrics.resourceCount > 50) {
      score -= 10;
      issues.push(`High resource count: ${metrics.resourceCount} resources`);
      recommendations.push("Reduce number of HTTP requests by bundling assets");
    }

    // Check memory usage (if available)
    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      score -= 15;
      issues.push(
        `High memory usage: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB`,
      );
      recommendations.push("Optimize memory usage and check for memory leaks");
    }

    score = Math.max(0, Math.round(score));

    let status: "excellent" | "good" | "acceptable" | "poor";
    if (score >= 90) status = "excellent";
    else if (score >= 75) status = "good";
    else if (score >= 60) status = "acceptable";
    else status = "poor";

    return { status, score, issues, recommendations };
  }

  getMetricsHistory(path?: string): RoutePerformanceMetrics[] {
    if (path) {
      return this.metrics.filter((metric) => metric.path === path);
    }
    return [...this.metrics];
  }

  getPerformanceSummary(): {
    total_routes_measured: number;
    avg_load_time: number;
    avg_render_time: number;
    routes_above_target: string[];
    critical_issues: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        total_routes_measured: 0,
        avg_load_time: 0,
        avg_render_time: 0,
        routes_above_target: [],
        critical_issues: [],
      };
    }

    const avgLoadTime =
      this.metrics.reduce((sum, m) => sum + m.loadTime, 0) /
      this.metrics.length;
    const avgRenderTime =
      this.metrics.reduce((sum, m) => sum + m.renderTime, 0) /
      this.metrics.length;

    const routesAboveTarget: string[] = [];
    const criticalIssues: string[] = [];

    // Group metrics by path to get latest for each route
    const latestMetrics = new Map<string, RoutePerformanceMetrics>();
    this.metrics.forEach((metric) => {
      const existing = latestMetrics.get(metric.path);
      if (
        !existing ||
        new Date(metric.timestamp) > new Date(existing.timestamp)
      ) {
        latestMetrics.set(metric.path, metric);
      }
    });

    latestMetrics.forEach((metric) => {
      const evaluation = this.evaluatePerformance(metric);

      if (evaluation.status === "poor") {
        routesAboveTarget.push(metric.path);
      }

      if (evaluation.issues.length > 0) {
        criticalIssues.push(`${metric.path}: ${evaluation.issues.join(", ")}`);
      }
    });

    return {
      total_routes_measured: latestMetrics.size,
      avg_load_time: Math.round(avgLoadTime),
      avg_render_time: Math.round(avgRenderTime),
      routes_above_target: routesAboveTarget,
      critical_issues: criticalIssues.slice(0, 10), // Limit to prevent overflow
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  exportMetrics(): string {
    return JSON.stringify(
      {
        benchmarks: Object.fromEntries(this.benchmarks),
        metrics: this.metrics,
        summary: this.getPerformanceSummary(),
        exported_at: new Date().toISOString(),
      },
      null,
      2,
    );
  }
}

export const routePerformanceMonitor = new RoutePerformanceMonitor();
