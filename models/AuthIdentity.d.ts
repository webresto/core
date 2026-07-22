import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import { Phone } from "./User";
/**
 * The fact "external account X at provider P belongs to User U".
 * Logical unique key: (provider, externalId). One User may have many identities
 * (telegram + max + vk). Enables repeat login, multi-provider linking and takeover protection.
 */
declare let attributes: {
    id: string;
    /** slug (== AuthProvider.adapter) */
    provider: string;
    /** sub / uid / telegram id / max id — stable at the provider */
    externalId: string;
    user: UserRecord | string;
    /** Denormalized profile snapshot (NOT the source of truth) */
    email: string;
    phone: Phone;
    displayName: string;
    avatarUrl: string;
    /**
     * Provider tokens, if needed for repeat calls. Encrypt at rest.
     * { accessToken, refreshToken, expiresAt }
     */
    tokens: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
    };
    lastLoginAt: number;
};
type attributes = typeof attributes;
export interface AuthIdentityRecord extends RequiredField<OptionalAll<attributes>, "provider" | "externalId">, ORM {
}
declare let Model: {
    beforeCreate: (record: AuthIdentityRecord, cb: (err?: string) => void) => void;
    /** Find an identity by the logical unique key. */
    findByExternal(provider: string, externalId: string): Promise<AuthIdentityRecord | undefined>;
};
declare global {
    const AuthIdentity: typeof Model & ORMModel<AuthIdentityRecord, "provider" | "externalId">;
}
export {};
