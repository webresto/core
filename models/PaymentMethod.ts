import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { v4 as uuid } from "uuid";
import type { PaymentAdapter } from "../adapters";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { PaymentMethodType } from "../lib/enums/PaymentMethodTypes";

let alivePaymentMethods = {} as {[k: string]: PaymentAdapter } ;

/** Types that work without a payment adapter: their `adapter` value is never read */
const noAdapterTypes: PaymentMethodType[] = ["promise", "dummy"];

interface ExternalPayment {
  name: string;
  id: string;
}

let attributes = {
  /** ID of the payment method */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  externalId: {
    type: "string",
    allowNull: true,
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
    type: "boolean",
  } as unknown as boolean,
  /**
   * Payment adapter name, the link between the record and the alive adapter.
   * Optional for no-adapter types (promise, dummy): beforeCreate fills `no-adapter-<id>`
   */
  adapter: {
    type: "string",
    unique: true,
  } as unknown as string,
  sortOrder: "number" as unknown as number,
  description: "string",
  enable: {
    type: "boolean"
  } as unknown as boolean,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
export interface PaymentMethodRecord extends RequiredField<OptionalAll<attributes>, "type" | "adapter" | "enable">, ORM {}

let Model = {
  /**
   * Returns the authority of payment Adapter by the famous name Adapter
   * @return PaymentAdapter
   * @param adapter
   */
  async getAdapter(adapter?: string): Promise<PaymentAdapter> {
    let paymentMethod: PaymentMethodRecord;
    if (!adapter) {
      paymentMethod = this;
    } else {
      paymentMethod = await PaymentMethod.findOne({ adapter: adapter });
    }
    if (await PaymentMethod.isPaymentPromise(paymentMethod.id)) {
      return undefined;
    }
    if (alivePaymentMethods[paymentMethod.adapter] !== undefined) {
      return alivePaymentMethods[paymentMethod.adapter];
    } else {
      return undefined;
    }
  },

  beforeCreate: function (paymentMethod: PaymentMethodRecord, cb: (err?: string) => void) {
    if (!paymentMethod.id) {
      paymentMethod.id = uuid();
    }
    if (!paymentMethod.adapter) {
      if (!noAdapterTypes.includes(paymentMethod.type)) {
        return cb(`PaymentMethod: adapter is required for type "${paymentMethod.type}"`);
      }
      // `adapter` is unique, so a no-adapter method gets its own placeholder
      paymentMethod.adapter = `no-adapter-${paymentMethod.id}`;
    }
    cb();
  },

  beforeUpdate: function (values: Partial<PaymentMethodRecord>, cb: (err?: string) => void) {
    // An emptied field (admin form) keeps the stored adapter instead of breaking the link
    if ("adapter" in values && !values.adapter) {
      delete values.adapter;
    }
    cb();
  },

  // a storefront asks the ways to pay of its order again
  afterCreate: function (record: PaymentMethodRecord, cb: (err?: string) => void) {
    emitter.emit("core:payment-method-changed", record);
    cb();
  },

  afterUpdate: function (record: PaymentMethodRecord, cb: (err?: string) => void) {
    emitter.emit("core:payment-method-changed", record);
    cb();
  },

  afterDestroy: function (record: PaymentMethodRecord, cb: (err?: string) => void) {
    emitter.emit("core:payment-method-changed", record);
    cb();
  },

  /**
   * Returns True if the payment method is a promise of payment
   * @param  paymentMethodId
   * @return
   */
  async isPaymentPromise(paymentMethodId?: string): Promise<boolean> {
    let checkingPaymentMethod: PaymentMethodRecord;

    if (!paymentMethodId) {
      checkingPaymentMethod = this;
    } else {
      checkingPaymentMethod = await PaymentMethod.findOne({
        id: paymentMethodId,
      });
    }

    if (checkingPaymentMethod.type === "promise") {
      return true;
    }
    return false;
  },

  /**
   * Adds to the list possible to use payment ADAPTERs at their start.
   * If the payment method does not dry in the database, it creates it
   * @return string[]
   * @param paymentAdapter
   */
  async alive(paymentAdapter: PaymentAdapter): Promise<string[]> {
    let defaultEnable = (await Settings.get("DEFAULT_ENABLE_PAYMENT_METHODS")) ?? false;
    let knownPaymentMethod = await PaymentMethod.findOrCreate(
      {
        adapter: paymentAdapter.InitPaymentAdapter.adapter,
      },
      { ...paymentAdapter.InitPaymentAdapter, enable: defaultEnable }
    );

    alivePaymentMethods[paymentAdapter.InitPaymentAdapter.adapter] = paymentAdapter;
    sails.log.silly("PaymentMethod > alive", knownPaymentMethod, alivePaymentMethods[paymentAdapter.InitPaymentAdapter.adapter]);
    return;
  },

  /**
   * Returns an array with possible methods of payment for ORDER
   * @return array of types of payments
   */
  async getAvailable(): Promise<PaymentMethodRecord[]> {
    return await PaymentMethod.find({
      where: {
        or: [
          {
            adapter: Object.keys(alivePaymentMethods),
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
    const checkingPaymentMethod = await PaymentMethod.findOne({
      id: paymentMethodId,
    });

    if (!checkingPaymentMethod) {
      return false;
    }

    if (!noAdapterTypes.includes(checkingPaymentMethod.type) && alivePaymentMethods[checkingPaymentMethod.adapter] === undefined) {
      return false;
    }

    if (checkingPaymentMethod.enable === true && !noAdapterTypes.includes(checkingPaymentMethod.type) && alivePaymentMethods[checkingPaymentMethod.adapter] !== undefined) {
      return true;
    }

    if (checkingPaymentMethod.enable === true && noAdapterTypes.includes(checkingPaymentMethod.type)) {
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
    const paymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });

    if (await PaymentMethod.isPaymentPromise(paymentMethod.id)) {
      throw `PaymentPromise adapter: (${paymentMethod.adapter}) not have adapter`;
    }

    if (alivePaymentMethods[paymentMethod.adapter]) {
      sails.log.silly("Core > PaymentMethod > getAdapterById", alivePaymentMethods[paymentMethod.adapter]);
      return alivePaymentMethods[paymentMethod.adapter];
    } else {
      throw `${paymentMethod.adapter} is not alive`;
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const PaymentMethod: typeof Model & ORMModel<PaymentMethodRecord, "type" | "enable">;
}
