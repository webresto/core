import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";

import ORM from "../interfaces/ORM";
import { v4 as uuid } from "uuid";
import { PaymentResponse, Payment } from "../interfaces/Payment";
// todo: fix types model instance to {%ModelName%}Record for PaymentMethod";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";

import { OptionalAll } from "../interfaces/toolsTS";
import { PaymentMethodRecord } from "./PaymentMethod";

/** on the example of the basket (Order):
 * 1. Model Conducting Internal/External (for example: Order) creates PaymentDocument
 *
 * 2. PaymentDocument, when creating a new payment order, finds the desired payment method
 * and creates payment in the payment system (there is a redirect for a payment form)
 *
 * 3. When a person paid, depending on the logic of the work of the payment gateway.PaymentProcessor or
 * Getting a call from the payment system,
 * Or we will interview the payment system until we find out the state of the payment.
 * PaymentProcessor has a timer in order to interview payment systems about the state of payment;
 * Thus, in the payment system, an additional survey does not need to be implemented, only the Check function
 *
 * 4. At the time when a person completed the work with the gateway and made payment, he will return to the page indicated
 * In the payment Adapter as a page for a successful return.It is assumed that the redirect to the page will occur
 * an order where a person can see the state of his order.During the load of this page, a call will be made
 * Controller API Getorder (/Api/0.5/order ::::
 *
 * 5. If the payment was successful, then PaymentProcessor will set the PAID status in accordance with PaymentDocument,
 * This, in turn, means that PaymentDocument will try to put the ISPAID: true in the model and make EMIT ('core:payment-Document-Paid', Document)
 * Corresponding Originmodel of the current PaymentDocument.(In the service with ORDER, Next ();)
 *
 * 6. In the event of a change in payment status, an EMIT ('core:payment-Document-Status', Document) will occur where any system can be able
 * to register for changes in status.
 *
 * 7. In the event of unsuccessful payment, the user will be returned to the page of the notification of unsuccessful payment and then there will be a redirect to the page
 * placing an order so that the user can try to pay the order again.
 */

/**
  REGISTERED - the order is registered, but not paid;
  PAID - complete authorization of the amount of the order was carried out;
  CANCEL - authorization canceled;
  REFUND - the transaction was carried out by the return operation;
  DECLINE - Authorization is rejected.
  WAIT_CAPTURE - Waiting for the frozen money to be debited from the account
*/

type PaymentDocumentStatus = "NEW" | "REGISTERED" | "PAID" | "CANCEL" | "REFUND" | "DECLINE" | "WAIT_CAPTURE"

let payment_processor_interval: ReturnType<typeof setInterval>;

/** A pending payment link is given up (DECLINE) after this */
const REGISTERED_TTL_MS = 60 * 60 * 1000;
/** register() holds a document in NEW only for the duration of adapter.createPayment */
const STALE_NEW_MS = 10 * 60 * 1000;

let attributes = {
  /** Unique ID in PaymentDocument */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** corresponds to ID from the Origin Model model */
  originModelId: "string",

  /** ID in the external system */
  externalId: {
    type: "string",
    unique: true,
    required: false,
    allowNull: true // Only for NEW state
  } as unknown as string,

  /** Model from which payment is made*/
  originModel: "string",

  /** Payment method */
  paymentMethod: {
    model: "PaymentMethod",
  } as unknown as PaymentMethodRecord | string,

  /** The amount for payment*/
  amount: "number" as unknown as number,

  /** The flag is established that payment was made*/
  paid: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  status: {
    type: "string",
    isIn: ["NEW", "REGISTERED", "PAID", "CANCEL", "REFUND", "DECLINE"],
    defaultsTo: "NEW",
  } as unknown as PaymentDocumentStatus,

  /** Comments for payment system */
  comment: "string",

  /** It is probably not necessary here */
  redirectLink: "string",

  /** Error text */
  error: "string",
  data: "json" as unknown as object,

  /**
   * Seconds since 1970 when the payment was detached from its order: the basket changed
   * while the payment was still pending and the gateway could not cancel it (see invalidate).
   * A superseded document no longer blocks basket changes, the processor keeps checking it,
   * and if it still gets paid the order is NOT placed — the operator is alerted instead.
   */
  supersededAt: {
    type: "number",
    allowNull: true,
  } as unknown as number
};

type attributes = typeof attributes;
/**
 * @deprecated use PaymentDocumentRecord instead
 */
interface PaymentDocument extends OptionalAll<attributes>, ORM {}
export interface PaymentDocumentRecord extends OptionalAll<attributes>, ORM {}

