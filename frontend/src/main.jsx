import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [new BrowserTracing()],
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
      enabled: true,
    });
  } catch (e) {
    // falha silenciosa para não quebrar a app em produção
  }
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Sentry.ErrorBoundary fallback={<div>Ocorreu um erro inesperado. Recarregue a página.</div>}>
    <App />
  </Sentry.ErrorBoundary>
);
