"use client";
import { useEffect, useRef } from "react";
import type { ChartType, ChartData, ChartOptions, ChartConfiguration } from "chart.js";
import styles from "./Chart.module.css";

// We will dynamically import chart.js only on client
type ChartCtorType = typeof import("chart.js").Chart;
let ChartCtor: ChartCtorType | null = null;

export type ChartProps<T extends ChartType = ChartType> = {
  type: T;
  data: ChartData<T>;
  options?: ChartOptions<T>;
  height?: number;
  onCanvas?: (canvas: HTMLCanvasElement | null) => void;
  onCanvasAction?: (canvas: HTMLCanvasElement | null) => void;
  plugins?: any[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptions<T extends ChartType>(options?: ChartOptions<T>): ChartOptions<T> {
  if (!options) return {} as ChartOptions<T>;
  return (isPlainObject(options) ? options : ({} as any)) as ChartOptions<T>;
}

export default function Chart<T extends ChartType = ChartType>({
  type,
  data,
  options,
  height,
  onCanvas,
  onCanvasAction,
  plugins,
}: ChartProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any | null>(null);
  const onCanvasRef = useRef<typeof onCanvasAction | typeof onCanvas>(onCanvasAction ?? onCanvas);

  useEffect(() => {
    onCanvasRef.current = onCanvasAction ?? onCanvas;
  }, [onCanvasAction, onCanvas]);

  type Destroyable = { destroy: () => void };

  // Initialize (or re-initialize) chart instance only when `type` changes.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!ChartCtor) {
          const mod = await import("chart.js/auto");
          ChartCtor = (mod as { default: ChartCtorType }).default;
        }
        if (cancelled) return;

        if (chartRef.current && (chartRef.current as Destroyable).destroy) {
          try {
            (chartRef.current as Destroyable).destroy();
          } catch {}
        }
        chartRef.current = null;

        if (canvasRef.current && ChartCtor) {
          const cfg: ChartConfiguration<T> = {
            type,
            data,
            options: normalizeOptions(options),
          } as ChartConfiguration<T>;
          if (plugins && Array.isArray(plugins) && plugins.length) cfg.plugins = plugins as any;
          chartRef.current = new ChartCtor(canvasRef.current, cfg) as unknown;
        }

        try {
          onCanvasRef.current?.(canvasRef.current);
        } catch {}
      } catch (e) {
        // Avoid unhandled promise rejections from Chart.js config/runtime errors.
        try {
          console.error(e);
        } catch {}
        chartRef.current = null;
        try {
          onCanvasRef.current?.(null);
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
      if (chartRef.current && (chartRef.current as Destroyable).destroy) {
        try {
          const chart: any = chartRef.current;
          // Prevent any in-flight hover/tooltip handlers from running during teardown.
          try {
            chart.stop?.();
          } catch {}
          try {
            chart.options = chart.options ?? {};
            chart.options.events = [];
            if (chart.options.plugins?.tooltip) chart.options.plugins.tooltip.enabled = false;
          } catch {}
          try {
            chart.setActiveElements?.([]);
          } catch {}
          try {
            chart.tooltip?.setActiveElements?.([], { x: 0, y: 0 });
          } catch {}
          try {
            chart._active = [];
          } catch {}
          try {
            if (chart.tooltip) chart.tooltip._active = [];
          } catch {}
          try {
            chart._lastEvent = null;
          } catch {}
          try {
            chart.update?.("none");
          } catch {}
          (chartRef.current as Destroyable).destroy();
        } catch {}
      }
      chartRef.current = null;
      try {
        onCanvasRef.current?.(null);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Update data/options without recreating the chart (prevents blinking).
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      const chart: any = chartRef.current;

      const prevEvents = chart?.config?.options?.events;
      const prevTooltipEnabled = chart?.config?.options?.plugins?.tooltip?.enabled;

      // Stop any in-flight animations to avoid transient meta/controller states.
      try {
        chart.stop?.();
      } catch {}

      // When data changes while the user is hovering a chart, Chart.js can
      // briefly retain "active" tooltip elements whose dataset controllers no
      // longer exist, which may throw (controller is null).
      // Clear hover/tooltip state before applying updates.
      try {
        chart.setActiveElements?.([]);
      } catch {}
      try {
        chart.tooltip?.setActiveElements?.([], { x: 0, y: 0 });
      } catch {}

      // Defensive: also clear internal active state used by tooltip/interaction.
      try {
        chart._active = [];
      } catch {}
      try {
        if (chart.tooltip) chart.tooltip._active = [];
      } catch {}
      try {
        chart._lastEvent = null;
      } catch {}

      chart.data = data as any;

      const nextOptions: any = normalizeOptions(options) as any;
      if (nextOptions.animation === undefined) nextOptions.animation = false;

      // Apply options via config (Chart.js will resolve and validate internally).
      // Temporarily disable interactions during update to avoid tooltip touching stale controllers.
      const applyOptions: any = {
        ...nextOptions,
        plugins: {
          ...(nextOptions.plugins ?? {}),
          tooltip: nextOptions.plugins?.tooltip ? { ...(nextOptions.plugins.tooltip as any) } : nextOptions.plugins?.tooltip,
        },
      };
      applyOptions.events = [];
      if (applyOptions.plugins?.tooltip) applyOptions.plugins.tooltip.enabled = false;
      chart.config.options = applyOptions;

      if (plugins && Array.isArray(plugins)) {
        chart.config.plugins = plugins as any;
      }
      // Use a full update so controllers are rebuilt correctly.
      chart.update("none");

      // Restore interactions after update.
      try {
        const restored: any = {
          ...nextOptions,
          plugins: {
            ...(nextOptions.plugins ?? {}),
            tooltip: nextOptions.plugins?.tooltip ? { ...(nextOptions.plugins.tooltip as any) } : nextOptions.plugins?.tooltip,
          },
        };
        restored.events = prevEvents ?? restored.events;
        if (restored.plugins?.tooltip && typeof prevTooltipEnabled === "boolean") {
          restored.plugins.tooltip.enabled = prevTooltipEnabled;
        }
        chart.config.options = restored;
        chart.update("none");
      } catch {}
    } catch {}
  }, [data, options, plugins]);

  return (
    <div
      className={styles.container}
      style={
        height
          ? {
              height: `${height}px`,
              minHeight: `${height}px`,
            }
          : undefined
      }
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
