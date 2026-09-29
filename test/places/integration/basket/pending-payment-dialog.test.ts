import { expect } from "chai";
import sinon from "sinon";
import { buildCancelPaymentDialog, CANCEL_PAYMENT_DIALOG_CONFIRM } from "../../../../lib/order/cancelPaymentDialog";
import { resetDatabase } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * Going back to the basket from checkout or payment: a basket with a payment
 * link still open in the gateway asks the device first, and editing it cancels
 * the payment; without such a link nothing is asked. What the device answers
 * and what the gateway does with a cancellation are stubbed — both are outside
 * core.
 */
describe("Pending payment dialog", function () {
  let paymentMethod: string;

  before(async function () {
    await resetDatabase();
    paymentMethod = (await PaymentMethod.create({ title: "Payment 1", type: "external", adapter: "payment-1", enable: true }).fetch()).id;
  });

  afterEach(function () {
    sinon.restore();
  });

  async function orderIn(state: "CHECKOUT" | "PAYMENT"): Promise<string> {
    const order = await Order.create({ deviceId: "device-1" }).fetch();
    await Order.update({ id: order.id }, { state }).fetch();
    return order.id;
  }

  const registerPayment = (orderId: string) =>
    PaymentDocument.create({
      originModel: "order",
      originModelId: orderId,
      paymentMethod,
      amount: 100,
      paid: false,
      status: "REGISTERED",
      externalId: `external-${orderId}`,
      redirectLink: "https://payment.example/1",
    }).fetch();

  it("does not ask when there is no open payment link, from checkout or from payment", async function () {
    const ask = sinon.stub(DialogBox, "ask");

    for (const state of ["CHECKOUT", "PAYMENT"] as const) {
      const id = await orderIn(state);
      await Order.next(id, "CART");
      expect((await Order.findOne({ id })).state).to.equal("CART");
    }
    expect(ask.called).to.equal(false);
  });

  it("asks when the payment link is open, and cancels the payment once the device agrees", async function () {
    const id = await orderIn("PAYMENT");
    const document = await registerPayment(id);
    const ask = sinon.stub(DialogBox, "ask").resolves(CANCEL_PAYMENT_DIALOG_CONFIRM);
    const cancel = sinon.stub(PaymentDocument, "cancel").resolves();

    await Order.next(id, "CART");

    expect(ask.calledOnce).to.equal(true);
    expect(ask.firstCall.args[1]).to.equal("device-1");
    expect(cancel.calledOnceWith({ id: document.id })).to.equal(true);
    expect((await Order.findOne({ id })).state).to.equal("CART");
  });

  it("leaves the order in payment when the device declines", async function () {
    const id = await orderIn("PAYMENT");
    await registerPayment(id);
    sinon.stub(DialogBox, "ask").resolves("keep");
    const cancel = sinon.stub(PaymentDocument, "cancel").resolves();

    expect(String(await thrown(Order.next(id, "CART")))).to.contain("declined to cancel pending payment");
    expect(cancel.called).to.equal(false);
    expect((await Order.findOne({ id })).state).to.equal("PAYMENT");
  });

  describe("in the customer's language", function () {
    it("translates every visible string for every core locale", function () {
      for (const locale of ["ar", "cn", "de", "es", "fr", "it", "jp", "ko", "pt", "ru", "th", "ua", "uz", "vi"]) {
        const dialog = buildCancelPaymentDialog(locale);
        expect(dialog.title, locale).to.not.equal("Cancel pending payment?");
        expect(dialog.message, locale).to.not.equal(
          "You have an active payment link for this order. Editing the basket will cancel that payment. Do you want to continue?",
        );
        expect(dialog.options[0].button?.label, locale).to.not.equal("Cancel payment and edit basket");
        expect(dialog.options[1].button?.label, locale).to.not.equal("Keep payment");
      }
    });

    it("reads regional and legacy locale names", function () {
      expect(buildCancelPaymentDialog("ru-RU").title).to.equal("Отменить ожидающую оплату?");
      expect(buildCancelPaymentDialog("zh-CN").title).to.equal("取消待处理的付款？");
      expect(buildCancelPaymentDialog("ja-JP").title).to.equal("保留中の支払いをキャンセルしますか？");
      expect(buildCancelPaymentDialog("vn").title).to.equal("Huỷ thanh toán đang chờ?");
    });
  });
});
