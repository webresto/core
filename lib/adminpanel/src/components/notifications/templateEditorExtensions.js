// CodeMirror 6 extensions powering the notification template editor.
//
// Three behaviours, all driven by the event's context paths (see get-notification-events:
// `contextPaths` = flattened schema + recipient.*):
//   1. highlight — `{{ path }}` placeholders are decorated (valid = accent, unknown = warning).
//   2. autocomplete — typing inside `{{ … }}` suggests dotted paths with type + description.
//   3. lint — unknown `{{ path }}` is underlined with a "not in this event's context" message.
//
// `contextPaths` is an array of { path, type, description, example }. When it's empty
// (event has no schema), highlight still works but nothing is flagged as unknown — matching
// the soft, non-blocking server behaviour.

import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { autocompletion } from '@codemirror/autocomplete';
import { linter } from '@codemirror/lint';
import { RangeSetBuilder } from '@codemirror/state';

const PLACEHOLDER_RE = /\{\{\s*([\w.$]+)\s*\}\}/g;

// ── path matching ────────────────────────────────────────────────────────────
// A typed path is valid if it equals a known path, is recipient.*, or is an array
// element path (known-array prefix + numeric index + valid remainder).

function buildPathIndex(contextPaths) {
  const valid = new Set();
  const arrays = new Set();
  for (const p of contextPaths || []) {
    if (!p || !p.path) continue;
    valid.add(p.path);
    if (p.type === 'array') arrays.add(p.path);
  }
  return { valid, arrays };
}

function isKnownPath(path, index) {
  if (!path) return false;
  if (path === 'recipient' || path.startsWith('recipient.')) return true;
  if (index.valid.has(path)) return true;
  const segments = path.split('.');
  for (let i = segments.length - 1; i >= 1; i--) {
    const prefix = segments.slice(0, i).join('.');
    const next = segments[i];
    if (index.arrays.has(prefix) && /^\d+$/.test(next)) {
      const rest = [prefix, ...segments.slice(i + 1)].join('.');
      if (rest === prefix || index.valid.has(rest)) return true;
    }
  }
  return false;
}

// ── 1. highlight ──────────────────────────────────────────────────────────────

const validMark = Decoration.mark({ class: 'cm-tpl-var' });
const unknownMark = Decoration.mark({ class: 'cm-tpl-var-unknown' });

function highlightPlugin(index) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.build(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
      }
      build(view) {
        const builder = new RangeSetBuilder();
        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to);
          PLACEHOLDER_RE.lastIndex = 0;
          let m;
          while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
            const start = from + m.index;
            const end = start + m[0].length;
            builder.add(start, end, isKnownPath(m[1], index) ? validMark : unknownMark);
          }
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}

// ── 2. autocomplete ─────────────────────────────────────────────────────────────

function templateCompletions(contextPaths) {
  const options = (contextPaths || [])
    .filter((p) => p && p.path)
    .map((p) => ({
      label: p.path,
      type: p.type === 'object' ? 'namespace' : 'variable',
      detail: [p.type, p.example !== undefined ? `e.g. ${p.example}` : null].filter(Boolean).join(' · '),
      info: p.description || undefined,
    }));

  return (context) => {
    // Only complete inside an open `{{ … }}` — find the nearest unbalanced "{{" before the cursor.
    const before = context.state.doc.sliceString(Math.max(0, context.pos - 200), context.pos);
    const open = before.lastIndexOf('{{');
    if (open === -1) return null;
    const afterOpen = before.slice(open);
    if (afterOpen.includes('}}')) return null; // the braces are already closed

    // The word being typed: dotted path chars after the last `{{` (and optional spaces).
    const word = context.matchBefore(/[\w.$]*/);
    if (!word && !context.explicit) return null;
    const from = word ? word.from : context.pos;
    return { from, options, validFor: /^[\w.$]*$/ };
  };
}

// ── 3. lint ──────────────────────────────────────────────────────────────────

function templateLinter(index) {
  return linter((view) => {
    const diagnostics = [];
    if (index.valid.size === 0) return diagnostics; // no schema → don't flag anything
    const text = view.state.doc.toString();
    PLACEHOLDER_RE.lastIndex = 0;
    let m;
    while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
      if (!isKnownPath(m[1], index)) {
        diagnostics.push({
          from: m.index,
          to: m.index + m[0].length,
          severity: 'warning',
          message: `"${m[1]}" is not in this event's context`,
        });
      }
    }
    return diagnostics;
  });
}

// ── theme ─────────────────────────────────────────────────────────────────────

const templateTheme = EditorView.theme({
  '&': { fontSize: '13px' },
  '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '8px 0' },
  '.cm-tpl-var': { color: 'var(--primary, #2563eb)', fontWeight: 600 },
  '.cm-tpl-var-unknown': { color: 'var(--destructive, #dc2626)', textDecoration: 'underline wavy', textUnderlineOffset: '2px' },
  '.cm-line': { padding: '0 8px' },
});

/** Build the extension list for a template field given its context paths and mode. */
export function templateExtensions(contextPaths, { singleLine } = {}) {
  const index = buildPathIndex(contextPaths);
  const exts = [
    highlightPlugin(index),
    autocompletion({ override: [templateCompletions(contextPaths)], activateOnTyping: true }),
    templateLinter(index),
    templateTheme,
  ];
  if (singleLine) {
    // Block Enter so single-line fields (title/subject/clickUrl) stay one line.
    exts.push(
      EditorView.domEventHandlers({
        keydown: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); return true; }
          return false;
        },
      }),
    );
  }
  return exts;
}
