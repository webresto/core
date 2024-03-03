import { ORMModel } from "../interfaces/ORMModel";

import ORM from "../interfaces/ORM";
import { v4 as uuid } from "uuid";
import { PaymentResponse, Payment } from "../interfaces/Payment";
import PaymentMethod from "../models/PaymentMethod";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";

import { OptionalAll, RequiredField } from "../interfaces/toolsTS";

/** on the example of the basket (Order):
 * 1. Model Conducting Internal/External (for example: Order) creates PaymentDocument
 *
 * 2. PaymentDocument, when creating a new payment order, finds the desired payment method
 * and creates payment in the payment system (there is a redirect for a payment form)
 *
 * 3. When a person paid, depending on the logic of the work of the payment gateway.PaymentProcessor or
 * Getting a call from the payment system
 * Or we will interview the payment system until we find out the state of the payment.
 * PaymentProcessor has a timer in order to interview payment systems about the state of payment,
 * Thus, in the payment system, an additional survey does not need to be implemented, only the Check function
 *
 * 4. At the time when a person completed the work with the gateway and made payment, he will return to the page indicated
 * In the payment Adapter as a page for a successful return.It is assumed that the redirect to the page will occur
 * an order where a person can see the state of his order.During the load of this page, a call will be made
 * Controller API Getorder (/Api/0.5/order ::::
 *
 * 5. If the payment was successful, then PaymentProcessor will set the PAID status in accordance with PaymentDocument,
 * This, in turn, means that PaymentDocument will try to put the ISPAID: true in the model and make EMIT ('Core-Payment-Document-Paid', Document)
 * Corresponding Originmodel of the current PaymentDocument.(In the service with ORDER, Next ();)
 *
 * 6. In the event of a change in payment status, an EMIT ('Core-Payment-Document-Status', Document) will occur where any system can be able
 * to register for changes in status,
 *
 * 7. In the event of unsuccessful payment, the user will be returned to the page of the notification of unsuccessful payment and then there will be a redirect to the page
 * placing an order so that the user can try to pay the order again.
 */

/**
  REGISTRED - the order is registered, but not paid;
  PAID - complete authorization of the amount of the order was carried out;
  CANCEL - authorization canceled;
  REFUND - the transaction was carried out by the return operation;
  DECLINE - Authorization is rejected.
  WAIT_CAPTURE - Waiting for the frozen money to be debited from the account
*/

type PaymentDocumentStatus = "NEW" | "REGISTRED" | "PAID" | "CANCEL" | "REFUND" | "DECLINE" | "WAIT_CAPTURE"

let payment_processor_interval: ReturnType<typeof setInterval>;

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
    // allowNull: true // Only for NEW state
  } as unknown as string,

  /** Model from which payment is made*/
  originModel: "string",

  /** Payment method */
  paymentMethod: {
    model: "PaymentMethod",
  } as unknown as PaymentMethod | any,

  /** The amount for payment*/
  amount: "number" as unknown as number,

  /** The flag is established that payment was made*/
  paid: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  status: {
    type: "string",
    isIn: ["NEW", "REGISTRED", "PAID", "CANCEL", "REFUND", "DECLINE"],
    defaultsTo: "NEW",
  } as unknown as PaymentDocumentStatus,

  /** Comments for payment system */
  comment: "string",

  /** It is probably not necessary here */
  redirectLink: "string",

  /** Error text */
  error: "string",
  data: "json" as unknown as any
};

