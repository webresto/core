import { CreateUpdateConfig, FieldsModels, ModelFieldConfig } from "sails-adminpanel/interfaces/adminpanelConfig";
type AdminizerModelConfig = Record<string, ModelFieldConfig>;
export declare class GroupConfig {
    static fields: AdminizerModelConfig;
    static add(): CreateUpdateConfig;
    static edit(): CreateUpdateConfig;
    static list(): {
        fields: FieldsModels;
    };
}
export {};
