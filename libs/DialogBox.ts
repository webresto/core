import { DialogBoxConfig } from "../interfaces/DialogBox";
import User from "../models/User";
import { v4 as uuid } from "uuid";

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
    this.askId = uuid();
    this.deviceId = deviceId;
  }

  public static async ask(dialog: DialogBoxConfig, deviceId: string, timeout?: number): Promise<string | null> {
    function sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    if (!timeout) timeout = 30 * 1000;
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

  public static answerProcess(askId: string, answerId: string): void {
    if(DialogBox.dialogs[askId] !== undefined) { 
      emitter.emit("dialog-box:answer-received", askId, answerId);
      DialogBox.dialogs[askId].answerId = answerId;
    }
  }
}
