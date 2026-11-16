import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { EXPORT_KINDS, canShareFiles, exportPdf, exportWorkbook, pdfFile, pickForMode, shareFile, workbookFile, type ExportPick, type ExportScope } from "@/lib/faro/export-docs";
import type { LineKind } from "@/lib/faro/types";
import { useFaro } from "./provider";

const EMPTY: ExportPick = {
  scope: "month",
  activeOnly: true,
  kinds: [...EXPORT_KINDS],
  savings: true,
  debt: true,
  summary: true,
  charts: true,
  advice: true,
  remit: true,
};

export function ExportPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lang, session, key, names, has, mode } = useFaro();
  const [pick, setPick] = useState<ExportPick>(EMPTY);
  // Fo-5 (tres modos, etapa 3.3): el panel se compone con las banderas del
  // modo — en Ritmo ofrece alcance, tipos, activos, resumen y ahorros; las
  // banderas de Deudas, Gráficos, Asesor y Remesas solo existen con el panel
  // entero (export.full-sheets, Completo). Lo que corre es la elección ya
  // intersectada (pickForMode; el documento la vuelve a intersectar en su
  // entrada, así que ninguna bandera dormida puede colarse).
  const full = has("export.full-sheets");
  const canSave = has("vault.meta");
  const effPick = pickForMode(pick, mode);
  useEffect(() => {
    if (!open) return;
    const onBack = (e: Event) => {
      if (e.defaultPrevented) return;
      onOpenChange(false);
      e.preventDefault();
    };
    const close = (e: PointerEvent) => {
      const node = e.target as Node | null;
      if (node && document.getElementById("faro-export")?.contains(node)) return;
      onOpenChange(false);
    };
    window.addEventListener("faro-back", onBack);
    document.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("faro-back", onBack);
      document.removeEventListener("pointerdown", close);
    };
  }, [open, onOpenChange]);
  if (!session) return null;
  function toggleKind(kind: LineKind) {
    setPick((cur) => ({ ...cur, kinds: cur.kinds.includes(kind) ? cur.kinds.filter((item) => item !== kind) : [...cur.kinds, kind] }));
  }
  function run(format: "xlsx" | "pdf") {
    if (!session) return;
    if (format === "xlsx") exportWorkbook(session.ledger, key, lang, names, effPick);
    else exportPdf(session.ledger, key, lang, names, effPick);
    onOpenChange(false);
  }
  const scope = (id: ExportScope, label: string) => (
    <button type="button" aria-pressed={pick.scope === id} onClick={() => setPick((cur) => ({ ...cur, scope: id }))}>{label}</button>
  );
  const flag = (id: "activeOnly" | "savings" | "debt" | "summary" | "charts" | "advice" | "remit", label: string) => (
    <button type="button" aria-pressed={pick[id]} onClick={() => setPick((cur) => ({ ...cur, [id]: !cur[id] }))}>{label}</button>
  );
  return (
    <div className="export-anchor" id="faro-export" data-anchor="top-export">
      <button type="button" className="icon-btn theme-toggle cal-launch" aria-expanded={open} aria-haspopup="dialog" aria-label={t("export.open")} onClick={() => onOpenChange(!open)}>
        <Download className="size-4" />
      </button>
      {open ? (
        <div className="export-sheet" role="dialog" aria-label={t("export.open")}>
          <p className="export-kicker">{t("export.scope")}</p>
          <div className="export-picks">
            {scope("month", t("export.month"))}
            {scope("year", t("export.year"))}
            {scope("all", t("export.all"))}
          </div>
          <p className="export-kicker">{t("nav.income")}</p>
          <div className="export-picks">
            <button type="button" aria-pressed={pick.kinds.includes("income-fixed")} onClick={() => toggleKind("income-fixed")}>{t("income.fixed")}</button>
            <button type="button" aria-pressed={pick.kinds.includes("income-variable")} onClick={() => toggleKind("income-variable")}>{t("income.variable")}</button>
          </div>
          <p className="export-kicker">{t("settings.exportOut")}</p>
          <div className="export-picks">
            <button type="button" aria-pressed={pick.kinds.includes("expense-fixed")} onClick={() => toggleKind("expense-fixed")}>{t("nav.fixed")}</button>
            <button type="button" aria-pressed={pick.kinds.includes("expense-variable")} onClick={() => toggleKind("expense-variable")}>{t("nav.variable")}</button>
            <button type="button" aria-pressed={pick.kinds.includes("purchase")} onClick={() => toggleKind("purchase")}>{t("nav.shops")}</button>
            <button type="button" aria-pressed={pick.kinds.includes("subscription")} onClick={() => toggleKind("subscription")}>{t("tab.subs")}</button>
            {canSave ? flag("savings", t("desk.savings")) : null}
            {full ? flag("debt", t("desk.debt")) : null}
          </div>
          <p className="export-kicker">{t("export.extra")}</p>
          <div className="export-picks">
            {flag("activeOnly", t("export.active"))}
            {flag("summary", t("export.summary"))}
            {full ? flag("charts", t("export.charts")) : null}
            {full ? flag("advice", t("export.advice")) : null}
            {full ? flag("remit", t("export.remit")) : null}
          </div>
          <div className="export-actions">
            <button type="button" className="btn" onClick={() => run("xlsx")}>{t("export.excel")}</button>
            <button type="button" className="btn ghost" onClick={() => run("pdf")}>{t("export.pdf")}</button>
          </div>
          <p className="export-note">{t("export.pdfNote")}</p>
          {canShareFiles() ? (
            <div className="export-share">
              <button type="button" className="btn ghost" onClick={() => { void shareFile(workbookFile(session.ledger, key, lang, names, effPick)); onOpenChange(false); }}><Share2 className="size-4" aria-hidden />{t("export.share")} Excel</button>
              <button type="button" className="btn ghost" onClick={() => { void shareFile(pdfFile(session.ledger, key, lang, names, effPick)); onOpenChange(false); }}><Share2 className="size-4" aria-hidden />{t("export.share")} PDF</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
