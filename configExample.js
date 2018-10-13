/**
 * @api {Config} restocore.js Конфигурация
 * @apiName Config
 * @apiGroup Config
 * @apiDescription Описание конфигураций
 *
 * @apiParam {Number} timeSyncBalance Время цикла проверки стоп списка в секундах (например, каждые timeSyncBalance: 30 секунд)
 * @apiParam {Number} timeSyncMenu Время цикла синхронизации номенклатуры в секундах
 * @apiParam {Number} timeSyncStreets Время цикла синхронизации улиц в часах
 * @apiParam {Boolean} development Является ли приложение в разработке (позволяет образаться к /api/0.5/api/...)
 * @apiParam {String} masterKey Если приложение не в разработке, то для доступа к /api/0.5/api/... требуется этот параметр
 * @apiParam {String} city Название города, в котором находтся кафе
 * @apiParam {String} [defaultName] Имя пользоваьеля, что используется при проверки осуществляемости заказа
 * @apiParam {String} [defaultPhone] Телефон, аналогично предыдущему
 * @apiParam {JSON} iiko Параметры для сервера IIKO
 * @apiParam {JSON} [images] Параметр для обработки картинок.
 * Если его нет, то картнки от IIKO не обрабатываются вовсе.
 * В размерах один из параметров (width или height) обязательный.
 *
 * @apiParamExample iiko types
 *  {
 *    host: string,
 *    port: string,
 *    login: string,
 *    password: string,
 *    organization: string,
 *    deliveryTerminalId: string
 *  }
 * @apiParamExample iiko example
 *  {
 *    host: "iiko.biz",
 *    port: "9900",
 *    login: "Cafe",
 *    password: "ldfkgREKn456",
 *    organization: "e1c2da5e-810b-e1ef-0159-4ae27e1a299a",
 *    deliveryTerminalId: "e464c693-4a57-11e5-80c1-d8d385655247"
 *  }
 *
 * @apiParamExample image types
 *  {
 *    path: string,
 *    "name of size": {
 *      [width]: number,
 *      [height]: number
 *    },
 *    ...
 *  }
 *
 * @apiParamExample image example
 *  {
 *    path: "/images",
 *    small: {
 *      width: 200,
 *      height: 200
 *    },
 *    large: {
 *      width: 900
 *    },
 *    forPreview: {
 *      height: 500
 *    }
 *  }
 */

module.exports.restocore = {
  iiko: {
    host: "iiko.biz",
    port: "9900",
    login: "demoDelivery",
    password: "PI1yFaKFCGvvJKi",
    organization: "e464c693-4a57-11e5-80c1-d8d385655247",
    deliveryTerminalId: "e1c2da5e-810b-e1ef-0159-4ae27e1a299a"
  },
  timeSyncBalance: 30, // seconds
  timeSyncMenu: 15 * 60, // seconds
  timeSyncStreets: 12, // hours
  images: {
    path: '/images',
    small: {
      width: 200,
      height: 200
    },
    large: {
      width: 600
    }
  },
  development: true,
  masterKey: 'fUnQ34bJ'
};
