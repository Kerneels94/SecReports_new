/**
 * Dashboard mode context and hook.
 * Switches between "incidents" and "guarding" dashboard views.
 */
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** Which dashboard view is currently active. */
type DashboardMode = "incidents" | "guarding";

/** Shape of the dashboard-mode context value. */
interface DashboardModeContextValue {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
}

const DashboardModeContext = createContext<DashboardModeContextValue | null>(null);

/** Provides the current dashboard mode and a setter to all children via context. */
export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DashboardMode>("incidents");

  return (
    <DashboardModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

/** Consume the DashboardModeContext; throws if used outside DashboardModeProvider. */
export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (!context) throw new Error("useDashboardMode must be used within DashboardModeProvider");
  return context;
}
