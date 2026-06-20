import { GroupConfig } from "./lib/group";
import { ProductConfig } from "./lib/product";
import { OrderConfig } from "./lib/order";
import { NotificationConfig } from "./lib/notification";
import { summarizeWorktime } from "../controls/worktimeViewerHelper";

// Shared worktime field config: clean editable schedule editor in edit/add,
// compact text summary in list. The custom "worktime-viewer" control renders
// the editor; the list keeps a read-only summary.
const worktimeEditField = {
  title: "Work Time",
  type: "json",
  tooltip: "Operating hours schedule.",
  options: {
    name: "worktime-viewer",
  },
};
const worktimeListField = {
  title: "Work Time",
  displayModifier(value: unknown) {
    return summarizeWorktime(value);
  },
};

export const models = {
  user: {
    title: "User",
    model: "user",
    icon: "person",
    fields: {
      history: false,
      locations: false,
      devices: false,
      favorites: false,
      bonusProgram: false,
    },
    list: {
      fields: {
        id: true,
        login: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        verified: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        history: false,
        locations: false,
        devices: false,
        favorites: false,
        bonusProgram: false,
      }
    },
    edit: {
      fields: {
        id: false,
        login: true,
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: true,
        allRequiredCustomFieldsAreFilled: true,
        passwordHash: false,
        lastPasswordChange: false,
        temporaryCode: false,
        orderCount: true,
        isDeleted: true,
        customFields: true,
        customData: true,
        createdAt: false,
        updatedAt: false,
        history: false,
        locations: false,
        devices: false,
        favorites: false,
        bonusProgram: false,
      }
    },
    add: {
      fields: {
        id: false,
        login: true,
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: true,
        allRequiredCustomFieldsAreFilled: true,
        passwordHash: false,
        lastPasswordChange: false,
        temporaryCode: false,
        orderCount: false,
        isDeleted: true,
        customFields: true,
        customData: true,
        createdAt: false,
        updatedAt: false,
        history: false,
        locations: false,
        devices: false,
        favorites: false,
        bonusProgram: false,
      }
    }
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
    icon: 'shopping_cart',
    list: OrderConfig.list(),
    edit: OrderConfig.edit(),
  },
  userdevice: {
    model: 'userdevice',
    title: 'User Devices',
    icon: 'devices',
    remove: false,
    list: {
      fields: {
        id: true,
        name: true,
        userAgent: true,
        isLoggedIn: true,
        user: true,
        lastIP: true,
        loginTime: {
          title: 'Login Time',
          displayModifier(v: any) {
            return v ? new Date(v).toLocaleString() : '';
          }
        },
        lastActivity: {
          title: 'Last Activity',
          displayModifier(v: any) {
            return v ? new Date(v).toLocaleString() : '';
          }
        },
        sessionId: false,
        customData: false,
        notificationToken: false,
        createdAt: true,
        updatedAt: false,
      }
    },
    edit: {
      fields: {
        id: { disabled: true },
        name: true,
        userAgent: true,
        isLoggedIn: true,
        user: true,
        lastIP: true,
        loginTime: { title: 'Login Time', disabled: true },
        lastActivity: { title: 'Last Activity', disabled: true },
        sessionId: false,
        customData: { title: 'Custom Data', type: 'json', disabled: true },
        notificationToken: { title: 'Notification Token', type: 'json', disabled: true },
        createdAt: false,
        updatedAt: false,
      }
    },
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
  // Promotion & PromotionCode bare CRUD pages are replaced by the Marketing module
  // (Promo codes + Promotions), registered in hook/bindAdminpanel.ts.
  place: {
    model: 'place',
    title: 'Places',
    icon: 'place',
    list: {
      fields: {
        worktime: worktimeListField,
      }
    },
    edit: {
      fields: {
        worktime: worktimeEditField,
      }
    },
    add: {
      fields: {
        worktime: worktimeEditField,
      }
    },
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
  mediafile: {
    model: 'mediafile',
    title: 'Media Files',
    icon: 'image',
    list: {
      fields: {
        id: true,
        type: true,
        original: true,
        createdAt: true
      }
    }
  },
  notification: {
    model: "notification",
    title: "Notifications",
    icon: "notifications",
    list: NotificationConfig.list(),
    edit: NotificationConfig.edit(),
    remove: false,
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
          displayModifier(v: any) {
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
