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

export const models = {
  Customer: {
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
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: { title: 'Phone verified', disabled: true },
        primaryPhone: false,
        identities: false,
        allRequiredCustomFieldsAreFilled: true,
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
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: { title: 'Phone verified', disabled: true },
        primaryPhone: false,
        identities: false,
        allRequiredCustomFieldsAreFilled: true,
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
  UserNotification: {
    model: "notification",
    title: "Notifications",
    icon: "notifications",
    list: NotificationConfig.list(),
    edit: NotificationConfig.edit(),
    remove: false,
  },
  AuthMethod: {
    model: "authmethod",
    title: "Sign-in methods",
    icon: "key",
    // Rows are created by the modules themselves (AuthMethod.alive on boot), never by hand: a
    // row without a live adapter behind it is a button that cannot do anything.
    add: false,
    remove: false,
    list: {
      fields: {
        adapter: true,
        offer: true,
        kind: true,
        enable: true,
        sortOrder: true,
        healthStatus: true,
        cost: true,
        requirePhoneVerification: true,
      },
    },
    edit: {
      fields: {
        // ── declared by the adapter's code; shown so the operator can see what a row IS,
        //    read-only because it is a property of the protocol, not a business decision (И4).
        //    `canVerifyPhone` in particular: as an editable checkbox it would let an operator
        //    silently open account takeover by ticking it on a provider that proves nothing —
        //    which is exactly what the old `trustProviderPhone` did (design2 §4.1).
        adapter: { title: 'Adapter', disabled: true },
        offer: { title: 'Offer', disabled: true },
        kind: { title: 'Kind', disabled: true },
        flow: { title: 'Flow', disabled: true },
        mode: { title: 'Mode', disabled: true },
        secretOrigin: { title: 'Secret origin', disabled: true },
        codeLength: { title: 'Code length', disabled: true },
        canVerifyPhone: { title: 'Provider verifies the phone', disabled: true },
        providerModule: { title: 'Module', disabled: true },
        healthStatus: { title: 'Health', disabled: true },

        // ── business decisions: the operator owns these
        enable: true,
        sortOrder: true,
        titleKey: true,
        hintKey: true,
        iconUrl: true,
        buttonColor: true,
        buttonTextColor: true,
        purposes: true,
        countries: true,
        salesChannels: true,
        // Both are per-row overrides of the global OTP settings; empty/0 = inherit
        // (AuthService.resendIntervalSec / applyMethod).
        ttlSec: { title: 'Code TTL, sec (0 — global default)' },
        resendAfterSec: { title: 'Pause between sends, sec (0 — global default)' },
        cost: true,
        requirePhoneVerification: true,
        maxPerUser: true,

        // `config` holds client secrets and bot tokens. The generic model CRUD prints every
        // column as-is, so it is never rendered here — same reasoning as the `settings` model
        // below.
        config: false,
        customData: false,
        createdAt: false,
        updatedAt: false,
      },
    },
  },
  // The `settings` model is deliberately NOT bound here. Settings are edited through
  // the dedicated Settings Manager page (hook/bindAdminpanel.ts → /settings-manager),
  // which is the only UI that honours the model's `secret` flag: the generic model CRUD
  // renders every column as-is and would print tokens/passwords in the list, and its
  // per-field displayModifier receives only the value, never the row, so a secret row
  // cannot be masked there.
};
