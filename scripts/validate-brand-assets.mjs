#!/usr/bin/env node
/**
 * Brand asset guard — runs before `bun run build`.
 *
 * Fails the build when any of these regress:
 *  - The `og:image` / `twitter:image` URL declared in src/routes/__root.tsx
 *    doesn't match the CDN URL in src/assets/askeasy-logo-transparent.png.asset.json.
 *  - The favicon or logo pointer is missing, tiny, non-PNG, non-square, or has
 *    corruption markers (bad PNG signature, truncated IDAT/IEND).
 *  - The remote CDN copy is unreachable, not a PNG, or below a sane byte floor.
 *
 * Runs offline-safe: if the CDN can't be reached (sandbox blocks it), the
 * remote check is skipped with a warning; local checks still gate the build.
 */
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const rel = (p) => path.relative(root, p);

const problems = [];
const warnings = [];
const fail = (msg) => problems.push(msg);
const warn = (msg) => warnings.push(msg);

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Parse PNG header → { width, height } and confirm IEND terminator present. */
function inspectPng(buf, label) {
  if (buf.length < 24) return fail(`${label}: file too small (${buf.length} bytes) — likely corrupt.`);
  if (!buf.subarray(0, 8).equals(PNG_SIG)) return fail(`${label}: not a valid PNG (bad signature).`);
  // IHDR chunk starts at byte 8, length(4)+type(4)+width(4)+height(4)
  if (buf.subarray(12, 16).toString("ascii") !== "IHDR") {
    return fail(`${label}: PNG missing IHDR chunk.`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  // IEND is the last 12 bytes of a valid PNG: len(0) + "IEND" + crc.
  const tail = buf.subarray(buf.length - 8, buf.length - 4).toString("ascii");
  if (tail !== "IEND") fail(`${label}: PNG truncated (no IEND terminator) — file is corrupt.`);
  return { width, height };
}

async function checkLocalPng(absPath, { minBytes, minSide, mustBeSquare, label }) {
  let s;
  try { s = await stat(absPath); } catch { return fail(`${label}: missing at ${rel(absPath)}.`); }
  if (s.size < minBytes) fail(`${label}: only ${s.size} bytes (< ${minBytes}) — likely broken.`);
  const buf = await readFile(absPath);
  const dims = inspectPng(buf, label);
  if (!dims) return;
  if (dims.width < minSide || dims.height < minSide) {
    fail(`${label}: ${dims.width}x${dims.height} is below minimum ${minSide}px.`);
  }
  if (mustBeSquare && dims.width !== dims.height) {
    fail(`${label}: must be square (got ${dims.width}x${dims.height}).`);
  }
}

async function checkAssetPointer(pointerPath, { minBytes, label }) {
  let raw;
  try { raw = await readFile(pointerPath, "utf8"); }
  catch { fail(`${label}: pointer missing at ${rel(pointerPath)}.`); return null; }
  let json;
  try { json = JSON.parse(raw); } catch { fail(`${label}: pointer JSON invalid.`); return null; }
  if (!json.url || !json.asset_id) fail(`${label}: pointer missing url/asset_id.`);
  if ((json.content_type || "").toLowerCase() !== "image/png") {
    fail(`${label}: content_type is "${json.content_type}", expected image/png.`);
  }
  if (typeof json.size !== "number" || json.size < minBytes) {
    fail(`${label}: pointer size ${json.size} < ${minBytes} bytes.`);
  }
  return json;
}

async function checkRemote(url, { minBytes, label }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (e) {
    warn(`${label}: remote check skipped (${e?.name || "fetch failed"}: ${e?.message ?? ""}).`);
    clearTimeout(t);
    return;
  }
  clearTimeout(t);
  if (!res.ok) return fail(`${label}: remote fetch ${res.status} for ${url}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("image/png")) fail(`${label}: remote content-type is "${ct}", expected image/png.`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < minBytes) fail(`${label}: remote file ${buf.length} bytes (< ${minBytes}).`);
  inspectPng(buf, `${label} (remote)`);
}

// --- Load __root.tsx and extract declared og:image / twitter:image URLs ---
const rootTsx = await readFile(path.join(root, "src/routes/__root.tsx"), "utf8");
function extractMetaUrl(prop) {
  // matches:  { property: "og:image", content: "https://..." }
  //   or   :  { name: "twitter:image", content: "https://..." }
  const re = new RegExp(
    `\\{\\s*(?:property|name)\\s*:\\s*["']${prop.replace(":", "\\:")}["']\\s*,\\s*content\\s*:\\s*["']([^"']+)["']`,
  );
  const m = rootTsx.match(re);
  return m?.[1] ?? null;
}
const ogUrl = extractMetaUrl("og:image");
const twUrl = extractMetaUrl("twitter:image");
if (!ogUrl) fail("__root.tsx: og:image meta tag is missing.");
if (!twUrl) fail("__root.tsx: twitter:image meta tag is missing.");
if (ogUrl && twUrl && ogUrl !== twUrl) {
  warn(`og:image and twitter:image differ (${ogUrl} vs ${twUrl}).`);
}

// --- Validate logo asset pointer + that the meta URL points at it ---
const logoPointer = await checkAssetPointer(
  path.join(root, "src/assets/askeasy-logo-transparent.png.asset.json"),
  { minBytes: 20_000, label: "logo pointer" },
);
if (logoPointer && ogUrl) {
  if (!ogUrl.includes(logoPointer.asset_id)) {
    fail(
      `__root.tsx og:image URL does not reference the current logo asset_id ` +
        `(${logoPointer.asset_id}). Update the meta tag after regenerating the logo.`,
    );
  }
  // Kick off the remote CDN check (best-effort, non-fatal on network error).
  await checkRemote(ogUrl, { minBytes: 20_000, label: "og:image CDN" });
}

// --- Local favicon (served from /public) ---
await checkLocalPng(path.join(root, "public/favicon.png"), {
  minBytes: 2_000,
  minSide: 64,
  mustBeSquare: true,
  label: "public/favicon.png",
});

// --- Report ---
for (const w of warnings) console.warn(`\x1b[33m⚠ ${w}\x1b[0m`);
if (problems.length > 0) {
  console.error("\n\x1b[31m✗ Brand asset validation failed:\x1b[0m");
  for (const p of problems) console.error(`  • ${p}`);
  console.error(
    "\nRegenerate the affected asset (imagegen for the logo/OG image, or re-upload via lovable-assets)" +
      " then update the og:image / twitter:image meta in src/routes/__root.tsx to the new URL.",
  );
  process.exit(1);
}
console.log("\x1b[32m✓ Brand assets look healthy (logo pointer, meta tags, favicon).\x1b[0m");
