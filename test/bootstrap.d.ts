import "mocha";
declare global {
    namespace NodeJS {
        interface Global {
            sails: any;
        }
    }
}
