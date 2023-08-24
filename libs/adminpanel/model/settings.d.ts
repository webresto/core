declare const _default: {
    settings: {
        title: string;
        model: string;
        icon: string;
        fields: {
            id: boolean;
            key: string;
            description: string;
            value: string;
            section: string;
            createdAt: boolean;
            updatedAt: boolean;
        };
        list: {
            fields: {
                id: boolean;
                value: boolean;
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
export default _default;
