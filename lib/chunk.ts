// Simple text chunker by approximate character length with overlap
export function chunkText(
  text: string,
  opts?: { chunkSize?: number; overlap?: number }
) {
  const chunkSize = opts?.chunkSize ?? 1200; // ~800-1000 tokens depending on language
  const overlap = opts?.overlap ?? 200;
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: { content: string; index: number }[] = [];
  if (!clean) return chunks;

  let start = 0;
  let index = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const slice = clean.slice(start, end);
    chunks.push({ content: slice, index });
    index += 1;
    if (end === clean.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

