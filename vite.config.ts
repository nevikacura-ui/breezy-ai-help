// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import {
  EXTERNAL_SUPABASE_PROJECT_ID,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  EXTERNAL_SUPABASE_URL,
} from "./src/lib/external-supabase-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(EXTERNAL_SUPABASE_PROJECT_ID),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(EXTERNAL_SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(EXTERNAL_SUPABASE_URL),
      "process.env.SUPABASE_PROJECT_ID": JSON.stringify(EXTERNAL_SUPABASE_PROJECT_ID),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(EXTERNAL_SUPABASE_PUBLISHABLE_KEY),
      "process.env.SUPABASE_URL": JSON.stringify(EXTERNAL_SUPABASE_URL),
    },
    resolve: {
      alias: [
        {
          find: "@/integrations/supabase/client.server",
          replacement: fileURLToPath(new URL("./src/lib/external-supabase-admin.server.ts", import.meta.url)),
        },
      ],
    },
  },
});
