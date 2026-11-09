import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { BCN_AS_OF, BCN_RATE_E4 } from "./money";
import { pushWins } from "./syncdecide";

export type RemoteRow = {
  dataJson: string;
  revision: number;
  updatedAt: string;
  deviceId: string;
};

type PushInput = { dataJson: string; revision: number; updatedAt: string; deviceId: string };

function asPush(input: unknown): PushInput {
  if (!input || typeof input !== "object") throw new Error("Invalid");
  const o = input as Partial<PushInput>;
  if (typeof o.dataJson !== "string" || o.dataJson.length < 2 || o.dataJson.length > 1_500_000) {
    throw new Error("Invalid payload");
  }
  JSON.parse(o.dataJson);
  if (typeof o.revision !== "number" || !Number.isFinite(o.revision)) throw new Error("Invalid revision");
  if (typeof o.updatedAt !== "string" || Number.isNaN(Date.parse(o.updatedAt))) throw new Error("Invalid time");
  if (typeof o.deviceId !== "string") throw new Error("Invalid device");
  return {
    dataJson: o.dataJson,
    revision: Math.floor(o.revision),
    updatedAt: new Date(o.updatedAt).toISOString(),
    deviceId: o.deviceId.slice(0, 80),
  };
}

export const pullLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RemoteRow | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ data_json: string; revision: number; updated_at: string; device_id: string }>`
      select data_json, revision, updated_at::text as updated_at, device_id
      from faro_ledgers
      where user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      dataJson: typeof row.data_json === "string" ? row.data_json : JSON.stringify(row.data_json),
      revision: Number(row.revision),
      updatedAt: String(row.updated_at),
      deviceId: row.device_id,
    };
  });

export const pushLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asPush(input))
  .handler(async ({ context, data }): Promise<{ stale: boolean; row: RemoteRow | null }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const current = await sql<{ revision: number; data_json: string }>`
      select revision, data_json
      from faro_ledgers
      where user_id = ${context.userId}
    `;
    const prev = current[0];
    // 1.3.166 (syncdecide/pushWins): el arbitraje es SIN reloj de pared — gana solo una
    // revisión mayor; a igual revisión solo pasa el re-empuje idéntico. Antes, a igual
    // revisión decidía updatedAt y un reloj adelantado reemplazaba el libro en silencio (C7/W5).
    const wins = pushWins(
      prev ? { revision: Number(prev.revision), dataJson: typeof prev.data_json === "string" ? prev.data_json : JSON.stringify(prev.data_json) } : null,
      { revision: data.revision, dataJson: data.dataJson },
    );
    if (wins) {
      await sql`
        insert into faro_ledgers (user_id, data_json, revision, updated_at, device_id)
        values (${context.userId}, ${data.dataJson}, ${data.revision}, ${data.updatedAt}::timestamptz, ${data.deviceId})
        on conflict (user_id) do update set
          data_json = excluded.data_json,
          revision = excluded.revision,
          updated_at = excluded.updated_at,
          device_id = excluded.device_id
        where faro_ledgers.revision < excluded.revision
      `;
    }
    const rows = await sql<{ data_json: string; revision: number; updated_at: string; device_id: string }>`
      select data_json, revision, updated_at::text as updated_at, device_id
      from faro_ledgers
      where user_id = ${context.userId}
    `;
    const row = rows[0];
    const remote: RemoteRow | null = row
      ? {
          dataJson: typeof row.data_json === "string" ? row.data_json : JSON.stringify(row.data_json),
          revision: Number(row.revision),
          updatedAt: String(row.updated_at),
          deviceId: row.device_id,
        }
      : null;
    return { stale: Boolean(prev) && !wins, row: remote };
  });

export const fetchOfficialRate = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<{ rateE4: number; asOf: string; source: string }> => {
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
  });