let Model = {
  beforeCreate(paymentDocumentInit: PaymentDocumentRecord, cb:  (err?: string) => void) {
    if (!paymentDocumentInit.id) {
      paymentDocumentInit.id = uuid();
    }

    cb();
  },
  /**
   * Cancel a pending PaymentDocument (status NEW/REGISTERED).
   * Calls paymentAdapter.cancelPayment to revoke the payment in the external system,
   * then sets status='CANCEL' locally. The adapter must throw if the gateway did not cancel.
   * A NEW document never got a payment link to the customer — it is canceled locally only.
   * If the document is already finalized (PAID/REFUND/CANCEL/DECLINE) — no-op.
   * Used to invalidate a payment link when the underlying basket changes (see invalidate).
   */
  cancel: async function (criteria: CriteriaQuery<PaymentDocumentRecord>): Promise<PaymentDocumentRecord | undefined> {
    const self: PaymentDocumentRecord = (await PaymentDocument.find(criteria).limit(1))[0];
    if (!self) throw `PaymentDocument is not found`;

    // Cannot cancel finalized payments. Especially PAID — that would lose the user's money.
    if (self.paid || ["PAID", "REFUND", "CANCEL", "DECLINE"].includes(self.status)) {
      sails.log.debug(`PaymentDocument > cancel: ${self.id} already finalized (status=${self.status}, paid=${self.paid}), no-op`);
      return self;
    }

    // NEW: register() never completed — adapter.createPayment failed or is still in flight
    // (then register refuses to resurrect the document, see the compare-and-set there). The
    // customer never got a payment link, so there is nothing to revoke at the gateway; asking
    // it to cancel `payments/null` can only fail and would lock the basket forever.
    if (self.status === "NEW") {
      emitter.emit("core:payment-document-before-cancel", self);
      const canceled = await PaymentDocument.update({ id: self.id, status: "NEW" }, { status: "CANCEL" }).fetch();
      // registered in the meantime — it has a payment link now, cancel it at the gateway
      if (!canceled.length) return await PaymentDocument.cancel(criteria);
      emitter.emit("core:payment-document-canceled", { ...self, status: "CANCEL" });
      return { ...self, status: "CANCEL" };
    }

    if (typeof self.paymentMethod !== "string") {
      throw `PaymentDocument > cancel: paymentMethod must be a string id, got ${typeof self.paymentMethod}`;
    }

    emitter.emit("core:payment-document-before-cancel", self);
    try {
      let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod);
      let cancelledPaymentDocument: PaymentDocumentRecord = await paymentAdapter.cancelPayment(self);
      sails.log.silly("PaymentDocument > cancel > adapter result", cancelledPaymentDocument);

      await PaymentDocument.update(
        { id: self.id },
        { status: "CANCEL" }
      ).fetch();

      emitter.emit("core:payment-document-canceled", { ...self, status: "CANCEL" });
      return { ...self, status: "CANCEL" };
    } catch (e) {
      sails.log.error("PaymentDocument > cancel error :", e);
      throw e;
    }
  },

  /**
   * Make a pending document stop blocking its order: called when the basket changes.
   * Unlike cancel() it never leaves the basket locked because of the gateway:
   *  - the gateway is asked first; if the payment is already PAID, the regular paid flow runs
   *    (doCheck → afterUpdate → doPaid) and "PAID" is returned — the caller must abort the
   *    basket change, the basket is frozen;
   *  - if the gateway already finalized the payment (CANCEL/DECLINE/...) — nothing else to do;
   *  - otherwise cancel() is tried; if the gateway cannot cancel (ЮKassa cannot cancel a pending
   *    capture:true payment at all), the document is marked superseded: the processor keeps
   *    checking it, and a late payment alerts the operator instead of placing the order.
   * Returns the resulting status or "SUPERSEDED".
   */
  invalidate: async function (criteria: CriteriaQuery<PaymentDocumentRecord>): Promise<PaymentDocumentStatus | "SUPERSEDED"> {
    const self: PaymentDocumentRecord = (await PaymentDocument.find(criteria).limit(1))[0];
    if (!self) throw `PaymentDocument is not found`;

    if (self.paid) return "PAID";
    if (!["NEW", "REGISTERED"].includes(self.status)) return self.status;
    if (self.supersededAt) return "SUPERSEDED";

    if (self.status === "REGISTERED") {
      const checked = await PaymentDocument.doCheck({ id: self.id });
      if (checked?.paid || checked?.status === "PAID") return "PAID";
      if (checked?.status && !["NEW", "REGISTERED"].includes(checked.status)) return checked.status;
    }

    try {
      return (await PaymentDocument.cancel({ id: self.id })).status;
    } catch (e) {
      const supersededAt = Math.floor(Date.now() / 1000);
      const superseded = await PaymentDocument.update({ id: self.id, paid: false }, { supersededAt }).fetch();
      // paid in the meantime: the paid flow has already run, the basket is frozen
      if (!superseded.length) return "PAID";
      sails.log.warn(`PaymentDocument > invalidate: gateway did not cancel ${self.id}, document superseded`);
      emitter.emit("core:payment-document-superseded", { ...self, supersededAt });
      return "SUPERSEDED";
    }
  },

  doCheck: async function (criteria: CriteriaQuery<PaymentDocumentRecord>): Promise<PaymentDocumentRecord> {
    const self: PaymentDocumentRecord = (await PaymentDocument.find(criteria).limit(1))[0];
    if (!self) throw `PaymentDocument is not found`

    emitter.emit("core:payment-document-check", self);
    try {
      let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod as string);
      let checkedPaymentDocument: PaymentDocumentRecord = await paymentAdapter.checkPayment(self);
      sails.log.silly("checkedPaymentDocument >> ", checkedPaymentDocument)

      if (checkedPaymentDocument.status === "PAID") {
        await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status, paid: true }).fetch();
        checkedPaymentDocument.paid = true;
      } else {
        await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status }).fetch();
      }
      emitter.emit("core:payment-document-checked-document", checkedPaymentDocument);
      return checkedPaymentDocument;
    } catch (e) {
      sails.log.error("PAYMENTDOCUMENT > doCheck error :", e);
    }
  },

  register: async function (
    originModelId: string,
    originModel: string,
    amount: number,
    paymentMethodId: string,
    backLinkSuccess: string,
    backLinkFail: string,
    comment: string,
    data: object
  ): Promise<PaymentResponse> {
    checkAmount(amount);
    await checkOrigin(originModel, originModelId);
    await checkPaymentMethod(paymentMethodId);
    let id: string = uuid();
    id = id.replace(/-/g, '').toUpperCase();
    let payment: Payment = {
      id: id,
      originModelId: originModelId,
      originModel: originModel,
      paymentMethod: paymentMethodId,
      amount: amount,
      comment: comment,
      data: data,
    };

    emitter.emit("core:payment-document-before-create", payment);
    try {
      await PaymentDocument.create(payment as PaymentDocumentRecord).fetch();
    } catch (e) {
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      throw {
        code: 3,
        error: "PaymentDocument not created: " + e,
      };
    }

    let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
    sails.log.debug("PaymentDocument > register [paymentAdapter]", paymentMethodId, paymentAdapter);
    let paymentResponse: PaymentResponse;
    try {
      sails.log.silly("PaymentDocument > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
      paymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);
      sails.log.silly("PaymentDocument > register [after paymentAdapter.createPayment]", paymentResponse);

      if(!paymentResponse.id) {
        throw `PaymentDocument > register [after paymentAdapter.createPayment] paymentResponse.id from external payment system is required`
      }
      
      if(!paymentResponse.redirectLink) {
        throw `PaymentDocument > register [after paymentAdapter.createPayment] paymentResponse.redirectLink from external payment system is required`
      }
      
    } catch (e) {
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      // The document must not stay NEW: nothing polls NEW, and a pending document blocks
      // the order's basket (see Order.cancelOrderPayment).
      try {
        await PaymentDocument.update({ id: id, status: "NEW" }, { status: "DECLINE", error: String(e?.message ?? e) }).fetch();
      } catch (updateError) {
        sails.log.error("PaymentDocument > register: failed to decline document", id, updateError);
      }
      throw {
        code: 4,
        error: "Error in paymentAdapter.createPayment :" + e,
      };
    }

    // Compare-and-set: the basket may have changed while the gateway call was in flight, and
    // cancel() closes a document without externalId locally. Do not resurrect it.
    const registered = await PaymentDocument.update(
      { id: id, status: "NEW" },
      {
        status: "REGISTERED",
        externalId: paymentResponse.externalId,
        redirectLink: paymentResponse.redirectLink,
      }
    ).fetch();
    if (!registered.length) {
      try {
        await paymentAdapter.cancelPayment({ ...payment, externalId: paymentResponse.externalId } as PaymentDocumentRecord);
      } catch (e) {
        sails.log.warn("PaymentDocument > register: could not cancel payment created for a canceled document", id, e);
      }
      throw {
        code: 5,
        error: "PaymentDocument was canceled while registering the payment",
      };
    }
    return paymentResponse;
  },
  afterUpdate: async function (values: PaymentDocument, next: () => void) {
    sails.log.silly("PaymentDocument > afterUpdate > ", JSON.stringify(values));
    if (values.paid && values.status === "PAID") {
      try {
        if (!values.amount || !values.paymentMethod || !values.originModelId) {
          sails.log.error("PaymentDocument > afterUpdate, not have required fields :", values);
          throw "PaymentDocument > afterUpdate, not have required fields";
        }
        const originModel = sails.models[values.originModel];
        if (values.supersededAt) {
          // The basket changed after this payment link was issued (see invalidate): the money
          // matches the old basket, so the origin must not be fulfilled automatically.
          if (typeof originModel.doPaidSuperseded !== "function") {
            throw `PaymentDocument > afterUpdate: ${values.originModel} cannot handle superseded payment ${values.id}`;
          }
          await originModel.doPaidSuperseded({id: values.originModelId}, values);
        } else {
          await originModel.doPaid({id: values.originModelId},values);
        }
      } catch (e) {
        sails.log.error("Error in PaymentDocument.afterUpdate :", e);
      }
    }
    next();
  },

  /** Payment check cycle*/
  processor: async function (timeout: number): Promise<ReturnType<typeof setInterval>> {
    sails.log.silly("PaymentDocument.processor > started with timeout: " + ( timeout ?? 45000));
    return (payment_processor_interval = setInterval(async () => {
      try {
        await PaymentDocument.processorTick();
      } catch (e) {
        sails.log.error("PaymentDocument.processor > tick failed:", e);
      }
    }, timeout || 45000));
  },

  /** One pass of the payment check cycle */
  processorTick: async function (): Promise<void> {
    const now = Date.now();
    const staleNewBefore = new Date(now - STALE_NEW_MS);
    const registeredExpiredBefore = new Date(now - REGISTERED_TTL_MS);

    // NEW lives only while register() waits for adapter.createPayment. An older one was left
    // by a crash in between; nothing else polls NEW, so it would block the basket forever.
    const staleNewDocuments: PaymentDocumentRecord[] = (await PaymentDocument.find({ status: "NEW" }))
      .filter((newDocument) => newDocument.createdAt < staleNewBefore);
    for (const staleNewDocument of staleNewDocuments) {
      await PaymentDocument.update({ id: staleNewDocument.id, status: "NEW" }, { status: "DECLINE", error: "payment registration did not complete" }).fetch();
    }

    let actualPaymentDocuments: PaymentDocumentRecord[] = await PaymentDocument.find({ status: "REGISTERED" });

    for (let actualPaymentDocument of actualPaymentDocuments) {
      /**If the date of creation of a payment document more than an hour ago, we put the status expired */
      if (actualPaymentDocument.createdAt < registeredExpiredBefore) {
        // Final check first: a payment made just before the deadline must be picked up,
        // not declined blindly (the money would be taken and the order never placed).
        const checked = await PaymentDocument.doCheck({ id: actualPaymentDocument.id });
        if (checked && (checked.paid || checked.status !== "REGISTERED")) continue;
        await PaymentDocument.update({ id: actualPaymentDocument.id, status: "REGISTERED" }, { status: "DECLINE" }).fetch();
      } else {
        sails.log.silly("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt);
        await PaymentDocument.doCheck({id: actualPaymentDocument.id}) ;
      }
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const PaymentDocument: typeof Model & ORMModel<PaymentDocumentRecord, null>;
}

////////////////////////////// LOCAL

async function checkOrigin(originModel: string, originModelId: string) {
  if (!(await sails.models[originModel].findOne({ id: originModelId }))) {
    throw {
      code: 1,
      error: "incorrect originModelId or originModel",
    };
  }
}

function checkAmount(amount: number) {
  if (!amount || amount <= 0) {
    sails.log.debug(`checkAmount (!amount || amount <= 0) ${amount}`)
    throw {
      code: 2,
      error: "incorrect amount",
    };
  }

  // if (!(amount % 1 === 0)) {
  //   sails.log.debug(`checkAmount (!(amount % 1 === 0)) ${amount}`)
  //   throw {
  //     code: 2,
  //     error: "incorrect amount",
  //   };
  // }
}

async function checkPaymentMethod(paymentMethodId: string) {
  if (!(await PaymentMethod.checkAvailable(paymentMethodId))) {
    throw {
      code: 4,
      error: "paymentAdapter not available",
    };
  }
}
