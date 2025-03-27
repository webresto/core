import { GroupConfig } from "./lib/group";
import { ProductConfig } from "./lib/product";

export const models = {
  user: {
    title: "User",
    model: "user",
    icon: "user"
  },
  products: {
    model: 'dish',
    title: 'Products',
    icon: 'hamburger',
    list: ProductConfig.list(),
    edit: ProductConfig.edit(),
    add: ProductConfig.add(),
  },
  groups: {
    model: 'group',
    title: 'Groups',
    icon: 'folder',
    list: GroupConfig.list(),
    edit: GroupConfig.edit(),
    add: GroupConfig.add(),
  },
  orders: {
    model: 'order',
    title: 'Orders',
    icon: 'shopping-cart'
  },
  bonusprogram: {
    model: 'bonusprogram',
    title: 'Bonus programs',
    icon: 'comments-dollar'
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
  promotions: {
    model: 'promotion',
    title: 'Promotions',
    icon: 'gift'
  },
  promotioncode: {
    model: 'promotioncode',
    title: 'Promotion codes',
    icon: 'qrcode'
  },
  place: {
    model: 'place',
    title: 'Places',
    icon: 'store'
  },
  street: {
    model: 'street',
    title: 'Street',
    icon: 'road'
  },
  paymentMethod: {
    model: 'paymentmethod',
    title: 'Payment method',
    icon: 'credit-card'
  },
  maintenance: {
    model: "maintenance",
    title: "Scheduled Maintenance on the Website",
    icon: "pause",
    fields: {
      id: false,
      createdAt: false,
      updatedAt: false,
      title: "Title",
      description: "Description",
      enable: "Active",
      startDate: "Start Time",
      stopDate: "End Time"
    },
    edit: {
      fields: {
        id: false,
        createdAt: false,
        updatedAt: false,
        title: "Title",
        description: {
          title: "Description",
          type: "json",
          widget: "Ace",
          Ace: {
            height: 500,
            fontSize: 15
          }
        },
        enable: "Active",
        startDate: "Start Time",
        stopDate: "End Time"
      }
    },
    add: {
      fields: {
        id: false,
        createdAt: false,
        updatedAt: false,
        title: "Title",
        description: {
          title: "Description",
          type: "json",
          widget: "Ace",
          Ace: {
            height: 500,
            fontSize: 15
          }
        },
        enable: "Active",
        startDate: "Start Time",
        stopDate: "End Time"
      }
    }
  }
};
