import { expect } from "chai";
import sinon from "sinon";
import { registerPaymentTools } from "../../../hook/mcp/payment";

/**
 * A pending payment can be confirmed by hand (test orders on a live gateway, money confirmed
 * outside the gateway): the regular paid flow runs, and the gateway, still reporting the payment
 * pending, must not roll the confirmation back.
 */
describe("PaymentDocument manual confirmation", function () {
  this.timeout(30000);

  const confirmation = { by: "test", via: "test", reason: "test order, no money" };
  let paymentMethodId: string;
  let orderIds: string[] = [];

  before(async function () {
    paymentMethodId = (await PaymentMethod.findOne({})).id;
  });

  afterEach(async function () {
    sinon.restore();
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

  async function createOrderInPayment() {
    const order = await Order.create({
      id: `payment-confirm-${Date.now()}-${Math.random()}`,
      deviceId: `payment-confirm-device-${Math.random()}`,
    }).fetch();
    orderIds.push(order.id);
    await Order.update({ id: order.id }, { state: "PAYMENT" } as any).fetch();
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
      // sails-disk treats null as a value of the unique externalId
      externalId: `external-${Date.now()}-${Math.random()}`,
      data: { total: 100 },
      ...patch,
    } as any).fetch();
  }

  async function rejection(promise: Promise<unknown>): Promise<any> {
    try {
      await promise;
    } catch (e) {
      return e;
    }
    throw new Error("expected a rejection");
  }

  it("runs the paid flow without asking the gateway and records who confirmed and why", async function () {
    const order = await createOrderInPayment();
    const document = await createPaymentDocument(order.id);
    const doPaid = sinon.stub(Order, "doPaid").resolves();
    const adapter = useAdapter();

    const confirmed = await PaymentDocument.confirm({ id: document.id }, confirmation);

    expect(confirmed.status).to.equal("PAID");
    expect(confirmed.paid).to.equal(true);
    expect(adapter.checkPayment.called).to.equal(false);
    expect(doPaid.calledOnce).to.equal(true);
    expect(doPaid.firstCall.args[0]).to.deep.equal({ id: order.id });
    expect(doPaid.firstCall.args[1].id).to.equal(document.id);

    const stored = await PaymentDocument.findOne(document.id);
    expect((stored.data as any).total, "the order snapshot is kept").to.equal(100);
    expect((stored.data as any).manualConfirmation).to.include({ by: "test", via: "test", reason: "test order, no money" });
    expect((stored.data as any).manualConfirmation.at).to.be.a("string");

    const logs = await Order.getLogs({ id: order.id });
    expect(logs.some((entry: any) => String(entry.message).includes("confirming by hand"))).to.equal(true);
  });

  it("adds the reason to the order comment, which goes to the RMS", async function () {
    const order = await createOrderInPayment();
    await Order.update({ id: order.id }, { comment: "Call before delivery" } as any).fetch();
    const confirmed = await createPaymentDocument(order.id);
    // placing the order is not under test here (the fixture has no timezone, ordering is disabled)
    const placeOrder = sinon.stub(Order, "order").resolves();
    // the fixture has neither the ru locale nor appendLocale, so core translations are not bound there
    const getSetting = sinon.stub(Settings, "get").callThrough();
    getSetting.withArgs("DEFAULT_LOCALE").resolves("ru");
    sinon.stub(sails.hooks.i18n, "getLocales").returns({ ru: require("../../../libs/locales/ru.json") });

    await PaymentDocument.confirm({ id: confirmed.id }, { ...confirmation, reason: "Тест, денег не будет" });

    expect(placeOrder.calledOnce).to.equal(true);
    const paid = await Order.findOne(order.id);
    expect(paid.paid).to.equal(true);
    const [original, note] = paid.comment.split("\n");
    expect(original).to.equal("Call before delivery");
    expect(note).to.equal("Оплата проведена вручную: Тест, денег не будет");
  });

  it("leaves the order comment alone for a payment reported by the gateway", async function () {
    const order = await createOrderInPayment();
    await Order.update({ id: order.id }, { comment: "Call before delivery" } as any).fetch();
    const document = await createPaymentDocument(order.id);
    sinon.stub(Order, "order").resolves();
    useAdapter({ checkPayment: sinon.stub().callsFake(async (paymentDocument: any) => ({ ...paymentDocument, status: "PAID", paid: true })) });

    await PaymentDocument.doCheck({ id: document.id });

    const paid = await Order.findOne(order.id);
    expect(paid.paid).to.equal(true);
    expect(paid.comment).to.equal("Call before delivery");
  });

  it("refuses a document that is not a pending payment, and requires a reason", async function () {
    const order = await createOrderInPayment();
    const doPaid = sinon.stub(Order, "doPaid").resolves();
    const pending = await createPaymentDocument(order.id);
    const fresh = await createPaymentDocument(order.id, { status: "NEW" });
    const declined = await createPaymentDocument(order.id, { status: "DECLINE" });
    const superseded = await createPaymentDocument(order.id, { supersededAt: Math.floor(Date.now() / 1000) });

    expect(await rejection(PaymentDocument.confirm({ id: pending.id }, { ...confirmation, reason: "  " }))).to.contain("reason is required");
    expect(await rejection(PaymentDocument.confirm({ id: fresh.id }, confirmation))).to.contain("is NEW");
    expect(await rejection(PaymentDocument.confirm({ id: declined.id }, confirmation))).to.contain("is DECLINE");
    expect(await rejection(PaymentDocument.confirm({ id: superseded.id }, confirmation))).to.contain("superseded");

    expect(doPaid.called).to.equal(false);
    expect((await PaymentDocument.findOne(pending.id)).status).to.equal("REGISTERED");
    expect((await PaymentDocument.findOne(superseded.id)).paid).to.equal(false);

    await PaymentDocument.confirm({ id: pending.id }, confirmation);
    expect(await rejection(PaymentDocument.confirm({ id: pending.id }, confirmation))).to.contain("is PAID and paid");
    expect(doPaid.calledOnce).to.equal(true);
  });

  it("is not rolled back by a gateway that still reports the payment pending", async function () {
    const order = await createOrderInPayment();
    const document = await createPaymentDocument(order.id);
    sinon.stub(Order, "doPaid").resolves();
    useAdapter({ checkPayment: sinon.stub().callsFake(async (paymentDocument: any) => ({ ...paymentDocument, status: "REGISTERED" })) });

    await PaymentDocument.confirm({ id: document.id }, confirmation);
    const checked = await PaymentDocument.doCheck({ id: document.id });

    expect(checked.paid).to.equal(true);
    const stored = await PaymentDocument.findOne(document.id);
    expect(stored.status).to.equal("PAID");
    expect(stored.paid).to.equal(true);
  });

  it("is not rolled back by a gateway check that was already in flight", async function () {
    const order = await createOrderInPayment();
    const document = await createPaymentDocument(order.id);
    sinon.stub(Order, "doPaid").resolves();
    useAdapter({
      checkPayment: sinon.stub().callsFake(async (paymentDocument: any) => {
        // the operator confirms while the gateway is answering "pending"
        await PaymentDocument.confirm({ id: paymentDocument.id }, confirmation);
        return { ...paymentDocument, status: "REGISTERED" };
      }),
    });

    const checked = await PaymentDocument.doCheck({ id: document.id });

    expect(checked.status).to.equal("PAID");
    expect(checked.paid).to.equal(true);
    expect((await PaymentDocument.findOne(document.id)).status).to.equal("PAID");
  });

  describe("MCP payment-document-confirm", function () {
    let tool: any;
    let originalMcp: any;
    let originalEnabled: string | undefined;

    before(function () {
      originalMcp = (global as any).mcp;
      originalEnabled = process.env.MCP_ENABLED;
      const tools: Record<string, any> = {};
      (global as any).mcp = { registerTool: (definition: any) => (tools[definition.name] = definition) };
      process.env.MCP_ENABLED = "true";
      registerPaymentTools();
      tool = tools["payment-document-confirm"];
    });

    after(function () {
      (global as any).mcp = originalMcp;
      if (originalEnabled === undefined) delete process.env.MCP_ENABLED;
      else process.env.MCP_ENABLED = originalEnabled;
    });

    it("confirms the only pending payment of an order found by shortId", async function () {
      const order = await createOrderInPayment();
      await createPaymentDocument(order.id, { status: "DECLINE" });
      const pending = await createPaymentDocument(order.id);
      sinon.stub(Order, "doPaid").resolves();

      const result = await tool.handler({ orderId: order.shortId, reason: "test order" }, { req: { user: { login: "operator" } } });

      expect(result.paymentDocument.id).to.equal(pending.id);
      expect(result.paymentDocument.status).to.equal("PAID");
      expect(result.paymentDocument.data.manualConfirmation).to.include({ by: "admin:operator", via: "mcp", reason: "test order" });
      expect(result.order.id).to.equal(order.id);
      expect(result.logs).to.be.an("array").that.is.not.empty;
    });

    it("asks for paymentDocumentId when the order has several pending payments", async function () {
      const order = await createOrderInPayment();
      const first = await createPaymentDocument(order.id);
      await createPaymentDocument(order.id);
      const doPaid = sinon.stub(Order, "doPaid").resolves();

      const error = await rejection(tool.handler({ orderId: order.id, reason: "test order" }, {}));
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.contain("pass paymentDocumentId");
      expect(doPaid.called).to.equal(false);

      const result = await tool.handler({ paymentDocumentId: first.id, reason: "test order" }, {});
      expect(result.paymentDocument.id).to.equal(first.id);
      expect(result.paymentDocument.data.manualConfirmation.by).to.equal("mcp-internal");
    });

    it("reports model errors as Error messages", async function () {
      const order = await createOrderInPayment();
      const declined = await createPaymentDocument(order.id, { status: "DECLINE" });

      const byOrder = await rejection(tool.handler({ orderId: order.id, reason: "test order" }, {}));
      expect(byOrder.message).to.contain("has no pending payment");
      expect(byOrder.message).to.contain(`${declined.id}: DECLINE`);

      const byDocument = await rejection(tool.handler({ paymentDocumentId: declined.id, reason: "test order" }, {}));
      expect(byDocument).to.be.instanceOf(Error);
      expect(byDocument.message).to.contain("only a pending (REGISTERED) payment can be confirmed");
    });
  });
});
