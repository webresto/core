import React, { useState } from 'react';

/**
 * A question in the panel's own dialog (window.UIComponents.Dialog) in place of the browser's confirm and prompt.
 * `ask({ title, text, yes, no, danger })` resolves true or false; with `value` it shows a field and resolves the typed
 * text, or null when cancelled. Render the returned element once in the page.
 */
export function useAsk() {
  const { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } = window.UIComponents;
  const [question, setQuestion] = useState(null);
  const ask = (options) => new Promise((resolve) => setQuestion({ ...options, resolve, typed: options.value ?? '' }));
  const typing = !!question && question.value !== undefined;
  const close = (answer) => {
    question?.resolve(answer);
    setQuestion(null);
  };
  const refuse = () => close(typing ? null : false);
  const accept = () => close(typing ? question.typed : true);

  const dialog = (
    <Dialog open={!!question} onOpenChange={(open) => { if (!open) refuse(); }}>
      {/* above the panel's overlay (z-[1010]), as its own DeleteModal */}
      <DialogContent className="sm:max-w-[425px] z-[1011]">
        <DialogHeader>
          <DialogTitle>{question?.title}</DialogTitle>
          {question?.text && <DialogDescription>{question.text}</DialogDescription>}
        </DialogHeader>
        {typing && (
          <Input autoFocus value={question.typed} onChange={(event) => setQuestion({ ...question, typed: event.target.value })}
            onKeyDown={(event) => { if (event.key === 'Enter') accept(); }} />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={refuse}>{question?.no}</Button>
          <Button variant={question?.danger ? 'destructive' : 'default'} onClick={accept}>{question?.yes}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return [ask, dialog];
}
