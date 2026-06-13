"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type DashboardMode = "incidents" | "guarding";

interface DashboardModeContextValue {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
}

const DashboardModeContext = createContext<DashboardModeContextValue | null>(null);

export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DashboardMode>("incidents");

  return (
    <DashboardModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (!context) throw new Error("useDashboardMode must be used within DashboardModeProvider");
  return context;
}
