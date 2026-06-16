import { expect } from "chai";
import sinon from "sinon";
import {
  buildCancelPaymentDialog,
  CANCEL_PAYMENT_DIALOG_CONFIRM,
} from "../../../libs/dialogs/cancelPaymentDialog";

describe("Order pending payment dialog", function () {
  this.timeout(30000);

  async function createOrderInState(id: string, state: "CHECKOUT" | "PAYMENT") {
    const order = await Order.create({
      id,
      deviceId: `${state.toLowerCase()}-device`,
    }).fetch();
    await Order.update({ id: order.id }, { state }).fetch();
    return await Order.findOne(order.id);
  }

  afterEach(function () {
    sinon.restore();
  });

  it("does not ask when returning from checkout without a registered payment", async function () {
    const order = await createOrderInState(
      `checkout-edit-${Date.now()}-${Math.random()}`,
      "CHECKOUT"
    );
    const ask = sinon.stub(DialogBox, "ask");

    await Order.next(order.id, "CART");

    expect(ask.called).to.equal(false);
    expect((await Order.findOne(order.id)).state).to.equal("CART");
  });

  it("does not ask in payment state when no payment link is registered", async function () {
    const order = await createOrderInState(
      `payment-without-link-${Date.now()}-${Math.random()}`,
      "PAYMENT"
    );
    const ask = sinon.stub(DialogBox, "ask");

    await Order.next(order.id, "CART");

    expect(ask.called).to.equal(false);
    expect((await Order.findOne(order.id)).state).to.equal("CART");
  });

  it("asks when the order has a registered unpaid payment link", async function () {
    const order = await createOrderInState(
      `payment-with-link-${Date.now()}-${Math.random()}`,
      "PAYMENT"
    );
    const paymentMethod = await PaymentMethod.findOne({});

    await PaymentDocument.create({
      id: `PD${Date.now()}${Math.floor(Math.random() * 100000)}`,
      originModel: "order",
      originModelId: order.id,
      paymentMethod: paymentMethod.id,
      amount: 100,
      paid: false,
      status: "REGISTERED",
      externalId: `external-${Date.now()}-${Math.random()}`,
      redirectLink: "https://payment.example.test/",
    }).fetch();

    const ask = sinon
      .stub(DialogBox, "ask")
      .resolves(CANCEL_PAYMENT_DIALOG_CONFIRM);
    const cancelOrderPayment = sinon.stub(Order, "cancelOrderPayment").resolves();

    await Order.next(order.id, "CART");

    expect(ask.calledOnce).to.equal(true);
    expect(cancelOrderPayment.calledOnceWith({ id: order.id })).to.equal(true);
    expect((await Order.findOne(order.id)).state).to.equal("CART");
  });

  it("translates every visible dialog string for all core locales", function () {
    const locales = [
      "ar", "cn", "de", "es", "fr", "it", "jp", "ko",
      "pt", "ru", "th", "ua", "uz", "vi",
    ];

    for (const locale of locales) {
      const dialog = buildCancelPaymentDialog(locale);
      expect(dialog.title, locale).to.not.equal("Cancel pending payment?");
      expect(dialog.message, locale).to.not.equal(
        "You have an active payment link for this order. Editing the basket will cancel that payment. Do you want to continue?"
      );
      expect(dialog.options[0].label, locale).to.not.equal("Cancel payment and edit basket");
      expect(dialog.options[1].label, locale).to.not.equal("Keep payment");
    }
  });

  it("normalizes regional and legacy locale names", function () {
    expect(buildCancelPaymentDialog("ru-RU").title).to.equal("Отменить ожидающую оплату?");
    expect(buildCancelPaymentDialog("zh-CN").title).to.equal("取消待处理的付款？");
    expect(buildCancelPaymentDialog("ja-JP").title).to.equal("保留中の支払いをキャンセルしますか？");
    expect(buildCancelPaymentDialog("vn").title).to.equal("Huỷ thanh toán đang chờ?");
  });
});
