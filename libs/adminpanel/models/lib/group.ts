import { CreateUpdateConfig, FieldsModels, MediaManagerOptionsField } from "sails-adminpanel/interfaces/adminpanelConfig";

export class GroupConfig {
    static fields: FieldsModels = {
        id: {
            title: "Id",
            disabled: true
        },
        rmsId: {
            title: "External ID",
            disabled: true
        },
        additionalInfo: {
            title: "Additional Info",
            type: "text",
            tooltip: "Any additional information about the group."
        },
        code: {
            title: "Code",
            tooltip: "The code or SKU for this group."
        },
        description: {
            title: "Description",
            type: "text",
            tooltip: "A brief description of the group."
        },
        isDeleted: {
            title: "Is Deleted",
            tooltip: "Indicates if the group is soft-deleted."
        },
        name: {
            title: "Name",
            tooltip: "The name of the group or dish category."
        },
        seoDescription: {
            title: "SEO Description",
            tooltip: "Description for SEO purposes."
        },
        seoKeywords: {
            title: "SEO Keywords",
            tooltip: "Keywords for SEO purposes."
        },
        seoText: {
            title: "SEO Text",
            tooltip: "SEO-optimized content related to the group."
        },
        seoTitle: {
            title: "SEO Title",
            tooltip: "Title for SEO purposes."
        },
        sortOrder: {
            title: "Sort Order",
            tooltip: "Order in which this group appears."
        },
        dishes: {
            title: "Dishes",
            tooltip: "A collection of dishes belonging to this group."
        },
        parentGroup: {
            title: "Parent Group",
            tooltip: "The parent group of this group."
        },
        childGroups: {
            title: "Child Groups",
            tooltip: "Subgroups or subcategories under this group."
        },
        recommendations: {
            title: "Recommendations",
            tooltip: "Recommended groups based on this group."
        },
        recommendedBy: {
            title: "Recommended By",
            tooltip: "Groups that recommend this group."
        },

        recommendedDishes: {
            title: "Recommended dishes",
            tooltip: "Dishes to recommend for this group."
        },

        icon: {
            title: "Icon",
            tooltip: "An icon representing the group."
        },
        images: {
            title: "Images",
            type: "mediamanager",
            options: {
                id: "product",
                convert: 'image/jpeg',
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
                    }
                ]
            } as MediaManagerOptionsField,
            tooltip: "Images associated with this group."
        },
        dishesPlaceholder: {
            title: "Dishes Placeholder",
            tooltip: "A placeholder image for dishes in this group."
        },
        slug: {
            title: "Slug",
            tooltip: "URL-friendly identifier for the group."
        },
        concept: {
            title: "Concept",
            tooltip: "The concept under which the group operates."
        },
        visible: {
            title: "Visible",
            tooltip: "Indicates if the group is visible."
        },
        modifier: {
            title: "Modifier",
            tooltip: "Indicates if the group contains modifiers."
        },
        promo: {
            title: "Promo",
            tooltip: "Indicates if this group is part of a promotion."
        },
        worktime: {
            title: "Work Time",
            type: "json",
            tooltip: "The operational hours for the group."
        },
        customData: {
            title: "Custom Data",
            type: "json",
            tooltip: "Custom data for this group."
        }
    };

    public static add(): CreateUpdateConfig {
        return { fields: this.fields };
    }

    public static edit(): CreateUpdateConfig {
        return { fields: this.fields };
    }

    public static list(): { fields: FieldsModels } {
        return {
            fields: {}
        };
    }
}
