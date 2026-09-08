// todo: fix types model instance to {%ModelName%}Record for User';
import Ajv from "ajv";
import { UserRecord } from "../../models/User";
import { Channel, NotificationManager } from "./../../libs/NotificationManager"
const NOTIFICATION_CHANNELS_STATE_SETTING = require("../../settings/notification_channels_state.json");

class TestChannel extends Channel {
  public forceSend: boolean = false;
  public forGroupTo: string[] = ['user'];
  public sortOrder: number = 0;
  public cost: number = 0;
  public type: string = "sms";
  public lastMessage: string = "";
  protected async send(badge: "info" | "error", message: string, user: UserRecord, subject?: string, data?: object): Promise<void> {
    this.lastMessage = message;
  }
}
const testChannel = new TestChannel;

describe("NotificationManager", function () {
  it("add new channel", () => {

    NotificationManager.registerChannel(testChannel);
    if (NotificationManager.channels.length !== 1) throw `should 1`
  });


  it("send message", async () => {
    await NotificationManager.send("info", "user", "test123", null);
    if(testChannel.lastMessage !=="test123") throw `Problem in send Notification`
  });

  it("is exist", () => {
    let result = NotificationManager.isChannelExist('sms');
    if(!result) throw `Not exist??`
  });

  // Регресс: схема настройки NOTIFICATION_CHANNELS_STATE и код, который в неё пишет,
  // однажды разошлись (writer добавил stopEscalation, схема с additionalProperties:false
  // его резала). Settings.set() при провале AJV молча делает return — настройка вообще
  // переставала сохраняться, а в лог падал "AJV Validation Error" ещё до готовности.
  it("current channels state matches the setting jsonSchema", () => {
    const state = (NotificationManager as any).getCurrentChannelsState();
    const validate = new Ajv().compile(NOTIFICATION_CHANNELS_STATE_SETTING.jsonSchema);
    if (!validate(state)) {
      throw new Error(
        `getCurrentChannelsState() does not match settings/notification_channels_state.json: ` +
        JSON.stringify(validate.errors)
      );
    }
  });

  it("channels state is actually persisted in settings", async () => {
    await NotificationManager.setChannelSettings("sms", { cost: 7, stopEscalation: true });
    const saved = await Settings.get(NotificationManager.channelsStateSettingKey);
    if (!saved || !saved["sms"]) throw new Error(`NOTIFICATION_CHANNELS_STATE was not saved: ${JSON.stringify(saved)}`);
    if (saved["sms"].cost !== 7) throw new Error(`cost not persisted: ${JSON.stringify(saved["sms"])}`);
    if (saved["sms"].stopEscalation !== true) throw new Error(`stopEscalation not persisted: ${JSON.stringify(saved["sms"])}`);
  });

  it("OTP recive to user", async () => {
    const otpAdapter = await Adapter.getOTPAdapter();
    await Settings.set("CORE_LOGIN_FIELD", {key: "CORE_LOGIN_FIELD", value: "phone"});
    let a = await otpAdapter.get("1123");
    if(testChannel.lastMessage !== `Your secret login code: ${a.password}`) {
      throw new Error(`bad message: ${testChannel.lastMessage }`)
    }
  });
});
