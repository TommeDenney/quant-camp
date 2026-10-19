// A small Markdown renderer with KaTeX math ($inline$ and $$display$$) and glossary
// tooltips ([[term]]). Content is our own static text, so the HTML is trusted.
import katex from 'katex';
import { useMemo } from 'react';
import { GLOSSARY_INDEX } from '../content/glossaryIndex';

const tex = (s: string, display: boolean) => {
  try { return katex.renderToString(s, { displayMode: display, throwOnError: false, strict: 'ignore' }); } catch { return s; }
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string) {
  // Protect math first, then format the rest.
  const math: string[] = [];
  let t = s.replace(/\$\$([^$]+)\$\$/g, (_, m) => { math.push(tex(m, true)); return `\u0000${math.length - 1}\u0000`; })
    .replace(/\$([^$\n]+)\$/g, (_, m) => { math.push(tex(m, false)); return `\u0000${math.length - 1}\u0000`; });
  t = esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, term, label) => {
      const g = GLOSSARY_INDEX[term.toLowerCase()];
      return g ? `<span class="gloss" tabindex="0" data-tip="${esc(g)}">${label || term}</span>` : label || term;
    });
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => math[+i]);
}

export function mdToHtml(md: string) {
  const out: string[] = [];
  const lines = md.trim().split('\n');
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\$\$.*\$\$$/.test(l.trim())) { flush(); close(); out.push(`<div class="math-block">${tex(l.trim().slice(2, -2), true)}</div>`); continue; }
    const ul = /^\s*[-•]\s+(.*)/.exec(l);
    const ol = /^\s*\d+[.)]\s+(.*)/.exec(l);
    if (ul || ol) {
      flush();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) { close(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((ul || ol)![1])}</li>`);
      continue;
    }
    if (!l.trim()) { flush(); close(); continue; }
    const hd = /^(#{2,4})\s+(.*)/.exec(l);
    if (hd) { flush(); close(); out.push(`<h${hd[1].length}>${inline(hd[2])}</h${hd[1].length}>`); continue; }
    close();
    para.push(l.trim());
  }
  flush(); close();
  return out.join('');
}

export function Md({ children, className = '' }: { children: string; className?: string }) {
  const html = useMemo(() => mdToHtml(children), [children]);
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
export function MathBlock({ tex: t, caption }: { tex: string; caption?: string }) {
  return (
    <figure className="math-figure">
      <div dangerouslySetInnerHTML={{ __html: tex(t, true) }} />
      {caption && <figcaption className="text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
/** Markdown inside a button or label: a span, with paragraphs flattened. */
export function MdInline({ children }: { children: string }) {
  const html = useMemo(() => mdToHtml(children).replace(/<\/p><p>/g, '<br>').replace(/<\/?p>/g, ''), [children]);
  return <span className="md md-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}
