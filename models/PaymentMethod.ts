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
  async alive(initPaymentMethod: InitPaymentAdapter): Promise<string[]> {
    let knownPaymentMethod = await PaymentMethod.findOne({adapter: initPaymentMethod.adapter});
    if (!knownPaymentMethod) {
      knownPaymentMethod = await PaymentMethod.create(initPaymentMethod);
    }
    if (knownPaymentMethod.enable === true){
      alivedPaymentMethods.push(initPaymentMethod.adapter);
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

// /**
//  * Типы платежей, internal - внутренние (когда не требуется запрос во внешнюю систему)
//  * external - Когда надо ожидать подтверждение платежа во внешней системе
//  * promise - Типы оплат при получении
//  */
// export enum PaymentType {
//   internal="internal",
//   external="external",
//   promise="promise"
// }

/**
 * Описывает модель "Способ оплаты"
 */
export default interface PaymentMethod extends ORM, InitPaymentAdapter  {
  id?: string;
  enable?: boolean;
}

/**
 * Описывает инит обеькт для регистрации "Способ оплаты"
 */
export interface InitPaymentAdapter {
  title: string;
  type: string;
  adapter: string;
  description?: string;
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
  alive(paymentMethod: InitPaymentAdapter): Promise<PaymentMethod[]>;
}

declare global {
  const PaymentMethod: PaymentMethodModel;
}
