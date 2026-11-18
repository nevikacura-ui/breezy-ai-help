import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { EXTERNAL_SUPABASE_URL } from "./external-supabase-config";

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createExternalSupabaseAdminClient() {
  const supabaseKey = process.env.EXTERNAL_SUPABASE_SECRET_KEY;
  if (!supabaseKey) {
    throw new Error("Missing EXTERNAL_SUPABASE_SECRET_KEY for the external database connection.");
  }

  return createClient<Database>(EXTERNAL_SUPABASE_URL, supabaseKey, {
    global: { fetch: createSupabaseFetch(supabaseKey) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let client: ReturnType<typeof createExternalSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createExternalSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!client) client = createExternalSupabaseAdminClient();
    return Reflect.get(client, prop, receiver);
  },
});
