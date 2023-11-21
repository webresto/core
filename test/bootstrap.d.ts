/// <reference types="@webresto/core/interfaces/globaltypes" />
import "mocha";
declare global {
    namespace NodeJS {
        interface Global {
            sails: any;
        }
    }
}
