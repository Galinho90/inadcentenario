import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // O preview sobe em origens temporárias (http://127.0.0.1:<porta>) que o
  // projeto Supabase não autoriza via CORS. Em desenvolvimento as chamadas
  // passam pelo proxy do Vite (mesma origem), o que elimina o bloqueio de CORS
  // sem depender de configuração no painel do Supabase.
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const useSupabaseProxy = command === "serve" && mode === "development" && Boolean(supabaseUrl);

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: useSupabaseProxy
        ? {
            "/supabase": {
              target: supabaseUrl,
              changeOrigin: true,
              secure: true,
              rewrite: (requestPath: string) => requestPath.replace(/^\/supabase/, ""),
              configure: (proxy) => {
                // Sem o header Origin a API do Supabase não aplica restrição de CORS.
                proxy.on("proxyReq", (proxyReq) => {
                  proxyReq.removeHeader("origin");
                });
              },
            },
          }
        : undefined,
    },
    define: {
      __USE_SUPABASE_PROXY__: JSON.stringify(useSupabaseProxy),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    build: {
      target: "es2020",
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
    },
  };
});
