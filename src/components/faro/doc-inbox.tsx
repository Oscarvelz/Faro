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
 *
 * 1.3.362 (mapa §18): the shell also files streamless TEXT shares here (a store link, a
 * digital receipt's text — MainActivity writes them as compartido.txt). Those are not
 * statements: they open their own doors (components/faro/link-inbox.tsx): the product
 * sheet for a link, the no-OCR receipt door for plain text.
 */
import { useEffect, useState } from "react";
import { nativePeekDocKinds, nativePullDocs } from "@/spa/native";
import { parseVCards } from "@/lib/faro/vcard";
import { sharedDocKind } from "@/lib/faro/shareddocs";
import { useFaro } from "./provider";
import { useImport } from "./people";
import { openImport } from "./bank-dock";
import { TextReceiptPop, isDoorText } from "./link-inbox";
import { ProductSheet } from "./share-product";
import { productFromShare, type SharedProduct } from "@/lib/faro/sharelink";

export default function DocInbox() {
  const { session, has, mode } = useFaro();
  const add = useImport();
  const ready = !!session;
  const [doorProduct, setDoorProduct] = useState<SharedProduct | null>(null);
  const [doorText, setDoorText] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const take = async () => {
      // PREJUDICE PJ-13: the inbox routes by MODE as well as by kind. The registry
      // rows (inbox.vcf = Ritmo, inbox.bank = Completo) existed but this surface
      // never asked them — a statement shared in Esencial opened the full import
      // door. nativePullDocs CONSUMES the tray, so the gate peeks first: if any
      // waiting kind is beyond this mode, nothing is taken — the tray keeps the
      // files, lossless, and the effect re-runs when the mode changes.
      const kinds = nativePeekDocKinds();
      if (kinds.includes("statement") && !has("inbox.bank")) return;
      if (kinds.includes("contact") && !has("inbox.vcf")) return;
      if (kinds.includes("shared-text") && !has("inbox.link") && !has("inbox.image-receipt")) return;
      const files = nativePullDocs();
      if (!files.length) return;
      let contactText = "";
      const statements: File[] = [];
      let door: string | null = null;
      for (const f of files) {
        // The text is read for the vCard sniff and, for a contact, as the import itself;
        // a statement keeps its original File untouched (a PDF's bytes never pass through it).
        let text = "";
        try { text = await f.text(); } catch { /* an unreadable file still reaches the importer, which answers for it */ }
        if (sharedDocKind(f.name, f.type, text) === "contact") contactText += `${text}\n`;
        else if (isDoorText(f.name, f.type, text)) { if (door == null) door = text; }
        else statements.push(f);
      }
      if (contactText) add(parseVCards(contactText));
      if (statements.length) openImport(statements);
      if (door != null) {
        const prod = productFromShare("", door);
        if (prod) setDoorProduct(prod);
        else setDoorText(door);
      }
    };
    void take();
    const on = () => void take();
    window.addEventListener("faronative-docs", on);
    return () => window.removeEventListener("faronative-docs", on);
  }, [ready, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  if (doorProduct) return <ProductSheet product={doorProduct} onClose={() => setDoorProduct(null)} />;
  if (doorText != null) return <TextReceiptPop text={doorText} onClose={() => setDoorText(null)} />;
  return null;
}
