"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DialogBox_1 = require("../../../libs/DialogBox");
describe('DialogBox', () => {
    let dialogConfig = {
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
            dialog = _dialog;
            setTimeout(() => {
                DialogBox_1.DialogBox.answerProcess(dialog.askId, dialog.config.options[0].id);
            }, 750);
        });
        const result = await DialogBox_1.DialogBox.ask(dialogConfig, "device123");
        (0, chai_1.expect)(result).to.equal(dialog.config.options[0].id);
    });
    it('should return null when no answer received within timeout', async () => {
        const result = await DialogBox_1.DialogBox.ask(dialogConfig, "device123", 1000);
        (0, chai_1.expect)(result).to.be.null;
    });
});
