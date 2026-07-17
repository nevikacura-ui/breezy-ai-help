// Client-side PDF text extraction via pdfjs-dist.
// Uses the legacy build so it runs in the browser without a worker file on disk.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// Vite ?url import → served asset URL for the worker.
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDoc = {
  id: string;
  name: string;
  pages: number;
  text: string;      // extracted plain text (may be truncated)
  chars: number;     // original length before truncation
};

const MAX_CHARS = 60_000;

export async function extractPdfText(file: File): Promise<PdfDoc> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strs = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .filter(Boolean);
    parts.push(`\n\n--- Page ${i} ---\n` + strs.join(" "));
  }
  const full = parts.join("").replace(/[ \t]+/g, " ").trim();
  const truncated = full.length > MAX_CHARS ? full.slice(0, MAX_CHARS) + "\n\n[...truncated]" : full;
  return {
    id: crypto.randomUUID(),
    name: file.name,
    pages: pdf.numPages,
    text: truncated,
    chars: full.length,
  };
}

export function buildDocContext(docs: PdfDoc[]): string {
  if (docs.length === 0) return "";
  const bodies = docs
    .map((d) => `### Document: ${d.name} (${d.pages} pages)\n${d.text}`)
    .join("\n\n");
  return (
    "The user has attached the following document(s). Use them as the primary source when answering. " +
    "Quote briefly and cite the page number in parentheses when you use a specific fact. " +
    "If the answer isn't in the document, say so clearly.\n\n" +
    bodies
  );
}
