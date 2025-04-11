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
    maintenance: {
        model: string;
        title: string;
        icon: string;
        fields: {
            id: boolean;
            createdAt: boolean;
            updatedAt: boolean;
            title: string;
            description: string;
            enable: string;
            startDate: string;
            stopDate: string;
        };
        edit: {
            fields: {
                id: boolean;
                createdAt: boolean;
                updatedAt: boolean;
                title: string;
                description: {
                    title: string;
                    type: string;
                    widget: string;
                    Ace: {
                        height: number;
                        fontSize: number;
                    };
                };
                enable: string;
                startDate: string;
                stopDate: string;
            };
        };
        add: {
            fields: {
                id: boolean;
                createdAt: boolean;
                updatedAt: boolean;
                title: string;
                description: {
                    title: string;
                    type: string;
                    widget: string;
                    Ace: {
                        height: number;
                        fontSize: number;
                    };
                };
                enable: string;
                startDate: string;
                stopDate: string;
            };
        };
    };
};
