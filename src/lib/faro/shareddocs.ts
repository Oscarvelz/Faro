/**
 * 1.3.172: how a file shared into Faro (the Android shell's doc tray) is routed.
 * The rule mirrors the service worker's share sorting (public/sw.js): a vCard is a
 * contact wherever it arrives — its content wins over any declared type — and
 * anything else is a bank statement for the import sheet. The declared type and
 * the file name only speak for a vCard whose content did not announce itself
 * (an empty or truncated card still belongs to Personas, whose importer answers
 * honestly that the file holds no contacts, not to the statement mapper).
 */
export const VCARD_MIMES: readonly string[] = ["text/vcard", "text/x-vcard"];

export function sharedDocKind(name: string, type: string, textHead: string): "contact" | "statement" {
  if (/BEGIN:VCARD/i.test(textHead)) return "contact";
  if (VCARD_MIMES.includes((type || "").trim().toLowerCase())) return "contact";
  if (/\.vcf$/i.test((name || "").trim())) return "contact";
  return "statement";
}
