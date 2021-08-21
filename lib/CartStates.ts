module.exports = {
  CART: {
    routeRules: async function (data, cb): Promise<string> {
      return "";
    },
    stateValidation: async function (data, cb): Promise<void> {
      cb();
    },
    inState: async function (data, cb): Promise<void> {
      cb();
    },
    afterState: async function (data, cb): Promise<void> {
      cb();
    }
  },
  CHECKOUT: {
    routeRules: async function (data, cb): Promise<string> {
      return "";
    },
    stateValidation: async function (data, cb): Promise<void> {
      cb();
    },
    inState: async function (data, cb): Promise<void> {
      cb();
    },
    afterState: async function (data, cb): Promise<void> {
      cb();
    }
  },
  PAYMENT: {
    routeRules: async function (data, cb): Promise<string> {
      return "";
    },
    stateValidation: async function (data, cb): Promise<void> {
      cb();
    },
    inState: async function (data, cb): Promise<void> {
      cb();
    },
    afterState: async function (data, cb): Promise<void> {
      cb();
    }
  },
  ORDER: {
    routeRules: async function (data, cb): Promise<string> {
      return "";
    },
    stateValidation: async function (data, cb): Promise<void> {
      cb();
    },
    inState: async function (data, cb): Promise<void> {
      cb();
    },
    afterState: async function (data, cb): Promise<void> {
      cb();
    }
  },
};
