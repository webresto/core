import React from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { templateExtensions } from './templateEditorExtensions';

/**
 * CodeMirror-backed template field. Edits one template string (title/subject/body/clickUrl)
 * with `{{path}}` highlighting, autocomplete, and unknown-variable linting driven by the
 * event's `contextPaths`.
 *
 * Mirrors the controlled-input contract of the old <Input>/<Textarea>: `value` in,
 * `onChange(next)` out. The editor is created once; value/extensions are pushed in
 * imperatively so React re-renders don't recreate the instance (see SendTestPanel's
 * JsonEditor for the same pattern).
 */
export default function TemplateEditor({ value, onChange, contextPaths, singleLine, placeholder }) {
  const hostRef = React.useRef(null);
  const viewRef = React.useRef(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const langCompartment = React.useRef(new Compartment());
  // Mirror the shadcn <Input> focus affordance (the "Basic" tab uses real Inputs):
  // border switches to --ring and gains a 2px ring on focus-within.
  const [focused, setFocused] = React.useState(false);

  // Create the editor once.
  React.useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const startDoc = typeof value === 'string' ? value : '';
    const state = EditorState.create({
      doc: startDoc,
      extensions: [
        history(),
        closeBrackets(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        placeholder ? cmPlaceholder(placeholder) : [],
        langCompartment.current.of(templateExtensions(contextPaths, { singleLine })),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push external value changes in without resetting cursor/selection unnecessarily.
  React.useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const next = typeof value === 'string' ? value : '';
    const current = view.state.doc.toString();
    if (next !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
    }
  }, [value]);

  // Reconfigure highlight/autocomplete/lint when the event's context paths change.
  React.useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartment.current.reconfigure(templateExtensions(contextPaths, { singleLine })),
    });
  }, [contextPaths, singleLine]);

  return (
    <div
      ref={hostRef}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        // border-input at rest, border-ring on focus — matches the shadcn <Input>.
        border: `1px solid ${focused ? 'var(--ring)' : 'var(--input)'}`,
        borderRadius: 'var(--radius, 10px)',
        background: 'var(--background)',
        minHeight: singleLine ? 36 : 88,
        overflow: 'hidden',
        transition: 'color .15s, box-shadow .15s, border-color .15s',
        boxShadow: focused
          ? '0 0 0 2px color-mix(in srgb, var(--ring) 50%, transparent)'
          : 'var(--shadow-xs, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
      }}
    />
  );
}
