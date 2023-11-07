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
    title: 'Группы',
    icon: 'folder'
  },
  orders: {
    model: 'order',
    title: 'Заказы',
    icon: 'shopping-cart'
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
