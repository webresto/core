import { CreateUpdateConfig, FieldsModels } from "sails-adminpanel/interfaces/adminpanelConfig";
export declare class ProductConfig {
    static fields: FieldsModels;
    static add(): CreateUpdateConfig;
    static edit(): CreateUpdateConfig;
    static list(): {
        fields: FieldsModels;
    };
}
