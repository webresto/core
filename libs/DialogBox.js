"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogBox = void 0;
const uuid_1 = require("uuid");
class DialogBox {
    constructor(config, deviceId) {
        this.answerId = null;
        this.config = config;
        this.askId = (0, uuid_1.v4)();
        this.deviceId = deviceId;
    }
    static async ask(dialog, deviceId, timeout) {
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        if (!timeout)
            timeout = 30 * 1000;
        const startTime = Date.now();
        const dialogBox = new DialogBox(dialog, deviceId);
        DialogBox.dialogs[dialogBox.askId] = dialogBox;
        emitter.emit("dialog-box:new", dialogBox);
        while (Date.now() - startTime < timeout) {
            if (DialogBox.dialogs[dialogBox.askId].answerId !== null) {
                // Return the answerId once received
                const answerId = DialogBox.dialogs[dialogBox.askId].answerId;
                delete DialogBox.dialogs[dialogBox.askId]; // Cleanup
                return answerId;
            }
            await sleep(500);
        }
        delete DialogBox.dialogs[dialogBox.askId]; // Cleanup if timed out
        return null; // Return null if timed out without receiving an answer
    }
    static answerProcess(askId, answerId) {
        if (DialogBox.dialogs[askId] !== undefined) {
            emitter.emit("dialog-box:answer-received", askId, answerId);
            DialogBox.dialogs[askId].answerId = answerId;
        }
    }
}
exports.DialogBox = DialogBox;
DialogBox.dialogs = {};
