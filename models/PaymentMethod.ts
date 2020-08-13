import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
var alivedPaymentMethods: string[] = [];

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true
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
    order: 'integer',
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
 * Возвращает массив с возможными на текущий момент способами оплаты отсортированный по order
 * @param  нету
 * @return массив типов оплат
 */
  async getAvailable(): Promise<PaymentMethod[]> {
    return await PaymentMethod.find({
      where: {
        or: [{
              adapter: alivedPaymentMethods
            }, 
            {
              type:'promise', 
              enable: true,
            }]
          },
      sort: 'order ASC'
      });
  },
    /**
   * Проверяет платежную систему на доступность, и включенность,
   *  для пейментПромис систем только включенность.
   * @param paymentMethodId 
   * @return 
   */
  async checkAailable(paymentMethodId: string): Promise<boolean> {
    const chekingPaymentMethod = await PaymentMethod.findOne({id: paymentMethodId});

    if (!chekingPaymentMethod) {
      return false
    }

    if (chekingPaymentMethod.type !== 'promise' && 
        alivedPaymentMethods.indexOf(paymentMethodId) != -1){
          return false
    } 

    if (chekingPaymentMethod.enable === true && 
        chekingPaymentMethod.type !== 'promise' && 
        alivedPaymentMethods.indexOf(paymentMethodId) >= 0 ){
          return true
    }


    if (chekingPaymentMethod.enable === true && 
      chekingPaymentMethod.type === 'promise' ){
        return true
    }

    return false
  },
    /**
   * Возвращает true если платежный метод является обещанием платежа
   * @param  paymentMethodId
   * @return 
   */
  async isPaymentPromise(paymentMethodId: string): Promise<boolean> {
    const chekingPaymentMethod = await PaymentMethod.findOne({id: paymentMethodId});
    if (chekingPaymentMethod.type === 'promise'){
      return true;
    } 
    return false;
  },

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

  /**
  * Возврашает доступные для оплаты платежные методы
  */
  getAvailable(): Promise<PaymentMethod[]>;
  
  /**
  * Проверяет платежную систему
  */
  checkAvailable(paymentMethodId: string): Promise<boolean>;
  
  /**
  * Проверяет платежное обещание
  */
  isPaymentPromise(paymentMethodId: string): Promise<boolean>;
}

declare global {
  const PaymentMethod: PaymentMethodModel;
}
