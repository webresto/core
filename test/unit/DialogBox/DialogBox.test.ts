import { expect } from 'chai';
import { DialogBox } from '../../../libs/DialogBox';
import { DialogBoxConfig } from '../../../interfaces/DialogBox';

describe('DialogBox', () => {
  let dialogConfig: DialogBoxConfig = {
    message: 'Test message',
    title: 'Test title',
    description: 'Test description',
    optionsType: 'button',
    image: "",
    options: [{
      id: 'button1',
      label: 'Button 1',
      of: null
    }]
  };

  it('full circut', async () => {
    let dialog;

    emitter.on("dialog-box:new", "test-dialog-box", function (_dialog) {
      dialog = _dialog
      setTimeout(() => {
        DialogBox.answerProcess(dialog.askId, dialog.config.options[0].id);
      }, 750);
    })

    const result = await DialogBox.ask(dialogConfig, "device123");
    expect(result).to.equal(dialog.config.options[0].id);
  });

  it('should return null when no answer received within timeout', async () => {
    const result = await DialogBox.ask(dialogConfig, "device123", 1000);
    expect(result).to.be.null;
  });
});
