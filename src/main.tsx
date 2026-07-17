import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import { createQueryClient } from "@/application/query-client";
import { createTauriFurrowAdapter } from "@/infrastructure/tauri-furrow-adapter";
import { BakeoffPage } from "@/ui/_bakeoff/BakeoffPage";
import App from "@/ui/app/App";
import "@/ui/index.css";

// composition root: the only place a concrete adapter meets the port
const port = createTauriFurrowAdapter();
const queryClient = createQueryClient();

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("index.html is missing #root");

// t-wf4p: `VITE_BAKEOFF=baseui|rac|radix pnpm tauri dev` swaps the app for the
// headless-UI specimen page, so the real WKWebView accessibility tree can be
// inspected. Dies with the bake-off branch; untouched in a normal build.
const bakeoff: unknown = import.meta.env.VITE_BAKEOFF;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FurrowPortProvider port={port}>
        {typeof bakeoff === "string" ? (
          <BakeoffPage which={bakeoff} />
        ) : (
          <App />
        )}
      </FurrowPortProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
