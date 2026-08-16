// Multi-format document intelligence: PDF, DOCX, XLSX/CSV, plain text.
// Runs client-side so raw files never leave the device unless the user sends them.
import { extractPdfText, type PdfDoc } from "./pdf";

export type DocKind = "pdf" | "docx" | "sheet" | "text";

export type ParsedDoc = PdfDoc & { kind: DocKind };

const MAX_CHARS = 60_000;

function clamp(text: string): { text: string; chars: number } {
  const full = text.replace(/[ \t]+/g, " ").trim();
  return {
    chars: full.length,
    text: full.length > MAX_CHARS ? full.slice(0, MAX_CHARS) + "\n\n[...truncated]" : full,
  };
}

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedDoc(file: File): boolean {
  return ["pdf", "docx", "xlsx", "xls", "csv", "txt", "md", "json"].includes(extOf(file.name));
}

export async function extractDocument(file: File): Promise<ParsedDoc> {
  const ext = extOf(file.name);

  if (ext === "pdf") {
    const doc = await extractPdfText(file);
    return { ...doc, kind: "pdf" };
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const buf = await file.arrayBuffer();
    const { value } = await (mammoth as unknown as {
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    }).extractRawText({ arrayBuffer: buf });
    const { text, chars } = clamp(value);
    return { id: crypto.randomUUID(), name: file.name, pages: 1, text, chars, kind: "docx" };
  }

  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const parts = wb.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
      return `\n\n--- Sheet: ${name} ---\n${csv}`;
    });
    const { text, chars } = clamp(parts.join(""));
    return {
      id: crypto.randomUUID(),
      name: file.name,
      pages: wb.SheetNames.length,
      text,
      chars,
      kind: "sheet",
    };
  }

  const raw = await file.text();
  const { text, chars } = clamp(raw);
  return { id: crypto.randomUUID(), name: file.name, pages: 1, text, chars, kind: "text" };
}

/** Context block appended to the system prompt. Outcome-first, not summary-first. */
export function buildDocContext(docs: ParsedDoc[] | PdfDoc[]): string {
  if (docs.length === 0) return "";
  const bodies = (docs as ParsedDoc[])
    .map((d) => `### Source: ${d.name} (${d.pages} page/sheet${d.pages === 1 ? "" : "s"})\n${d.text}`)
    .join("\n\n");
  return (
    "The user attached the material below. Treat it as the primary source.\n" +
    "Run the full loop on it: understand what it is → extract what matters → simplify → " +
    "compare against normal/alternatives → verify anything unusual, inconsistent or likely wrong → " +
    "interpret what it means for THIS user → recommend the next step.\n" +
    "Where the material is structured (invoice, bill, quotation, statement, policy, spreadsheet), " +
    "extract the key fields into a compact table before interpreting.\n" +
    "Cite the page or sheet in parentheses for specific facts. If something isn't in the material, say so.\n\n" +
    bodies
  );
}
