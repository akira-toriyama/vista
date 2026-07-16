import { createContext, useContext, type ReactNode } from "react";
import type { FurrowPort } from "./furrow-port";

const FurrowPortContext = createContext<FurrowPort | null>(null);

/** Composition root injects the concrete adapter here; ui never sees it. */
export function FurrowPortProvider({ port, children }: { port: FurrowPort; children: ReactNode }) {
  return <FurrowPortContext.Provider value={port}>{children}</FurrowPortContext.Provider>;
}

export function useFurrowPort(): FurrowPort {
  const port = useContext(FurrowPortContext);
  if (!port) throw new Error("useFurrowPort: no FurrowPortProvider above this component");
  return port;
}
