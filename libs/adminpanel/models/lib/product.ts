import { CreateUpdateConfig, FieldsModels } from "sails-adminpanel/interfaces/adminpanelConfig"

export class ProductConfig {
    public fields: FieldsModels;
    public static add(): CreateUpdateConfig  {
        return {}
    }

    public static edit(): CreateUpdateConfig {
        return {}
    }

    public static list(): {fields: FieldsModels} {
        return {
            fields: {}
        }
    }
}