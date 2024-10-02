export declare const models: {
    user: {
        title: string;
        model: string;
        icon: string;
    };
    products: {
        model: string;
        title: string;
        icon: string;
        list: {
            fields: import("sails-adminpanel/interfaces/adminpanelConfig").FieldsModels;
        };
        edit: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
        add: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
    };
    groups: {
        model: string;
        title: string;
        icon: string;
        list: {
            fields: import("sails-adminpanel/interfaces/adminpanelConfig").FieldsModels;
        };
        edit: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
        add: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
    };
    orders: {
        model: string;
        title: string;
        icon: string;
    };
    bonusprogram: {
        model: string;
        title: string;
        icon: string;
    };
    userbonusprogram: {
        model: string;
        title: string;
        icon: string;
    };
    userbonustransaction: {
        model: string;
        title: string;
        icon: string;
    };
    promotions: {
        model: string;
        title: string;
        icon: string;
    };
    promotioncode: {
        model: string;
        title: string;
        icon: string;
    };
    place: {
        model: string;
        title: string;
        icon: string;
    };
    street: {
        model: string;
        title: string;
        icon: string;
    };
    paymentMethod: {
        model: string;
        title: string;
        icon: string;
    };
};
