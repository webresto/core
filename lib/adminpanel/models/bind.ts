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

// A dish with variants (`interfaces/Variants.ts`): the "variants-editor" custom control holds the
// attributes and the list of variants in add/edit; the list shows how many variants a dish has.
const variantsEditField = {
  title: "Variants",
  type: "json",
  tooltip: "A size, a crust, a number of pieces: each combination is a variant with its own price, stock and pictures.",
  options: {
    name: "variants-editor",
  },
};
const variantsListField = {
  title: "Variants",
  displayModifier(value: any) {
    return value?.mappings?.length ? String(value.mappings.length) : "";
  },
};

/**
 * The form of one variant: what a variant has of its own. The name is built of the box and of the
 * values; the group, the hours, the tags, the modifiers and the rest of what a variant shares come
 * from the box at each save of it; the page and its SEO are the box's - none of those is here.
 * Adminizer shows every attribute of a model it is not told to hide, hence the full list.
 */
function variantFormFields() {
  const product: Record<string, any> = ProductConfig.fields;
  const hidden = Object.fromEntries(
    [...Object.keys(require("../../../models/Dish").attributes), "createdAt", "updatedAt"].map((key) => [key, hiddenField]),
  );
  const own = [
    "weight", "description", "images",
    "energyAmount", "energyFullAmount", "proteinAmount", "proteinFullAmount", "fatAmount", "fatFullAmount",
    "carbohydrateAmount", "carbohydrateFullAmount", "fiberAmount", "fiberFullAmount",
  ];
  return {
    ...hidden,
    name: { title: "Name", disabled: true, tooltip: "Built of the name of the dish and of the values of the variant." },
    price: { title: "Price" },
    enable: { title: "Enable", tooltip: "Switched off, the variant cannot be chosen; the dish stays in the menu with its other variants." },
    ...Object.fromEntries(own.map((key) => [key, product[key]])),
  };
}

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
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: { title: 'Phone verified', disabled: true },
        primaryPhone: hiddenField,
        allRequiredCustomFieldsAreFilled: true,
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
        firstName: true,
        lastName: true,
        sex: true,
        email: true,
        phone: true,
        birthday: true,
        verified: { title: 'Phone verified', disabled: true },
        primaryPhone: hiddenField,
        allRequiredCustomFieldsAreFilled: true,
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
    // `DishVariant` below is a second page over the same model.
    primary: true,
    title: 'Products',
    icon: 'restaurant_menu',
    list: {
      ...ProductConfig.list(),
      fields: {
        ...ProductConfig.list().fields,
        tags: tagsListField,
        variants: variantsListField,
        parentId: hiddenField,
      },
    },
    edit: {
      ...ProductConfig.edit(),
      fields: {
        ...ProductConfig.edit().fields,
        worktime: worktimeEditField,
        modifiers: modifiersEditField,
        tags: tagsEditField,
        variants: variantsEditField,
      },
    },
    add: {
      ...ProductConfig.add(),
      fields: {
        ...ProductConfig.add().fields,
        worktime: worktimeEditField,
        modifiers: modifiersEditField,
        tags: tagsEditField,
        variants: variantsEditField,
      },
    },
  },
  // The short form of a variant of a dish (`interfaces/Variants.ts`), opened from the "Variants"
  // control of its box in a side panel. The same model: a variant is a dish. Not in the
  // navigation, no list, no adding and no deleting - the save of the box makes and deletes its
  // variants.
  DishVariant: {
    model: 'dish',
    title: 'Variant of a product',
    navbar: { visible: false },
    list: false,
    add: false,
    remove: false,
    edit: { fields: variantFormFields() },
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
  address: {
    model: 'address',
    title: 'Addresses',
    icon: 'location_on',
    fields: {
      // A house a geocoder found, kept so it is not paid for twice: the operator
      // tells it from ours here and deletes a wrong one like any row.
      cache: 'Found by a geocoder',
    },
    list: {
      // The catalog arrives by the thousand, so the list toolbar carries the
      // way to load one. Adminizer's global list actions are links, so the
      // button goes to a form — the `addresses` module route, which also asks
      // which city the file describes (the list shows every city at once).
      actions: {
        global: [
          {
            id: 'addresses-upload',
            title: 'Addresses from a file',
            link: `${sails.config.adminpanel.routePrefix}/addresses-upload`,
            type: 'self',
            icon: 'upload_file',
            accessRightsToken: 'addresses-manage',
          },
        ],
      },
    },
  },
  // A city is what an address is resolved in, what a zone belongs to and what a
  // map link is pasted for; none of that could be reached without one.
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
