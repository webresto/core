import { CreateUpdateConfig, FieldsModels, MediaManagerOptionsField } from "sails-adminpanel/interfaces/adminpanelConfig"

export class ProductConfig {
    static fields: FieldsModels = {
        id: {
            title: "Id",
            disabled: true
        },
        rmsId: {
            title: "External Id",
            disabled: true
        },
        code: {
            title: "SKU (code)",
        },
        description: {
            title: "Description",
            type: "text"
        },
        ingredients: {
            title: "Ingredients"
        },
        carbohydrateAmount: {
            title: "Carbohydrate Amount (per unit volume)",
            tooltip: "The amount of carbohydrates per unit volume of the product."
        },
        carbohydrateFullAmount: {
            title: "Total Carbohydrate Amount",
            tooltip: "The total amount of carbohydrates in the entire product."
        },
        energyAmount: {
            title: "Energy Amount (per unit volume)",
            tooltip: "The amount of energy (calories) per unit volume of the product."
        },
        energyFullAmount: {
            title: "Total Energy Amount",
            tooltip: "The total amount of energy (calories) in the entire product."
        },
        fatAmount: {
            title: "Fat Amount (per unit volume)",
            tooltip: "The amount of fat per unit volume of the product."
        },
        fatFullAmount: {
            title: "Total Fat Amount",
            tooltip: "The total amount of fat in the entire product."
        },
        fiberAmount: {
            title: "Fiber Amount (per unit volume)",
            tooltip: "The amount of dietary fiber per unit volume of the product."
        },
        fiberFullAmount: {
            title: "Total Fiber Amount",
            tooltip: "The total amount of dietary fiber in the entire product."
        },
        proteinAmount: {
            title: "Protein Amount (per unit volume)",
            tooltip: "The amount of protein per unit volume of the product."
        },
        proteinFullAmount: {
            title: "Total Protein Amount",
            tooltip: "The total amount of protein in the entire product."
        },
        measureUnit: {
            title: "Measurement Unit",
            tooltip: "The unit of measurement for this value, ml, kg, pcs ... ."
        },
        type: {
            title: "Type",
            tooltip: "Dish, Service, Product, Modifier"
        },
        weight: {
            title: "weight",
            tooltip: "Weight is measured in grams 1000 = 1 kilogram"
        },
        sortOrder: {
            title: "Sorting order",
            tooltip: "Sorting is applied within a group"
        },    
        isDeleted: {
            title: "Is Deleted",
            tooltip: "Indicates whether the item is soft-deleted. If true, the item is not shown anywhere in the application and is considered removed."
        },
        isModifiable: {
            title: "Is Modifiable",
            tooltip: "Indicates whether the product or dish can be modified through the modifier system. If true, the item can be adjusted or customized based on available modifiers."
        },
        parentGroup: {
            title: "Parent Group",
            tooltip: "The group or category to which the dish belongs. This indicates the hierarchical relationship of the dish within its parent group or category."
        },
        tags: {
            title: "Tags",
            type: "json",
            tooltip: "A list of tags that can be applied to a dish or group. Tags help categorize and identify dishes based on attributes such as 'sweet', 'sour', 'salty', 'fried', 'boiled', 'hearty', 'fish', 'chicken', 'vegetarian', etc., making it easier to navigate the menu."
        },
        balance: {
            title: "Balance",
            tooltip: "Indicates the availability of the dish based on its balance. If the balance is 0, the dish is no longer available for sale. If the balance is -1, the dish is available for sale with no restrictions."
        },
        slug: {
            title: "Slug",
            tooltip: "A URL-friendly version of the dish's name. It is used to create a readable and unique identifier for the dish in the URL, typically consisting of lowercase letters, numbers, and hyphens."
        },
        hash: false,
        concept: {
            title: "Concept",
            tooltip: "The concept represents a broad category or section that distinguishes dishes and menus. It can be used to define different sections such as 'Burgers', 'Pizza', 'Kids Menu', or even separate restaurants operating under the same backend but with different frontends. Concepts can also be used to manage delivery from different regions, making it a versatile and abstract categorization tool."
        },
        visible: {
            title: "Visible",
            tooltip: "Indicates whether the dish is visible to users. If true, the dish will be displayed in the menu; if false, it will be hidden."
        },
        modifier: {
            title: "Modifier",
            tooltip: "Indicates whether the dish is a modifier. A modifier is a dish that can alter or customize other dishes, often used to add options or variations."
        },
        promo: {
            title: "Promo",
            tooltip: "Indicates whether the dish is part of a promotional offer. If true, the dish is featured as part of a special promotion or discount."
        },
        worktime: {
            title: "Work Time",
            tooltip: "Specifies the operational hours during which the dish is available. This can include specific time ranges or days when the dish is offered."
        },
        modifiers: {
            title: "Modifiers",
            tooltip: "A list of modifiers applicable to the dish. Modifiers allow customization or variations of the dish, such as extra toppings or ingredient changes."
        },
        images: {
            title: "Images",
            type: 'mediamanager',
            options: {
                id: "product",
                convert: 'image/jpeg', // only 'image/webp' or 'image/jpeg'
                sizes: [
                    {
                        lg: {
                            width: 750,
                            height: 750
                        }
                    },
                    {
                        sm: {
                            width: 350,
                            height: 350
                        }
                    },
                ]
            } as MediaManagerOptionsField,
            tooltip: "A list of images associated with the dish. These images are used to visually represent the dish and can be selected for display in the menu."
        },
        favorites: false,
        recommendations: {
            title: "Recommendations",
            tooltip: "A list of dishes recommended based on this dish. It helps suggest similar or complementary items to users."
        },
        recommendedBy: {
            title: "Recommended By",
            tooltip: "A self-referential link that connects this dish to other dishes as recommendations. It indicates that this dish recommends or is recommended by others."
        },
        recommendedForGroup: {
            title: "Recommended for group",
            tooltip: "A group link that connects this dish to group as recommendations. It indicates that this dish recommends or is recommended by others."
        },
        customData: {
            title: "Custom Data",
            tooltip: "Additional fields or data that can be set by modules or custom configurations. This allows for flexible extensions and metadata specific to the dish."
        }
    };
    public static add(): CreateUpdateConfig  {
        return { fields: this.fields };
    }

    public static edit(): CreateUpdateConfig {
        return { fields: this.fields };
    }

    public static list(): {fields: FieldsModels} {
        return {
            fields: {}
        }
    }
}