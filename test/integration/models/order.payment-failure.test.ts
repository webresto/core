import { expect } from "chai";
import sinon from "sinon";
import { CANCEL_PAYMENT_DIALOG_CONFIRM } from "../../../libs/dialogs/cancelPaymentDialog";

/**
 * A failed or uncancellable payment must never lock the basket: the customer has to be able
 * to retry the payment or edit the basket, and a late payment for a changed basket must reach
 * the operator instead of placing the order.
 */
describe("Order payment failures do not lock the basket", function () {
  this.timeout(30000);

  let paymentMethodId: string;
  let orderIds: string[] = [];

  before(async function () {
    paymentMethodId = (await PaymentMethod.findOne({})).id;
  });

  afterEach(async function () {
    sinon.restore();
    // sails-disk treats null as a value of the unique externalId (Postgres does not), so
    // documents without externalId left behind would break registrations in later tests.
    await PaymentDocument.destroy({ originModelId: orderIds });
    orderIds = [];
  });

  function useAdapter(overrides: Record<string, sinon.SinonStub> = {}) {
    const adapter = {
      createPayment: sinon.stub().rejects(new Error("createPayment must not be called")),
      checkPayment: sinon.stub().rejects(new Error("checkPayment must not be called")),
      cancelPayment: sinon.stub().rejects(new Error("cancelPayment must not be called")),
      ...overrides,
    };
    sinon.stub(PaymentMethod, "getAdapterById").resolves(adapter as any);
    return adapter;
  }

  /** Gateway answer for the given document; other documents stay as they are */
  function gatewayStatus(documentId: string, status: string) {
    return sinon.stub().callsFake(async (paymentDocument: any) =>
      paymentDocument.id === documentId
        ? { ...paymentDocument, status, paid: status === "PAID" }
        : { ...paymentDocument }
    );
  }

  async function createOrderInState(state: string, patch: Record<string, unknown> = {}) {
    const order = await Order.create({
      id: `payment-failure-${Date.now()}-${Math.random()}`,
      deviceId: `payment-failure-device-${Math.random()}`,
    }).fetch();
    orderIds.push(order.id);
    await Order.update({ id: order.id }, { state, ...patch } as any).fetch();
    return await Order.findOne(order.id);
  }

  async function createPaymentDocument(orderId: string, patch: Record<string, unknown> = {}) {
    return await PaymentDocument.create({
      id: `PD${Date.now()}${Math.floor(Math.random() * 100000)}`,
      originModel: "order",
      originModelId: orderId,
      paymentMethod: paymentMethodId,
      amount: 100,
      paid: false,
      status: "REGISTERED",
      ...patch,
    } as any).fetch();
  }

  it("keeps the order in CHECKOUT and declines the document when the adapter fails, retry works", async function () {
    const order = await createOrderInState("CHECKOUT", { total: 100, paymentMethod: paymentMethodId });
    sinon.stub(PaymentMethod, "checkAvailable").resolves(true);
    sinon.stub(Order, "countCart").resolves();
    const createPayment = sinon.stub();
    createPayment.onFirstCall().rejects(new TypeError("Cannot read properties of null (reading 'customData')"));
    createPayment.onSecondCall().callsFake(async (payment: any) => ({
      ...payment,
      externalId: `external-${payment.id}`,
      redirectLink: "https://payment.example.test/",
    }));
    useAdapter({ createPayment });

    let error: any;
    try {
      await Order.payment({ id: order.id });
    } catch (e) {
      error = e;
    }

    expect(error, "payment must fail").to.exist;
    expect((await Order.findOne(order.id)).state).to.equal("CHECKOUT");
    const [declined] = await PaymentDocument.find({ originModelId: order.id });
    expect(declined.status).to.equal("DECLINE");
    expect(declined.error).to.contain("customData");

    // see afterEach: sails-disk would reject a second document without externalId
    await PaymentDocument.destroy({ id: declined.id });
    const response = await Order.payment({ id: order.id });

    expect(response.redirectLink).to.equal("https://payment.example.test/");
    expect((await Order.findOne(order.id)).state).to.equal("PAYMENT");
    const registered = await PaymentDocument.find({ originModelId: order.id, status: "REGISTERED" });
    expect(registered).to.have.length(1);
  });

  it("cancels a document that never reached the gateway locally, without asking the adapter", async function () {
    const order = await createOrderInState("PAYMENT");
    const document = await createPaymentDocument(order.id, { status: "NEW" });
    const adapter = useAdapter();
    const ask = sinon.stub(DialogBox, "ask");

    await Order.next(order.id, "CART");

    expect((await Order.findOne(order.id)).state).to.equal("CART");
    expect((await PaymentDocument.findOne(document.id)).status).to.equal("CANCEL");
    expect(adapter.cancelPayment.called).to.equal(false);
    expect(adapter.checkPayment.called).to.equal(false);
    expect(ask.called).to.equal(false);
  });

  it("still cancels a registered payment at the gateway when the adapter gave no externalId", async function () {
    const order = await createOrderInState("PAYMENT");
    const document = await createPaymentDocument(order.id, { redirectLink: "https://payment.example.test/" });
    const adapter = useAdapter({
      checkPayment: gatewayStatus(document.id, "REGISTERED"),
      cancelPayment: sinon.stub().resolves(),
    });
    sinon.stub(DialogBox, "ask").resolves(CANCEL_PAYMENT_DIALOG_CONFIRM);

    await Order.next(order.id, "CART");

    expect((await Order.findOne(order.id)).state).to.equal("CART");
    expect(adapter.cancelPayment.calledOnce).to.equal(true);
    expect((await PaymentDocument.findOne(document.id)).status).to.equal("CANCEL");
  });

  it("supersedes a pending payment the gateway cannot cancel and lets the basket change", async function () {
    const order = await createOrderInState("PAYMENT");
    const document = await createPaymentDocument(order.id, {
      externalId: `external-${Date.now()}-${Math.random()}`,
      redirectLink: "https://payment.example.test/",
    });
    const adapter = useAdapter({
      checkPayment: gatewayStatus(document.id, "REGISTERED"),
      cancelPayment: sinon.stub().rejects(new Error("400 Incorrect payment_id")),
    });
    const ask = sinon.stub(DialogBox, "ask").resolves(CANCEL_PAYMENT_DIALOG_CONFIRM);

    await Order.next(order.id, "CART");

    expect((await Order.findOne(order.id)).state).to.equal("CART");
    const superseded = await PaymentDocument.findOne(document.id);
    expect(superseded.status).to.equal("REGISTERED");
    expect(superseded.supersededAt).to.be.a("number");
    expect(ask.calledOnce).to.equal(true);

    // The superseded link neither blocks the next basket change nor asks again.
    await Order.update({ id: order.id }, { state: "PAYMENT" }).fetch();
    await Order.next(order.id, "CART");

    expect((await Order.findOne(order.id)).state).to.equal("CART");
    expect(ask.calledOnce).to.equal(true);
    expect(adapter.cancelPayment.calledOnce).to.equal(true);
  });

  it("aborts the basket change when the pending payment turns out to be paid", async function () {
    const order = await createOrderInState("PAYMENT");
    const document = await createPaymentDocument(order.id, {
      externalId: `external-${Date.now()}-${Math.random()}`,
      redirectLink: "https://payment.example.test/",
    });
    const doPaid = sinon.stub(Order, "doPaid").resolves();
    const adapter = useAdapter({ checkPayment: gatewayStatus(document.id, "PAID") });
    sinon.stub(DialogBox, "ask").resolves(CANCEL_PAYMENT_DIALOG_CONFIRM);

    let error: any;
    try {
      await Order.next(order.id, "CART");
    } catch (e) {
      error = e;
    }

    expect(error?.message).to.contain("already paid");
    expect(doPaid.called).to.equal(true);
    expect(adapter.cancelPayment.called).to.equal(false);
    expect((await Order.findOne(order.id)).state).to.equal("PAYMENT");
  });

  it("alerts the operator instead of placing the order when a superseded payment gets paid", async function () {
    const order = await createOrderInState("CART");
    const document = await createPaymentDocument(order.id, {
      externalId: `external-${Date.now()}-${Math.random()}`,
      supersededAt: Math.floor(Date.now() / 1000),
    });
    const doPaid = sinon.stub(Order, "doPaid").resolves();
    const alert = sinon.stub(NotificationManager, "sendMessageToDeliveryManager").resolves();
    useAdapter({ checkPayment: gatewayStatus(document.id, "PAID") });

    await PaymentDocument.doCheck({ id: document.id });

    expect(doPaid.called).to.equal(false);
    const flagged = await Order.findOne(order.id);
    expect(flagged.problem).to.equal(true);
    expect(flagged.paid).to.equal(false);
    expect(flagged.state).to.equal("CART");
    expect(alert.called).to.equal(true);
    expect(alert.firstCall.args[0]).to.equal("error");
    expect(alert.firstCall.args[1]).to.contain(order.shortId);
  });

  it("does not resurrect a document canceled while the gateway call was in flight", async function () {
    const order = await createOrderInState("CHECKOUT");
    sinon.stub(PaymentMethod, "checkAvailable").resolves(true);
    const adapter = useAdapter({
      createPayment: sinon.stub().callsFake(async (payment: any) => {
        // the customer edits the basket while the gateway is answering
        await PaymentDocument.cancel({ id: payment.id });
        return { ...payment, externalId: `external-${payment.id}`, redirectLink: "https://payment.example.test/" };
      }),
      cancelPayment: sinon.stub().resolves(),
    });

    let error: any;
    try {
      await PaymentDocument.register(order.id, "order", 100, paymentMethodId, "https://ok", "https://fail", "", {});
    } catch (e) {
      error = e;
    }

    expect(error?.code).to.equal(5);
    const [document] = await PaymentDocument.find({ originModelId: order.id });
    expect(document.status).to.equal("CANCEL");
    expect(adapter.cancelPayment.calledOnce).to.equal(true);
    expect(adapter.cancelPayment.firstCall.args[0].externalId).to.equal(`external-${document.id}`);
  });

  describe("processor", function () {
    const hoursAgo = (hours: number) => Date.now() - hours * 60 * 60 * 1000;

    it("declines a stale NEW document and leaves a fresh one alone", async function () {
      const order = await createOrderInState("PAYMENT");
      // externalIds only because sails-disk rejects two null values of the unique externalId
      const stale = await createPaymentDocument(order.id, { status: "NEW", externalId: `stale-${Date.now()}-${Math.random()}` });
      const fresh = await createPaymentDocument(order.id, { status: "NEW", externalId: `fresh-${Date.now()}-${Math.random()}` });
      await PaymentDocument.update({ id: stale.id }, { createdAt: hoursAgo(1) } as any).fetch();
      useAdapter({ checkPayment: sinon.stub().callsFake(async (paymentDocument: any) => ({ ...paymentDocument })) });

      await PaymentDocument.processorTick();

      expect((await PaymentDocument.findOne(stale.id)).status).to.equal("DECLINE");
      expect((await PaymentDocument.findOne(fresh.id)).status).to.equal("NEW");
    });

    it("checks an expired payment once more before declining it", async function () {
      const order = await createOrderInState("PAYMENT");
      const paid = await createPaymentDocument(order.id, { externalId: `external-paid-${Date.now()}-${Math.random()}` });
      const pending = await createPaymentDocument(order.id, { externalId: `external-pending-${Date.now()}-${Math.random()}` });
      await PaymentDocument.update({ id: [paid.id, pending.id] }, { createdAt: hoursAgo(2) } as any).fetch();
      sinon.stub(Order, "doPaid").resolves();
      useAdapter({
        checkPayment: sinon.stub().callsFake(async (paymentDocument: any) =>
          paymentDocument.id === paid.id
            ? { ...paymentDocument, status: "PAID", paid: true }
            : { ...paymentDocument }
        ),
      });

      await PaymentDocument.processorTick();

      const paidAfter = await PaymentDocument.findOne(paid.id);
      expect(paidAfter.status).to.equal("PAID");
      expect(paidAfter.paid).to.equal(true);
      expect((await PaymentDocument.findOne(pending.id)).status).to.equal("DECLINE");
    });
  });
});
