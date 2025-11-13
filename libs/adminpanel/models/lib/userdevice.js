"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDeviceConfig = void 0;
class UserDeviceConfig {
    static add() {
        return { fields: this.fields };
    }
    static edit() {
        return { fields: this.fields };
    }
    static list() {
        return { fields: this.fields };
    }
}
exports.UserDeviceConfig = UserDeviceConfig;
UserDeviceConfig.fields = {
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
