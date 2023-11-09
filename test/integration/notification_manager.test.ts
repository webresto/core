import { Channel, NotificationManager } from "@webresto/core/libs/NotificationManager"
import User from "@webresto/core/models/User";

class TestChannel extends Channel {
  public forceSend: boolean = false;
  public forGroupTo: string[] = ['user'];
  public sortOrder: number = 0;
  public type: string = "sms";
  public lastMessage: string = "";
  protected async send(badge: "info" | "error", message: string, user: User, subject?: string, data?: object): Promise<void> {
    this.lastMessage = message;
  }
}
const testChannel = new TestChannel;

describe("NotificationManager", function () {
  it("NotificationManager add new channel", () => {
    
    NotificationManager.registerChannel(testChannel);
    if (NotificationManager.channels.length !== 1) throw `should 1`
  });


  it("NotificationManager send message", () => {
    NotificationManager.send("info", "user", "test123", null);
    if(testChannel.lastMessage !=="test123") throw `Problem in send Ntification`
  });
});