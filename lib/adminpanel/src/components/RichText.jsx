import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';

// A text a storefront shows as HTML (the maintenance's), edited as text: Tiptap with the blocks the storefront styles
// (layout2 shared/rich-text.css, the keys text-* of the layout) - the same as the editor of the pages of base-pages: a
// heading of a part (h2), a subheading (h3), paragraphs, bold, italic, underline, lists, a divider, a note (blockquote),
// links, tables; no code.

const { Button } = window.UIComponents;
const Icons = window.LucideReact;

const CSS = `
.core-rich-text { border: 1px solid var(--border); border-radius: 8px; background: var(--background); }
.core-rich-text .ProseMirror { min-height: 160px; padding: 12px 14px; outline: none; line-height: 1.6; }
.core-rich-text .ProseMirror > * + * { margin-top: .75em; }
.core-rich-text h2 { font-size: 1.35em; font-weight: 600; }
.core-rich-text h3 { font-size: 1.15em; font-weight: 600; }
.core-rich-text ul { list-style: disc; padding-left: 1.5em; }
.core-rich-text ol { list-style: decimal; padding-left: 1.5em; }
.core-rich-text a { color: var(--primary); text-decoration: underline; }
.core-rich-text blockquote { border: 1px solid var(--border); border-radius: 8px; background: var(--muted); padding: 8px 12px; }
.core-rich-text .ProseMirror > hr { border: 0; border-top: 1px solid var(--border); margin: 1.25em 0; }
.core-rich-text hr.ProseMirror-selectednode { border-top-color: var(--ring); }
.core-rich-text table { border-collapse: collapse; width: 100%; }
.core-rich-text td, .core-rich-text th { border: 1px solid var(--border); padding: 4px 8px; vertical-align: top; }
.core-rich-text th { background: var(--muted); font-weight: 600; text-align: left; }
.core-rich-text .selectedCell { background: var(--accent); }
`;

const toolbar = { display: 'flex', flexWrap: 'wrap', gap: 2, padding: 4, borderBottom: '1px solid var(--border)' };

/**
 * The editor, mounted once: `initial` is read at the mount only (remount it by `key` for another text). `onReady` gets
 * the HTML of the editor right after the mount - the stored text as the editor writes it, so it is not a change;
 * `onChange` - on every edit, an empty text as ''. `ask` - useAsk's, for the address of a link.
 */
export function RichText({ initial, onChange, onReady, t, ask }) {
  const host = useRef(null);
  const [editor, setEditor] = useState(null);
  const [, redraw] = useState(0);
  const html = (current) => (current.isEmpty ? '' : current.getHTML());

  useEffect(() => {
    const instance = new Editor({
      element: host.current,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: { openOnClick: false, autolink: true } }),
        TableKit.configure({ table: { resizable: false } }),
      ],
      content: initial || '',
      onUpdate: ({ editor: current }) => onChange(html(current)),
      onTransaction: () => redraw((n) => n + 1),
    });
    setEditor(instance);
    onReady?.(html(instance));
    return () => instance.destroy();
  }, []);

  const run = (command) => () => command(editor.chain().focus()).run();
  const is = (name, attributes) => !!editor?.isActive(name, attributes);
  const tool = (name, icon, active, command, disabled) => {
    const Icon = Icons[icon];
    return (
      // deleting is red, as everywhere in the panel's pages
      <Button key={name} type="button" variant={icon === 'Trash2' ? 'destructive' : active ? 'secondary' : 'ghost'} size="icon" title={t(name)} aria-label={t(name)} disabled={!editor || disabled}
        onMouseDown={(event) => event.preventDefault()} onClick={run(command)}>
        <Icon size={16} />
      </Button>
    );
  };
  async function link() {
    const href = await ask({ title: t('Link'), value: editor.getAttributes('link').href || '', yes: t('Apply'), no: t('Cancel') });
    if (href === null) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    (href.trim() ? chain.setLink({ href: href.trim() }) : chain.unsetLink()).run();
  }

  return (
    <div className="core-rich-text">
      <style>{CSS}</style>
      <div style={toolbar}>
        {tool('Paragraph', 'Pilcrow', is('paragraph'), (c) => c.setParagraph())}
        {tool('Heading', 'Heading2', is('heading', { level: 2 }), (c) => c.toggleHeading({ level: 2 }))}
        {tool('Subheading', 'Heading3', is('heading', { level: 3 }), (c) => c.toggleHeading({ level: 3 }))}
        {tool('Bold', 'Bold', is('bold'), (c) => c.toggleBold())}
        {tool('Italic', 'Italic', is('italic'), (c) => c.toggleItalic())}
        {tool('Underline', 'Underline', is('underline'), (c) => c.toggleUnderline())}
        {tool('Bulleted list', 'List', is('bulletList'), (c) => c.toggleBulletList())}
        {tool('Numbered list', 'ListOrdered', is('orderedList'), (c) => c.toggleOrderedList())}
        {tool('Divider', 'SeparatorHorizontal', false, (c) => c.setHorizontalRule())}
        {tool('Note', 'TextQuote', is('blockquote'), (c) => c.toggleBlockquote())}
        <Button type="button" variant={is('link') ? 'secondary' : 'ghost'} size="icon" title={t('Link')} aria-label={t('Link')} disabled={!editor}
          onMouseDown={(event) => event.preventDefault()} onClick={link}>
          <Icons.Link size={16} />
        </Button>
        {tool('Remove the link', 'Unlink', false, (c) => c.extendMarkRange('link').unsetLink(), !is('link'))}
        {tool('Table', 'Table', is('table'), (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }), is('table'))}
        {is('table') && [
          tool('Row below', 'BetweenHorizontalEnd', false, (c) => c.addRowAfter()),
          tool('Delete the row', 'Rows2', false, (c) => c.deleteRow()),
          tool('Column to the right', 'BetweenVerticalEnd', false, (c) => c.addColumnAfter()),
          tool('Delete the column', 'Columns2', false, (c) => c.deleteColumn()),
          tool('Delete the table', 'Trash2', false, (c) => c.deleteTable()),
        ]}
        {tool('Undo', 'Undo2', false, (c) => c.undo(), !editor?.can().undo())}
        {tool('Redo', 'Redo2', false, (c) => c.redo(), !editor?.can().redo())}
      </div>
      <div ref={host} />
    </div>
  );
}
