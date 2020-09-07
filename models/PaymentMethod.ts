import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import uuid = require('uuid/v4');
var alivedPaymentMethods: {} = {};
import PaymentAdapter from "../adapter/payment/PaymentAdapter"
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
    },



      /**
     * Возвращает инстанс платежного адаптера по известному названию адаптера
     * @param  paymentMethodId
     * @return 
     */
    async getAdapter(adapter?: string): Promise<PaymentAdapter> {
        var paymentMethod: PaymentMethod
        if (!adapter) {
          paymentMethod = this;
        } else {
          paymentMethod = await PaymentMethod.findOne({adapter: adapter});
        }
        //@ts-ignore 
        if (paymentMethod.isPaymentPromise()){
          return undefined
        }
        if (alivedPaymentMethods[paymentMethod.adapter] !== undefined){
          return alivedPaymentMethods[paymentMethod.adapter]
        } else {
          return undefined
        }
    }
  },

  beforeCreate: function (paymentMethod, next) {
    paymentMethod.id = uuid();
    next();
  },
    /**
     * Возвращает true если платежный метод является обещанием платежа
     * @param  paymentMethodId
     * @return 
     */
    async isPaymentPromise(paymentMethodId?: string): Promise<boolean> {
      var chekingPaymentMethod: PaymentMethod;
      
      if (!paymentMethodId) {
        chekingPaymentMethod = this;
      } else {
        chekingPaymentMethod = await PaymentMethod.findOne({id: paymentMethodId});
      }

      if (chekingPaymentMethod.type === 'promise'){
        return true;
      } 
      return false;
    },
  /**
 * Добавляет в список возможных к использованию платежные адаптеры при их старте.
 * Если  платежный метод не сушетсвует в базе то создает его
 * @param paymentMethod 
 * @return 
 */
  async alive(paymentAdapter: PaymentAdapter): Promise<string[]> {

    let knownPaymentMethod = await PaymentMethod.findOne({adapter: paymentAdapter.InitPaymentAdapter.adapter});
    if (!knownPaymentMethod) {
      knownPaymentMethod = await PaymentMethod.create(paymentAdapter.InitPaymentAdapter);
    }
    if (knownPaymentMethod.enable === true){
      alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter] = paymentAdapter;
    }
    sails.log.info("PaymentMethod > alive", knownPaymentMethod, alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter]);
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
              adapter: Object.keys(alivedPaymentMethods)
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
  async checkAvailable(paymentMethodId: string): Promise<boolean> {
    const chekingPaymentMethod = await PaymentMethod.findOne({id: paymentMethodId});

    if (!chekingPaymentMethod) {
      return false
    }

    if (chekingPaymentMethod.type !== 'promise' && 
    alivedPaymentMethods[chekingPaymentMethod.adapter] === undefined){
          return false
    } 

    if (chekingPaymentMethod.enable === true && 
        chekingPaymentMethod.type !== 'promise' && 
        alivedPaymentMethods[chekingPaymentMethod.adapter] !== undefined ){
          return true
    }


    if (chekingPaymentMethod.enable === true && 
      chekingPaymentMethod.type === 'promise' ){
        return true
    }
    return false
  },
    /**
   * Возвращает инстанс платежного адаптера по известному ID PaymentMethod
   * @param  paymentMethodId
   * @return PaymentAdapter
   * @throws 
   */
  async getAdapterById(paymentMethodId: string): Promise<PaymentAdapter> {
    
    const paymentMethod = await PaymentMethod.findOne({id: paymentMethodId});
    //@ts-ignore 
    
    if (await PaymentMethod.isPaymentPromise(paymentMethod.id)){
      return undefined
    }

    if (alivedPaymentMethods[paymentMethod.adapter]){
      sails.log.verbose("Core > PaymentMethod > getAdapterById", alivedPaymentMethods[paymentMethod.adapter]);
      return alivedPaymentMethods[paymentMethod.adapter]
    } else {
      console.log("undefined,undefined");
      return undefined
    }
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
  id: string;
  enable: boolean;
  title: string;
  type: string;
  adapter: string;
  order: number;
  description: string;
  /**
  * Возврашает екземпляр платежного адаптера от this или по названию адаптера
  */
  getAdapter(adapter?: string): Promise<PaymentAdapter>;


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
  alive(paymentMethod: PaymentAdapter): Promise<PaymentMethod[]>;

  /**
  * Возврашает доступные для оплаты платежные методы
  */
  getAvailable(): Promise<PaymentMethod[]>;
  
  /**
  * Проверяет платежную систему
  */
  checkAvailable(paymentMethodId: string): Promise<boolean>;
    
  /**
  * Возврашает екземпляр платежного адаптера по paymentMethodId
  */
  
  getAdapterById(paymentMethodId?: string)
  
    /**
  * Проверяет платежное обещание
  */
 isPaymentPromise(paymentMethodId?: string): Promise<boolean>;
}

declare global {
  const PaymentMethod: PaymentMethodModel;
}
