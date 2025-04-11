"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ProductModifier_1 = require("../../../libs/ProductModifier");
describe('ProductModifier', () => {
    const childModifiers = [
        { id: 'm1', modifierId: 'mod1' },
        { id: 'm2', modifierId: 'mod2' },
    ];
    const group = {
        id: 'g1',
        childModifiers,
        minAmount: 1,
        maxAmount: 2,
        modifierId: ''
    };
    it('is valid when one modifier is selected', () => {
        const order = [{ id: 'm1', amount: 1 }];
        const validator = new ProductModifier_1.ProductModifier([group]);
        (0, chai_1.expect)(() => validator.validate(order)).not.to.throw();
    });
    it('is valid when two modifiers are selected', () => {
        const order = [
            { id: 'm1', amount: 1 },
            { id: 'm2', amount: 1 },
        ];
        const validator = new ProductModifier_1.ProductModifier([group]);
        (0, chai_1.expect)(() => validator.validate(order)).not.to.throw();
    });
    it('is invalid when no modifiers are selected', () => {
        const order = [];
        const validator = new ProductModifier_1.ProductModifier([group]);
        (0, chai_1.expect)(() => validator.validate(order)).to.throw(/minimum/i);
    });
    it('is invalid when maxAmount is exceeded', () => {
        const order = [
            { id: 'm1', amount: 2 },
            { id: 'm2', amount: 1 },
        ];
        const validator = new ProductModifier_1.ProductModifier([group]);
        (0, chai_1.expect)(() => validator.validate(order)).to.throw(/maximum/i);
    });
    it('ignores modifiers not in this group', () => {
        const order = [{ id: 'not-in-group', amount: 10 }];
        const validator = new ProductModifier_1.ProductModifier([group]);
        (0, chai_1.expect)(() => validator.validate(order)).to.throw(/minimum/i);
    });
});
