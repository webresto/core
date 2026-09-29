import { expect } from 'chai';
import { DialogBox } from '../../../libs/DialogBox';
import { DialogBoxConfig } from '../../../interfaces/DialogBox';

describe('DialogBox', () => {
  let dialogConfig: DialogBoxConfig = {
    message: 'Test message',
    title: 'Test title',
    optionsType: 'button',
    options: [{
      id: 'button1',
      label: 'Button 1',
      button: {
       label: 'Button 1',
       type: 'primary' 
      } 
    },
    {
      id: 'button2',
      label: 'Button 2',
      button: {
       label: 'Button 2',
       type: 'secondary' 
      } 
    }]
  };

  it('full circut', async () => {
    let dialog: DialogBox;

    emitter.on("dialog-box:new", "test-dialog-box", function (_dialog,test) {
      dialog = _dialog
      setTimeout(() => {
        DialogBox.answerProcess(dialog.askId, dialog.config.options[0].id);
      }, 750);
    })

    console.log(dialogConfig)
    const result = await DialogBox.ask(dialogConfig, "device123");
    expect(result).to.equal(dialog.config.options[0].id);
  });

  it('should return null when no answer received within timeout', async () => {
    const result = await DialogBox.ask(dialogConfig, "device123", 1000);
    expect(result).to.be.null;
  });
});
