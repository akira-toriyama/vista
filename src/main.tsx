import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import { createQueryClient } from "@/application/query-client";
import { createTauriFurrowAdapter } from "@/infrastructure/tauri-furrow-adapter";
import App from "@/ui/app/App";
import "@/ui/index.css";

// composition root: the only place a concrete adapter meets the port
const port = createTauriFurrowAdapter();
const queryClient = createQueryClient();

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("index.html is missing #root");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FurrowPortProvider port={port}>
        <App />
      </FurrowPortProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
