import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { ADMIN_TOKEN_KEY, DRIVER_TOKEN_KEY } from "@/lib/auth-constants";

const queryClient = new QueryClient();

// Note: We use custom admin/driver authentication, not OAuth
// Errors are handled locally in each page component

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Include auth tokens from localStorage if available
        const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
        const driverToken = localStorage.getItem(DRIVER_TOKEN_KEY);
        
        const headers: Record<string, string> = {};
        
        if (adminToken) {
          headers['Authorization'] = `Bearer ${adminToken}`;
        }
        if (driverToken) {
          headers['x-driver-token'] = driverToken;
        }
        
        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
