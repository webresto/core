import { DialogBoxConfig } from "../interfaces/DialogBox";
// todo: fix types model instance to {%ModelName%}Record for User";
import { v4 as uuid } from "uuid";

import Ajv from 'ajv';
const ajv = new Ajv();
let jsonSchema = require("./schemas/dialogBoxConfig.json")
const validate = ajv.compile(jsonSchema);


export class DialogBox {
  public config: DialogBoxConfig;
  public user: User;
  public answerId: string = null;
  public askId: string
  public deviceId: string
  
  static dialogs: { [askId: string]: DialogBox } = {};

  private constructor(config: DialogBoxConfig, deviceId: string) {
    if(config.type === undefined) config.type = "routine"
    if(config.allowClosing === undefined) config.allowClosing = true
    
    if(config.options.length < 1 ){
      throw `Options for DialogBox should be defined`
    }

    this.config = config;
    this.askId = config.askId ?? uuid();
    this.deviceId = deviceId;
  }

  public static async ask(dialog: DialogBoxConfig, deviceId: string, timeout?: number): Promise<string | null> {

    if(!dialog) {
      throw `DialogBox config not defined [${dialog}]`
    }

    if(!deviceId) {
      throw `deviceId not defined [${dialog}]`
    }

    // Check JsonSchema
    if(!validate(dialog)) {
      sails.log.error(`${dialog} not match with config schema`)
      let errors = JSON.stringify(validate.errors, null, 2)
      sails.log.error(errors)
      throw `DialogBox config not valid: ${errors}`
    }
    
    function sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    if (!timeout) timeout = 30 * 1000;
    const startTime = Date.now();
    const dialogBox = new DialogBox(dialog, deviceId);
    dialogBox.config.emitTime = Math.round((startTime)/1000)
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
    if(DialogBox.dialogs[dialogBox.askId].config.defaultOptionId) {
      answerId = DialogBox.dialogs[dialogBox.askId].config.defaultOptionId
    }

    delete DialogBox.dialogs[dialogBox.askId];
    return answerId;
  }

  public static answerProcess(askId: string, answerId: string): void {
    if(DialogBox.dialogs[askId] !== undefined) { 
      emitter.emit("dialog-box:answer-received", askId, answerId);
      DialogBox.dialogs[askId].answerId = answerId;
    }
  }
}
