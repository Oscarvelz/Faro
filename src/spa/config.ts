// Public client settings for FARO's Supabase project (safe to publish: access is guarded by row-level security).
export const SUPABASE_URL = "__SUPABASE_URL__";
export const SUPABASE_KEY = "__SUPABASE_KEY__";
export const APP_VERSION = "1.0.0";

export const CLOUD_READY = SUPABASE_URL.startsWith("https://") && !SUPABASE_KEY.startsWith("__");
