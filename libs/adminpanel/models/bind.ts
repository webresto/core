import { GroupConfig } from "./lib/group";
import { ProductConfig } from "./lib/product";
import { OrderConfig } from "./lib/order";
import { NotificationConfig } from "./lib/notification";
import { summarizeWorktime } from "../controls/worktimeViewerHelper";
import { summarizeModifiers } from "../controls/modifiersEditorHelper";
import { summarizeTags } from "../controls/tagsEditorHelper";

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

// Shared modifiers field config: the "modifiers-editor" custom control renders a
// two-level form (groups → options) in add/edit; the list shows a compact summary.
const modifiersEditField = {
  title: "Modifiers",
  type: "json",
  tooltip: "Dish modifiers: groups of modifier options with min/max/required rules.",
  options: {
    name: "modifiers-editor",
  },
};
const modifiersListField = {
  title: "Modifiers",
  displayModifier(value: unknown) {
    return summarizeModifiers(value);
  },
};

// Shared tags field config: the "tags-editor" custom control renders a chips input
// with autocomplete of existing catalog tags in add/edit; the list shows the names.
const tagsEditField = {
  title: "Tags",
  type: "json",
  tooltip: "Free-form labels for filtering (vegetarian, spicy, ...).",
  options: {
    name: "tags-editor",
  },
};
const tagsListField = {
  title: "Tags",
  displayModifier(value: unknown) {
    return summarizeTags(value);
  },
};

// Adminizer v5 accepts object field configs only. Keep technical fields out of
// CRUD screens.
const hiddenField = { visible: false };

export const models = {
  Customer: {
    title: "Customers",
    model: "user",
    icon: "person",
    fields: {
      history: hiddenField,
      locations: hiddenField,
      devices: hiddenField,
      favorites: hiddenField,
      bonusProgram: hiddenField,
      identities: hiddenField,
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
        history: hiddenField,
        locations: hiddenField,
        devices: hiddenField,
        favorites: hiddenField,
        bonusProgram: hiddenField,
        identities: hiddenField,
      }
    },
    edit: {
      fields: {
        id: hiddenField,
        login: true,
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: true,
        allRequiredCustomFieldsAreFilled: true,
        passwordHash: hiddenField,
        lastPasswordChange: hiddenField,
        temporaryCode: hiddenField,
        orderCount: true,
        isDeleted: true,
        customFields: true,
        customData: true,
        createdAt: hiddenField,
        updatedAt: hiddenField,
        history: hiddenField,
        locations: hiddenField,
        devices: hiddenField,
        favorites: hiddenField,
        bonusProgram: hiddenField,
        identities: hiddenField,
      }
    },
    add: {
      fields: {
        id: hiddenField,
        login: true,
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: true,
        allRequiredCustomFieldsAreFilled: true,
        passwordHash: hiddenField,
        lastPasswordChange: hiddenField,
        temporaryCode: hiddenField,
        orderCount: hiddenField,
        isDeleted: true,
        customFields: true,
        customData: true,
        createdAt: hiddenField,
        updatedAt: hiddenField,
        history: hiddenField,
        locations: hiddenField,
        devices: hiddenField,
        favorites: hiddenField,
        bonusProgram: hiddenField,
        identities: hiddenField,
      }
    }
  },
  dish: {
    model: 'dish',
    title: 'Products',
    icon: 'restaurant_menu',
    list: {
      ...ProductConfig.list(),
      fields: {
        ...ProductConfig.list().fields,
        tags: tagsListField,
      },
    },
    edit: {
      ...ProductConfig.edit(),
      fields: {
        ...ProductConfig.edit().fields,
        worktime: worktimeEditField,
        modifiers: modifiersEditField,
        tags: tagsEditField,
      },
    },
    add: {
      ...ProductConfig.add(),
      fields: {
        ...ProductConfig.add().fields,
        worktime: worktimeEditField,
        modifiers: modifiersEditField,
        tags: tagsEditField,
      },
    },
  },
  DishGroup: {
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
        sessionId: hiddenField,
        customData: hiddenField,
        notificationToken: hiddenField,
        createdAt: true,
        updatedAt: hiddenField,
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
        sessionId: hiddenField,
        customData: { title: 'Custom Data', type: 'json', disabled: true },
        notificationToken: { title: 'Notification Token', type: 'json', disabled: true },
        createdAt: hiddenField,
        updatedAt: hiddenField,
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
  // These models are relation targets of Customer's technical fields. Adminizer
  // resolves associations before it applies `visible: false`, so register them
  // without exposing standalone CRUD items in the navigation.
  CustomerOrderHistory: {
    model: 'userorderhistory',
    title: 'Customer order history',
    navbar: { visible: false },
  },
  CustomerLocation: {
    model: 'userlocation',
    title: 'Customer locations',
    navbar: { visible: false },
  },
  ExternalIdentity: {
    model: 'authidentity',
    title: 'External identities',
    navbar: { visible: false },
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
  // Registered as Street's relation target first, and hidden on that basis. It
  // has its own page now: a city is what an address is resolved in, what a zone
  // belongs to and what a map link is pasted for — and none of that could be
  // reached without one.
  city: {
    model: 'city',
    title: 'Cities',
    icon: 'location_city',
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
      id: hiddenField,
      createdAt: hiddenField,
      updatedAt: hiddenField,
      title: "Title",
      description: "Description",
      enable: "Active",
      startDate: "Start Time",
      stopDate: "End Time"
    },
    edit: {
      fields: {
        id: hiddenField,
        createdAt: hiddenField,
        updatedAt: hiddenField,
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
        id: hiddenField,
        createdAt: hiddenField,
        updatedAt: hiddenField,
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
  CustomerNotification: {
    model: "notification",
    title: "Notifications",
    icon: "notifications",
    list: NotificationConfig.list(),
    edit: NotificationConfig.edit(),
    remove: false,
  },
  // The `settings` model is deliberately NOT bound here. Settings are edited through
  // the dedicated Settings Manager page (hook/bindAdminpanel.ts → /settings-manager),
  // which is the only UI that honours the model's `secret` flag: the generic model CRUD
  // renders every column as-is and would print tokens/passwords in the list, and its
  // per-field displayModifier receives only the value, never the row, so a secret row
  // cannot be masked there.
};
