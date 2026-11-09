/**
 * Faro for Android (1.3.172): files shared to Faro that are not pictures — a contact (.vcf, to
 * bring birthdays) or a bank statement — wait in the shell's doc tray. Once Faro is open and a
 * book is on screen this takes them and routes each by kind (lib/faro/shareddocs.ts: a vCard is
 * a contact wherever it arrives; anything else is a statement) into the EXISTING doors: the
 * people importer (the same parseVCards + merge the .vcf file input uses, toast included) and
 * the bank import sheet (the same openImport a picked file takes). A share that arrives before
 * sign-in waits in the tray until a book is ready, like the PWA's cached shares do.
 * Loaded lazily and only inside the Android app (shell.tsx), so the browser and the PWA never
 * download it.
 */
import { useEffect } from "react";
import { nativePullDocs } from "@/spa/native";
import { parseVCards } from "@/lib/faro/vcard";
import { sharedDocKind } from "@/lib/faro/shareddocs";
import { useFaro } from "./provider";
import { useImport } from "./people";
import { openImport } from "./bank-dock";

export default function DocInbox() {
  const { session } = useFaro();
  const add = useImport();
  const ready = !!session;
  useEffect(() => {
    if (!ready) return;
    const take = async () => {
      const files = nativePullDocs();
      if (!files.length) return;
      let contactText = "";
      const statements: File[] = [];
      for (const f of files) {
        // The text is read for the vCard sniff and, for a contact, as the import itself;
        // a statement keeps its original File untouched (a PDF's bytes never pass through it).
        let text = "";
        try { text = await f.text(); } catch { /* an unreadable file still reaches the importer, which answers for it */ }
        if (sharedDocKind(f.name, f.type, text) === "contact") contactText += `${text}\n`;
        else statements.push(f);
      }
      if (contactText) add(parseVCards(contactText));
      if (statements.length) openImport(statements);
    };
    void take();
    const on = () => void take();
    window.addEventListener("faronative-docs", on);
    return () => window.removeEventListener("faronative-docs", on);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
