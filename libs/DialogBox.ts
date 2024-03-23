import { DialogBoxConfig } from "../interfaces/DialogBox";
import User from "../models/User";
import { v4 as uuid } from "uuid";

export class DialogBox {
  public config: DialogBoxConfig;
  public user: User;
  public answerId: string = null;
  public askId: string

  static dialogs: { [askId: string]: DialogBox } = {};

  constructor(config: DialogBoxConfig, user: User) {
    this.config = config;
    this.user = user;
    this.askId = uuid();
  }

  public static async ask(dialog: DialogBoxConfig, user: User, deviceId?: string, timeout?: number): Promise<string | null> {
    function sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    if (!timeout) timeout = 30 * 1000;
    const startTime = Date.now();
    
    const dialogBox = new DialogBox(dialog, user);
    DialogBox.dialogs[dialogBox.askId] = dialogBox;
    emitter.emit("dialog-box:new", dialogBox)

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
