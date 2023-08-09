import { ORMModel } from "../interfaces/ORMModel";

import ORM from "../interfaces/ORM";
import { v4 as uuid } from "uuid";
var alivedPaymentMethods: {} = {};
import PaymentAdapter from "../adapters/payment/PaymentAdapter";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { PaymentMethodType } from "../libs/enums/PaymentMethodTypes";

interface ExternalPayment { 
  name: string 
  id: string 
}

let attributes = {
  /** ID of the payment method */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,
  
  externalId: {
    type: "string",
    allowNull: true 
  },

  /** The name of the payment method */
  title: "string",

  /**
   * Types of payments, internal - internal (when a request to the external system is not required)
   * external - when to expect confirmation of payment in the external system
   * Promise - types of payment upon receipt
   */
  type: {
    type: "string",
    isIn: ["internal", "external", "promise", "dummy"],
    required: true,
  } as unknown as PaymentMethodType,
  isCash: {
    type: "boolean"
  } as unknown as boolean,
  adapter: {
    type: "string",
    unique: true,
    required: true,
  } as unknown as string,
  sortOrder: "number" as unknown as number,
  description: "string",
  enable: {
    type: "boolean",
    required: true,
  } as unknown as boolean,
};

type attributes = typeof attributes;
interface PaymentMethod extends RequiredField<OptionalAll<attributes>, "type" | "adapter" | "enable">, ORM {}
export default PaymentMethod;
let Model = {
  /**
   * Returns the authority of payment Adapter by the famous name Adapter
   * @param  paymentMethodId
   * @return
   */
  async getAdapter(adapter?: string): Promise<PaymentAdapter> {
    var paymentMethod: PaymentMethod;
    if (!adapter) {
      paymentMethod = this;
    } else {
      paymentMethod = await PaymentMethod.findOne({ adapter: adapter });
    }
    //@ts-ignore
    if (PaymentMethod.isPaymentPromise(paymentMethod.id)) {
      return undefined;
    }
    if (alivedPaymentMethods[paymentMethod.adapter] !== undefined) {
      return alivedPaymentMethods[paymentMethod.adapter];
    } else {
      return undefined;
    }
  },

  beforeCreate: function (paymentMethod, cb:  (err?: string) => void) {
    if (!paymentMethod.id) {
      paymentMethod.id = uuid();
    }
    cb();
  },

  /**
   * Returns True if the payment method is a promise of payment
   * @param  paymentMethodId
   * @return
   */
  async isPaymentPromise(paymentMethodId?: string): Promise<boolean> {
    var chekingPaymentMethod: PaymentMethod;

    if (!paymentMethodId) {
      chekingPaymentMethod = this;
    } else {
      chekingPaymentMethod = await PaymentMethod.findOne({
        id: paymentMethodId,
      });
    }

    if (chekingPaymentMethod.type === "promise") {
      return true;
    }
    return false;
  },

  /**
     * returns list of externalPaymentId
     * @param  paymentMethodId
     * @return { name: string, id: string }
     */
  async getExternalPaymentMethods(): Promise<ExternalPayment[]> {
    let externalPayments = await Settings.get("EXTERNAL_PAYMENTS") as unknown as ExternalPayment[]
    if(externalPayments) {
      return externalPayments
    } else {
      return [];
    }
  },


  /**
   * Adds to the list possible to use payment ADAPTERs at their start.
   * If the payment method does not dry in the database, it creates it
   * @param paymentMethod
   * @return
   */
  async alive(paymentAdapter: PaymentAdapter): Promise<string[]> {
    let defaultEnable = Boolean(await Settings.get("DEFAULT_ENABLE_PAYMENT_METHODS")) ?? false;
    let knownPaymentMethod = await PaymentMethod.findOrCreate({
      adapter: paymentAdapter.InitPaymentAdapter.adapter,
    },{ ...paymentAdapter.InitPaymentAdapter, enable: defaultEnable } );

    alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter] = paymentAdapter;
    sails.log.silly("PaymentMethod > alive", knownPaymentMethod, alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter]);
    return;
  },

  /**
   * Returns an array with possible methods of payment for ORDER
   * @return array of types of payments
   */
  async getAvailable(): Promise<PaymentMethod[]> {
    return await PaymentMethod.find({
      where: {
        or: [
          {
            adapter: Object.keys(alivedPaymentMethods),
            enable: true,
          },
          {
            type: ["promise", "dummy"],
            enable: true,
          },
        ],
      },
      sort: "sortOrder ASC",
    });
  },
  /**
   * Checks the payment system for accessibility, and inclusion,
   * For the system of systems, only inclusion.
   * @param paymentMethodId
   * @return
   */
  async checkAvailable(paymentMethodId: string): Promise<boolean> {
    const chekingPaymentMethod = await PaymentMethod.findOne({
      id: paymentMethodId,
    });
    const noAdapterTypes = ["promise", "dummy"];

    if (!chekingPaymentMethod) {
      return false;
    }

    if (!noAdapterTypes.includes(chekingPaymentMethod.type) && alivedPaymentMethods[chekingPaymentMethod.adapter] === undefined) {
      return false;
    }

    if (chekingPaymentMethod.enable === true && !noAdapterTypes.includes(chekingPaymentMethod.type) && alivedPaymentMethods[chekingPaymentMethod.adapter] !== undefined) {
      return true;
    }

    if (chekingPaymentMethod.enable === true && noAdapterTypes.includes(chekingPaymentMethod.type)) {
      return true;
    }
    return false;
  },
  /**
   * Returns the authority of payment Adapter by the famous ID PaymentMethod
   * @param  paymentMethodId
   * @return PaymentAdapter
   * @throws
   */
  async getAdapterById(paymentMethodId: string): Promise<PaymentAdapter> {
    const paymentMethod = await PaymentMethod.findOne({id: paymentMethodId});

    if (await PaymentMethod.isPaymentPromise(paymentMethod.id)){
      throw `PaymentPromise adapter: (${paymentMethod.adapter}) not have adapter`
    }

    if (alivedPaymentMethods[paymentMethod.adapter]){
      sails.log.silly("Core > PaymentMethod > getAdapterById", alivedPaymentMethods[paymentMethod.adapter]);
      return alivedPaymentMethods[paymentMethod.adapter]
    } else {
      throw `${paymentMethod.adapter} is not alived`
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const PaymentMethod: typeof Model & ORMModel<PaymentMethod, "type" | "adapter" | "enable">;
}
