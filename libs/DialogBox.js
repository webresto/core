"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogBox = void 0;
const uuid_1 = require("uuid");
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
let jsonSchema = require("./schemas/dialogBoxConfig.json");
const validate = ajv.compile(jsonSchema);
class DialogBox {
    constructor(config, deviceId) {
        this.answerId = null;
        if (config.type === undefined)
            config.type = "routine";
        if (config.allowClosing === undefined)
            config.allowClosing = true;
        if (config.options.length < 1) {
            throw `Options for DialogBox should be defined`;
        }
        this.config = config;
        this.askId = config.askId ?? (0, uuid_1.v4)();
        this.deviceId = deviceId;
    }
    static async ask(dialog, deviceId, timeout) {
        if (!dialog) {
            throw `DialogBox config not defined [${dialog}]`;
        }
        if (!deviceId) {
            throw `deviceId not defined [${dialog}]`;
        }
        // Check JsonSchema
        if (!validate(dialog)) {
            sails.log.error(`${dialog} not match with config schema`);
            let errors = JSON.stringify(validate.errors, null, 2);
            sails.log.error(errors);
            throw `DialogBox config not valid: ${errors}`;
        }
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        if (!timeout)
            timeout = 30 * 1000;
        const startTime = Date.now();
        const dialogBox = new DialogBox(dialog, deviceId);
        dialogBox.config.emitTime = Math.round((startTime) / 1000);
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
        let answerId = null;
        // retruns defaultOption if timer exceded
        if (DialogBox.dialogs[dialogBox.askId].config.defaultOptionId) {
            answerId = DialogBox.dialogs[dialogBox.askId].config.defaultOptionId;
        }
        delete DialogBox.dialogs[dialogBox.askId];
        return answerId;
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
