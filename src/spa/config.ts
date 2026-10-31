// Public client settings for FARO's Supabase project (safe to publish: access is guarded by row-level security).
export const SUPABASE_URL = "https://bybldbmwxucdvhfqspnf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_5He-O0ak3eJcniBfgBQnHA_yRKjyHi7";
export const APP_VERSION = "1.1.2";

const LOCAL_TEST = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
export const CLOUD_READY = !LOCAL_TEST && SUPABASE_URL.startsWith("https://") && !SUPABASE_KEY.startsWith("__");
