"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbsctractPublicDiscount = void 0;
class AbstractDiscount {
}
exports.default = AbstractDiscount;
class AbsctractPublicDiscount extends AbstractDiscount {
    constructor() {
        super(...arguments);
        this.isPublic = true;
    }
}
exports.AbsctractPublicDiscount = AbsctractPublicDiscount;