type attributes = typeof attributes;
interface PaymentDocument extends OptionalAll<attributes>, ORM {}
export default PaymentDocument;
let Model = {
  beforeCreate(paymentDocumentInit: any, cb:  (err?: string) => void) {
    if (!paymentDocumentInit.id) {
      paymentDocumentInit.id = uuid();
    }

    cb();
  },
  doCheck: async function (criteria: any): Promise<PaymentDocument> {
    const self: PaymentDocument = (await PaymentDocument.find(criteria).limit(1))[0];
    if (!self) throw `PaymentDocument is not found`

    emitter.emit("core-payment-document-check", self);
    try {
      let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod);
      let checkedPaymentDocument: PaymentDocument = await paymentAdapter.checkPayment(self);
      sails.log.silly("checkedPaymentDocument >> ", checkedPaymentDocument)



      if (checkedPaymentDocument.status === "PAID") {
        await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status, paid: true }).fetch();
        checkedPaymentDocument.paid = true;
      } else {
        await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status }).fetch();
      }
      emitter.emit("core-payment-document-checked-document", checkedPaymentDocument);
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
    data: any
  ): Promise<PaymentResponse> {
    checkAmount(amount);
    await checkOrigin(originModel, originModelId);
    await checkPaymentMethod(paymentMethodId);
    var id: string = uuid();
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

    emitter.emit("core-payment-document-before-create", payment);
    try {
      await PaymentDocument.create(payment as PaymentDocument);
    } catch (e) {
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      throw {
        code: 3,
        error: "PaymentDocument not created: " + e,
      };
    }

    let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
    sails.log.debug("PaymentDocumnet > register [paymentAdapter]", paymentMethodId, paymentAdapter);
    try {
      sails.log.silly("PaymentDocumnet > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
      let paymentResponse: PaymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);
      sails.log.silly("PaymentDocumnet > register [after paymentAdapter.createPayment]", paymentResponse);

      if(!paymentResponse.id) {
        throw `PaymentDocumnet > register [after paymentAdapter.createPayment] paymentResponse from external payment system is required`
      }
      
      await PaymentDocument.update(
        { id: paymentResponse.id },
        {
          status: "REGISTRED",
          externalId: paymentResponse.externalId,
          redirectLink: paymentResponse.redirectLink,
        }
      ).fetch();
      return paymentResponse;
    } catch (e) {
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      throw {
        code: 4,
        error: "Error in paymentAdapter.createPayment :" + e,
      };
    }
  },
  afterUpdate: async function (values: PaymentDocument, next: any) {
    sails.log.silly("PaymentDocument > afterUpdate > ", JSON.stringify(values));
    if (values.paid && values.status === "PAID") {
      try {
        if (!values.amount || !values.paymentMethod || !values.originModelId) {
          sails.log.error("PaymentDocument > afterUpdate, not have requried fields :", values);
          throw "PaymentDocument > afterUpdate, not have requried fields";
        }
        await sails.models[values.originModel].doPaid({id: values.originModelId},values);
      } catch (e) {
        sails.log.error("Error in PaymentDocument.afterUpdate :", e);
      }
    }
    next();
  },

  /** Payment check cycle*/
  processor: async function (timeout: number): Promise<ReturnType<typeof setInterval>> {
    sails.log.silly("PaymentDocument.processor > started with timeout: " + timeout ?? 45000);
    return (payment_processor_interval = setInterval(async () => {
      let actualTime = new Date();

      let actualPaymentDocuments: PaymentDocument[] = await PaymentDocument.find({ status: "REGISTRED" });

      /**If the date of creation of a payment document more than an hour ago, we put the status expired */
      actualTime.setHours(actualTime.getHours() - 1);
      for await (let actualPaymentDocument of actualPaymentDocuments) {
        if (actualPaymentDocument.createdAt < actualTime) {
          await PaymentDocument.update({ id: actualPaymentDocument.id }, { status: "DECLINE" }).fetch();
        } else {
          sails.log.silly("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt, "after:", actualTime);
          await PaymentDocument.doCheck({id: actualPaymentDocument.id}) ;
        }
      }
    }, timeout || 45000));
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const PaymentDocument: typeof Model & ORMModel<PaymentDocument, null>;
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
    throw {
      code: 2,
      error: "incorrect amount",
    };
  }

  if (!(amount % 1 === 0)) {
    throw {
      code: 2,
      error: "incorrect amount",
    };
  }
}

async function checkPaymentMethod(paymentMethodId) {
  if (!(await PaymentMethod.checkAvailable(paymentMethodId))) {
    throw {
      code: 4,
      error: "paymentAdapter not available",
    };
  }
}
