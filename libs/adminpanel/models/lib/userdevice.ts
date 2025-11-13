import { CreateUpdateConfig, FieldsModels } from "sails-adminpanel/interfaces/adminpanelConfig";

export class UserDeviceConfig {
    static fields: FieldsModels = {
        id: {
            title: "ID",
            disabled: true
        },
        name: {
            title: "Name",
            tooltip: "Generated name from OS type and location"
        },
        userAgent: {
            title: "User Agent",
            tooltip: "Browser or device user agent string"
        },
        isLoggedIn: {
            title: "Is Logged In",
            tooltip: "Indicates if the device is currently logged in"
        },
        user: {
            title: "User",
            tooltip: "Associated user"
        },
        lastIP: {
            title: "Last IP",
            tooltip: "Last known IP address"
        },
        loginTime: {
            title: "Login Time",
            tooltip: "Timestamp of login",
            type: "number"
        },
        lastActivity: {
            title: "Last Activity",
            tooltip: "Timestamp of last activity",
            type: "number"
        },
        sessionId: {
            title: "Session ID",
            tooltip: "Session identifier (not JWT token)"
        },
        customData: {
            title: "Custom Data",
            type: "json",
            tooltip: "Additional custom data"
        },
        createdAt: false,
        updatedAt: false
    };

    public static add(): CreateUpdateConfig {
        return { fields: this.fields };
    }

    public static edit(): CreateUpdateConfig {
        return { fields: this.fields };
    }

    public static list(): { fields: FieldsModels } {
        return { fields: this.fields };
    }
}