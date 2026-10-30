"use client";

import { useEffect, useRef } from "react";
import type { BubblesConfig, Effect } from "@basmilius/sparkle";

/** Floating green bubble background powered by Sparkle's canvas bubbles effect. */
export function DashboardBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let bubbles: Effect<BubblesConfig> | null = null;
    let cancelled = false;

    import("@basmilius/sparkle").then(({ createBubbles }) => {
      if (cancelled) return;

      bubbles = createBubbles({
        count: 24,
        sizeRange: [24, 80],
        colors: ["#22c55e", "#4ade80", "#86efac"],
        speed: 0.6,
        wobbleAmount: 1,
        popOnClick: false,
      });
      bubbles.mount(canvas).start();
    });

    return () => {
      cancelled = true;
      bubbles?.destroy();
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="pointer-events-none" />
    </div>
  );
}
