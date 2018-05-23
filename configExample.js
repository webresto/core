module.exports.webcore = {
  prefix: "",
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
