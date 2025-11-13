import { CreateUpdateConfig, FieldsModels } from "sails-adminpanel/interfaces/adminpanelConfig";
export declare class GroupConfig {
    static fields: FieldsModels;
    static add(): CreateUpdateConfig;
    static edit(): CreateUpdateConfig;
    static list(): {
        fields: FieldsModels;
    };
}
