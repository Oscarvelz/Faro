// Browser replacement for the Grok server functions: talks to Supabase directly.
import { CLOUD_READY, supabase } from "./cloud";
export { CLOUD_READY };
import { BCN_AS_OF, BCN_RATE_E4 } from "@/lib/faro/money";

export type RemoteRow = { dataJson: string; revision: number; updatedAt: string; deviceId: string };
type PushInput = { dataJson: string; revision: number; updatedAt: string; deviceId: string };

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("signed-out");
  return data.session;
}

export async function pullLedger(): Promise<RemoteRow | null> {
  await requireSession();
  const { data, error } = await supabase.from("faro_ledgers").select("data_json, revision, updated_at, device_id").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { dataJson: String(data.data_json), revision: Number(data.revision), updatedAt: String(data.updated_at), deviceId: String(data.device_id ?? "") };
}

export async function pushLedger({ data: input }: { data: PushInput }): Promise<{ stale: boolean; row: RemoteRow | null }> {
  await requireSession();
  const { data, error } = await supabase.rpc("faro_push", {
    p_data: input.dataJson,
    p_revision: Math.floor(input.revision),
    p_updated: new Date(input.updatedAt).toISOString(),
    p_device: input.deviceId.slice(0, 80),
  });
  if (error) throw error;
  const r = (Array.isArray(data) ? data[0] : data) as { data_json: string; revision: number; updated_at: string; device_id: string; won: boolean } | undefined;
  if (!r) return { stale: false, row: null };
  return {
    stale: !r.won,
    row: { dataJson: String(r.data_json), revision: Number(r.revision), updatedAt: String(r.updated_at), deviceId: String(r.device_id ?? "") },
  };
}

export async function fetchOfficialRate(): Promise<{ rateE4: number; asOf: string; source: string }> {
  const fallback = { rateE4: BCN_RATE_E4, asOf: BCN_AS_OF, source: "BCN" };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const body = (await res.json()) as { rates?: { NIO?: number } };
    const nio = body.rates?.NIO;
    if (!nio || !Number.isFinite(nio)) return fallback;
    const rateE4 = Math.round(nio * 10000);
    if (rateE4 < 200_000 || rateE4 > 800_000) return fallback;
    return { rateE4, asOf: new Date().toISOString().slice(0, 10), source: "mercado" };
  } catch {
    return fallback;
  }
}
