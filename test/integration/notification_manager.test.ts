import User  from './../../models/User';
import { Channel, NotificationManager } from "./../../libs/NotificationManager"

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
  it("add new channel", () => {

    NotificationManager.registerChannel(testChannel);
    if (NotificationManager.channels.length !== 1) throw `should 1`
  });


  it("send message", () => {
    NotificationManager.send("info", "user", "test123", null);
    if(testChannel.lastMessage !=="test123") throw `Problem in send Notification`
  });

  it("is exist", () => {
    let result = NotificationManager.isChannelExist('sms');
    if(!result) throw `Not exist??`
  });

  it("OTP recive to user", async () => {
    const otpAdapter = await Adapter.getOTPAdapter();
    await Settings.set("LOGIN_FIELD", {key: "LOGIN_FIELD", value: "phone"});
    let a = await otpAdapter.get("1123");
    if(testChannel.lastMessage !== `Your code is ${a.password}`) {
      throw new Error(`bad message: ${testChannel.lastMessage }`)
    }
  });
});
