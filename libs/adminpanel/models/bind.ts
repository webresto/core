import { GroupConfig } from "./lib/group";
import { ProductConfig } from "./lib/product";

export const models = {
  user: {
    title: "User",
    model: "user",
    icon: "person"
  },
  dish: {
    model: 'dish',
    title: 'Products',
    icon: 'restaurant_menu',
    list: ProductConfig.list(),
    edit: ProductConfig.edit(),
    add: ProductConfig.add(),
  },
  group: {
    model: 'group',
    title: 'Groups',
    icon: 'group',
    list: GroupConfig.list(),
    edit: GroupConfig.edit(),
    add: GroupConfig.add(),
  },
  order: {
    model: 'order',
    title: 'Orders',
    icon: 'shopping_cart'
  },
  bonusprogram: {
    model: 'bonusprogram',
    title: 'Bonus programs',
    icon: 'card_giftcard'
  },
  userbonusprogram: {
    model: 'userbonusprogram',
    title: 'User bonusprograms',
    icon: 'loyalty'
  },
  userbonustransaction: {
    model: 'userbonustransaction',
    title: 'Userbonus transactions',
    icon: 'swap_horiz'
  },
  promotion: {
    model: 'promotion',
    title: 'Promotions',
    icon: 'local_offer'
  },
  promotioncode: {
    model: 'promotioncode',
    title: 'Promotion codes',
    icon: 'confirmation_number'
  },
  place: {
    model: 'place',
    title: 'Places',
    icon: 'place'
  },
  street: {
    model: 'street',
    title: 'Street',
    icon: 'location_on'
  },
  paymentMethod: {
    model: 'paymentmethod',
    title: 'Payment method',
    icon: 'payment'
  },
  maintenance: {
    model: "maintenance",
    title: "Scheduled Maintenance on the Website",
    icon: "build",
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
  },
  settings: {
    title: "Settings",
    model: "settings",
    icon: "settings",
    fields: {
      id: false,
      key: "Key",
      name: "Name",
      description: "Description",
      tooltip: "Tooltip",
      value: "Value",
      defaultValue: "Default value",
      type: "Type",
      jsonSchema: "JSON Schema",
      readOnly: "Read only",
      uiSchema: "UI Schema",
      module: "Module",
      createdAt: false,
      updatedAt: false,
      isRequired: "Is required"
    },

    list: {
      fields: {
        id: false,
        defaultValue: false,
        description: false,
        tooltip: false,
        uiSchema: false,
        readOnly: false,
        isRequired: false,
        jsonSchema: false,
        type: false,
        value: {
          displayModifier(v) {
              sails.log.debug(v)
              if(typeof v === "object" && v !== null && Object.keys(v).length > 5) {
                return "long object"
              }
              return v
          },
        }
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
          title: "Value",
          type: "json",
        }
      }
    }
  }
};
