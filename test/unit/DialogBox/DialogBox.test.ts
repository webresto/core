import { expect } from 'chai';
import { DialogBox } from '../../../libs/DialogBox';
import User from '../../../models/User';
import { DialogBoxConfig } from '../../../interfaces/DialogBox';

describe('DialogBox', () => {
  let user;
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

  before(async () => {
    user = await User.create({ id: "test-dialog", login: "17778222", lastName: 'TESTdialoagBOX', firstName: "111", phone: { code: "1", number: "7778222" } }).fetch();
  });

  it('should initialize config, user, and askId properties', () => {
    const dialogBox = new DialogBox(dialogConfig, user, "device123");
    expect(dialogBox.config).to.deep.equal(dialogConfig);
    expect(dialogBox.user).to.deep.equal(user);
    expect(dialogBox.askId).to.be.a('string');
  });

  it('full circut', async () => {
    let dialog;

    emitter.on("dialog-box:new", "test-dialog-box", function (_dialog) {
      dialog = _dialog
      setTimeout(() => {
        DialogBox.answerProcess(dialog.askId, dialog.config.options[0].id);
      }, 750);
    })

    const result = await DialogBox.ask(dialogConfig, user, "device123");
    expect(result).to.equal(dialog.config.options[0].id);
  });

  it('should return null when no answer received within timeout', async () => {
    const result = await DialogBox.ask(dialogConfig, user, "device123", 1000);
    expect(result).to.be.null;
  });
});
