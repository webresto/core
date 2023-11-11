export default {
  user: {
    title: "User",
    model: "user",
    icon: "user"
  },
  products: {
    model: 'dish',
    title: 'Products',
    icon: 'hamburger'
  },
  groups: {
    model: 'group',
    title: 'Groups',
    icon: 'folder'
  },
  orders: {
    model: 'order',
    title: 'Orders',
    icon: 'shopping-cart'
  },
  userbonusprogram: {
    model: 'userbonusprogram',
    title: 'User bonusprograms',
    icon: 'money-bill-wave-alt'
  },
  userbonustransaction: {
    model: 'userbonustransaction',
    title: 'Userbonus transactions',
    icon: 'exchange-alt'
  },
  settings: {
    title: "Settings",
    model: "settings",
    icon: "cog",
    fields: {
      id: false,
      key: "Key",
      description: "Description",
      value: "Value",
      section: "Section",
      createdAt: false,
      updatedAt: false,
    },

    list: {
      fields: {
        id: false,
        value: false,
      },
    },

    add: {
      fields: {
        value: {
          title: "Key",
          type: "json",
        },
      },
    },

    edit: {
      fields: {
        description: {
          title: "Описание",
          type: "longtext",
          disabled: true,
        },
        key: {
          disabled: true,
        },
        value: {
          title: "Description",
          type: "json",
        },
      },
    },
  },
};
