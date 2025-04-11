"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ProductModifier_1 = require("../../../libs/ProductModifier");
describe("ProductModifier.ensureMinDefaults", () => {
    const productModifiers = [
        {
            id: "group1",
            minAmount: 1,
            maxAmount: 3,
            rmsId: "rms-group1",
            modifierId: "modifier-group1",
            childModifiers: [
                {
                    id: "mod1",
                    defaultAmount: 1,
                    rmsId: "r1",
                    modifierId: "mod-1"
                },
                {
                    id: "mod2",
                    rmsId: "r2",
                    modifierId: "mod-2"
                }
            ]
        },
        {
            id: "group2",
            minAmount: 1,
            rmsId: "rms-group2",
            modifierId: "modifier-group2",
            childModifiers: [
                {
                    id: "mod3",
                    defaultAmount: 0, // Нет defaultAmount
                    rmsId: "r3",
                    modifierId: "mod-3"
                },
                {
                    id: "mod4", // Этот можно выбрать
                    rmsId: "r4",
                    modifierId: "mod-4"
                }
            ]
        }
    ];
    it("should set first modifier to minAmount if no defaultAmount exists", () => {
        const orderModifiers = []; // Пусто
        const productMod = new ProductModifier_1.ProductModifier(productModifiers);
        const result = productMod.ensureMinDefaults(orderModifiers);
        // Для group1: minAmount = 1 → должен выбрать модификатор mod1 (с defaultAmount)
        (0, chai_1.expect)(result).to.have.deep.include({
            id: "mod1", // Первый модификатор
            groupId: "group1",
            amount: 1, // На minAmount
            rmsId: "r1"
        });
        // Для group2: minAmount = 1, нет defaultAmount → должен выбрать mod4 (первый по списку)
        (0, chai_1.expect)(result).to.have.deep.include({
            id: "mod4", // Выбран первый модификатор без defaultAmount
            groupId: "group2",
            amount: 1, // На minAmount
            rmsId: "r4"
        });
        (0, chai_1.expect)(result).to.have.lengthOf(2);
    });
    it("should add defaultAmount modifiers if available", () => {
        const orderModifiers = []; // Пусто
        const productMod = new ProductModifier_1.ProductModifier(productModifiers);
        const result = productMod.ensureMinDefaults(orderModifiers);
        // group1: minAmount = 1 → должен выбрать mod1 (с defaultAmount)
        (0, chai_1.expect)(result).to.have.deep.include({
            id: "mod1",
            groupId: "group1",
            amount: 1,
            rmsId: "r1"
        });
        (0, chai_1.expect)(result).to.have.lengthOf(1);
    });
});
