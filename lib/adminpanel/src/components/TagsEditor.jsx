import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeTags, serializeTags, addTag, removeTagAt, canonicalTagName } from './tags/tagsModel';
import { apiGet } from './modifiers/api';

// Editor for Dish.tags (DishTag[] — free-form labels like "vegetarian", "spicy").
// A chips input: existing tags render as removable pills, new ones are typed in and
// committed with Enter / comma, with autocomplete of tag names already used across
// the catalog (…/core/tags, gated by the catalog-products token).
//
// Visual language mirrors WorktimeEditor / ModifiersEditor: shadcn design tokens
// (theme-aware) and the same atoms. onChange receives the serialized DishTag[];
// the tags-editor control wraps it as { json } for adminizer.

// ---- theme tokens (identical set to WorktimeEditor) -------------------------
const T = {
  panel: 'var(--background, #ffffff)',
  card: 'var(--card, #ffffff)',
  fg: 'var(--foreground, #0a0a0a)',
  muted: 'var(--muted-foreground, #6b7280)',
  border: 'var(--border, #e5e7eb)',
  input: 'var(--input, #e5e7eb)',
  primary: 'var(--primary, #2563eb)',
  primaryFg: 'var(--primary-foreground, #ffffff)',
  accent: 'var(--accent, #f1f5f9)',
  accentFg: 'var(--accent-foreground, #0a0a0a)',
  destructive: 'var(--destructive, #ef4444)',
  ring: 'var(--ring, #94a3b8)',
};
const RADIUS = 'var(--radius, 8px)';

// ---- icons ------------------------------------------------------------------
const Svg = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);
const IconX = () => (<Svg width="12" height="12"><path d="M18 6 6 18M6 6l12 12" /></Svg>);
const IconTag = () => (
  <Svg width="14" height="14">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </Svg>
);

function Chip({ name, onRemove, removeLabel, index }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      data-testid={`tag-chip-${index}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: T.accent, color: T.accentFg, border: `1px solid ${T.border}`,
        borderRadius: 999, padding: '3px 6px 3px 10px', fontSize: 12.5, fontWeight: 500,
        lineHeight: 1.4, maxWidth: '100%',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <button
        type="button"
        data-testid={`tag-remove-${index}`}
        aria-label={`${removeLabel}: ${name}`}
        title={removeLabel}
        onClick={onRemove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, padding: 0, border: 'none', borderRadius: 999,
          background: hover ? T.destructive : 'transparent',
          color: hover ? T.primaryFg : T.muted, cursor: 'pointer',
          transition: 'background .12s, color .12s', flex: 'none',
        }}
      >
        <IconX />
      </button>
    </span>
  );
}

function TagsEditor({ value, onChange, t }) {
  const tr = useMemo(() => (typeof t === 'function' ? t : (key) => key), [t]);
  const [tags, setTags] = useState(() => normalizeTags(value));
  const [input, setInput] = useState('');
  const [duplicateName, setDuplicateName] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const emit = useCallback(
    (next) => {
      setTags(next);
      if (typeof onChange === 'function') onChange(serializeTags(next));
    },
    [onChange],
  );

  const commit = useCallback(
    (rawName) => {
      const result = addTag(tags, rawName);
      if (result.duplicate) {
        setDuplicateName(String(rawName).trim());
        return;
      }
      setDuplicateName(null);
      if (result.added) {
        emit(result.tags);
        setInput('');
        setHighlight(-1);
      }
    },
    [tags, emit],
  );

  const removeAt = useCallback(
    (index) => {
      emit(removeTagAt(tags, index));
      setDuplicateName(null);
    },
    [tags, emit],
  );

  // Suggestions: tag names already used in the catalog, minus the ones present.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const query = input.trim();
        const payload = await apiGet(`/core/tags${query ? `?q=${encodeURIComponent(query)}` : ''}`);
        if (cancelled) return;
        const results = Array.isArray(payload?.results) ? payload.results : [];
        const present = new Set(tags.map((tag) => canonicalTagName(tag.name)));
        setSuggestions(results.filter((item) => item?.name && !present.has(canonicalTagName(item.name))));
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [open, input, tags]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (open && highlight >= 0 && highlight < suggestions.length) commit(suggestions[highlight].name);
      else commit(input);
      return;
    }
    if (e.key === 'Backspace' && input === '' && tags.length) {
      removeAt(tags.length - 1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => (suggestions.length ? (h + 1) % suggestions.length : -1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) setHighlight((h) => (suggestions.length ? (h - 1 + suggestions.length) % suggestions.length : -1));
      return;
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      setHighlight(-1);
    }
  };

  const showDropdown = open && (loading || suggestions.length > 0 || input.trim());

  return (
    <div data-testid="tags-editor" style={{ color: T.fg, fontFamily: 'inherit', maxWidth: 640 }}>
      <div ref={boxRef} style={{ position: 'relative' }}>
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
            background: T.panel, border: `1px solid ${duplicateName ? T.destructive : T.input}`,
            borderRadius: RADIUS, padding: '6px 9px', cursor: 'text', minHeight: 38,
            boxSizing: 'border-box', transition: 'border-color .12s',
          }}
        >
          <span style={{ color: T.muted, display: 'inline-flex', flex: 'none' }}><IconTag /></span>
          {tags.map((tag, index) => (
            <Chip
              key={`${canonicalTagName(tag.name)}-${index}`}
              index={index}
              name={tag.name}
              removeLabel={tr('Remove tag')}
              onRemove={() => removeAt(index)}
            />
          ))}
          <input
            ref={inputRef}
            data-testid="tags-input"
            value={input}
            placeholder={tags.length ? '' : tr('Add tag…')}
            aria-label={tr('Add tag…')}
            onChange={(e) => { setInput(e.target.value); setDuplicateName(null); setHighlight(-1); if (!open) setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            style={{
              flex: '1 1 90px', minWidth: 90, border: 'none', outline: 'none',
              background: 'transparent', color: T.fg, fontSize: 14, padding: '3px 0',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {showDropdown ? (
          <div
            data-testid="tags-suggestions"
            style={{
              position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', insetInlineStart: 0, insetInlineEnd: 0,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: RADIUS,
              boxShadow: '0 8px 24px rgba(0,0,0,.18)', maxHeight: 240, overflow: 'auto', padding: 6,
            }}
          >
            {loading && <div style={{ fontSize: 12, color: T.muted, padding: '6px 8px' }}>{tr('Loading…')}</div>}
            {!loading && suggestions.length === 0 && (
              <div style={{ fontSize: 12, color: T.muted, padding: '6px 8px' }}>{tr('No results')}</div>
            )}
            {!loading && suggestions.map((item, index) => (
              <button
                key={canonicalTagName(item.name)}
                type="button"
                data-testid={`tag-suggestion-${index}`}
                onClick={() => { commit(item.name); inputRef.current?.focus(); }}
                onMouseEnter={() => setHighlight(index)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'start', background: index === highlight ? T.accent : 'transparent',
                  color: T.fg, border: 'none', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', fontSize: 13,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                {Number(item.count) > 0 ? (
                  <span style={{ color: T.muted, fontSize: 11, flex: 'none' }}>×{item.count}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {duplicateName ? (
        <div data-testid="tags-dup-error" style={{ fontSize: 12, color: T.destructive, marginTop: 4 }}>
          {tr('This tag is already added')}
        </div>
      ) : (
        <div data-testid="tags-hint" style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
          {tags.length === 0 ? `${tr('No tags yet')} · ` : ''}{tr('Press Enter or comma to add')}
        </div>
      )}
    </div>
  );
}

export default TagsEditor;
