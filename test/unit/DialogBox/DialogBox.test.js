"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DialogBox_1 = require("../../../libs/DialogBox");
describe('DialogBox', () => {
    let dialogConfig = {
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
        let dialog;
        emitter.on("dialog-box:new", "test-dialog-box", function (_dialog, test) {
            dialog = _dialog;
            setTimeout(() => {
                DialogBox_1.DialogBox.answerProcess(dialog.askId, dialog.config.options[0].id);
            }, 750);
        });
        console.log(dialogConfig);
        const result = await DialogBox_1.DialogBox.ask(dialogConfig, "device123");
        (0, chai_1.expect)(result).to.equal(dialog.config.options[0].id);
    });
    it('should return null when no answer received within timeout', async () => {
        const result = await DialogBox_1.DialogBox.ask(dialogConfig, "device123", 1000);
        (0, chai_1.expect)(result).to.be.null;
    });
});
