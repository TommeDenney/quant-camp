// Short definitions for glossary tooltips ([[term]] in lesson text). The full
// glossary (with sources) lives in content/glossary.ts; this is filled from it.
export const GLOSSARY_INDEX: Record<string, string> = {};
export function registerGlossary(entries: { term: string; short: string; aliases?: string[] }[]) {
  for (const e of entries) {
    GLOSSARY_INDEX[e.term.toLowerCase()] = e.short;
    for (const a of e.aliases || []) GLOSSARY_INDEX[a.toLowerCase()] = e.short;
  }
}
