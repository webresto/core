import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
var alivedPaymentMethods: string[] = [];

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true,
      autoIncrement: true
    },
    title: 'string',
    type: {
      type: 'string',
      enum: ['promise', 'external', 'internal'],
      defaultsTo: 'promise',
      required: true
    },
    adapter: {
      type: 'string',
      unique: true,
      required: true
    },
    description: 'string',
    enable: {
      type: 'boolean',
      defaultsTo: true,
      required: true
    }
  },

  /**
 * Добавляет в список возможных к использованию платежные адаптеры при старте.
 * Если  платежный метод не сушетсвует в базе то создает его
 * @param paymentMethod 
 * @return 
 */
  async alive(paymentMethod: PaymentMethod): Promise<string[]> {
    let knownPaymentMethod = await PaymentMethod.findOne({adapter: paymentMethod.adapter});
    if (!knownPaymentMethod) {
      knownPaymentMethod = await PaymentMethod.create(paymentMethod);
    }
    if (knownPaymentMethod.enable === true){
      alivedPaymentMethods.push(paymentMethod.adapter);
    }
    return
  },
 
  /**
 * Возвращает массив с возможными на текущий момент способами оплаты
 * @param  нету
 * @return массив типов оплат
 */
  async paymentMethods(): Promise<PaymentMethod[]> {
    return await PaymentMethod.find({or: [{adapter: alivedPaymentMethods}, {type:'promise', enable: true} ]});
  }
};

/**
 * Описывает модель "Способ оплаты"
 */
export default interface PaymentMethod extends ORM {
  id: string;
  title: string;
  type: string;
  adapter: string;
  description?: string;
  enable?: boolean;
}

/**
 * Описывает класс PaymentMethod, используется для ORM
 */
export interface PaymentMethodModel extends ORMModel<PaymentMethod> {
  /**
   * Выключает все 
   * @param paymentMethod - ключ
   * @return .
   */
  alive(paymentMethod: PaymentMethod): Promise<PaymentMethod[]>;
}

declare global {
  const PaymentMethod: PaymentMethodModel;
}
