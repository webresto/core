/// <reference path="../interfaces/globalTypes.d.ts" />
import "mocha";
declare global {
    namespace NodeJS {
        interface Global {
            sails: any;
        }
    }
}
