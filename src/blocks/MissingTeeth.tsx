import { createContext, useContext, useMemo, type ReactNode } from "react";

const MissingTeethContext = createContext<Set<number>>(new Set());

export function MissingTeethProvider({
  teeth,
  children,
}: {
  teeth?: number[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => new Set(Array.isArray(teeth) ? teeth : []),
    [teeth],
  );
  return (
    <MissingTeethContext.Provider value={value}>
      {children}
    </MissingTeethContext.Provider>
  );
}

export function useMissingTeeth() {
  return useContext(MissingTeethContext);
}
