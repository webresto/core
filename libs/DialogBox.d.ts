import { DialogBoxConfig } from "../interfaces/DialogBox";
export declare class DialogBox {
    config: DialogBoxConfig;
    user: User;
    answerId: string;
    askId: string;
    deviceId: string;
    static dialogs: {
        [askId: string]: DialogBox;
    };
    private constructor();
    static ask(dialog: DialogBoxConfig, deviceId: string, timeout?: number): Promise<string | null>;
    static answerProcess(askId: string, answerId: string): void;
}
