export declare const models: {
    user: {
        title: string;
        model: string;
        icon: string;
    };
    dish: {
        model: string;
        title: string;
        icon: string;
        list: {
            fields: import("sails-adminpanel/interfaces/adminpanelConfig").FieldsModels;
        };
        edit: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
        add: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
    };
    group: {
        model: string;
        title: string;
        icon: string;
        list: {
            fields: import("sails-adminpanel/interfaces/adminpanelConfig").FieldsModels;
        };
        edit: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
        add: import("sails-adminpanel/interfaces/adminpanelConfig").CreateUpdateConfig;
    };
    order: {
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
    promotion: {
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
    settings: {
        title: string;
        model: string;
        icon: string;
        fields: {
            id: boolean;
            key: string;
            name: string;
            description: string;
            tooltip: string;
            value: string;
            defaultValue: string;
            type: string;
            jsonSchema: string;
            readOnly: string;
            uiSchema: string;
            module: string;
            createdAt: boolean;
            updatedAt: boolean;
            isRequired: string;
        };
        list: {
            fields: {
                id: boolean;
                defaultValue: boolean;
                description: boolean;
                tooltip: boolean;
                uiSchema: boolean;
                readOnly: boolean;
                isRequired: boolean;
                jsonSchema: boolean;
                type: boolean;
                value: {
                    displayModifier(v: any): any;
                };
            };
        };
        add: {
            fields: {
                value: {
                    title: string;
                    type: string;
                };
            };
        };
        edit: {
            fields: {
                description: {
                    title: string;
                    type: string;
                    disabled: boolean;
                };
                key: {
                    disabled: boolean;
                };
                value: {
                    title: string;
                    type: string;
                };
            };
        };
    };
};
