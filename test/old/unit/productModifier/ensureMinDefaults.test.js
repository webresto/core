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
        },
        {
            id: "group3", // Группа с minAmount = 0
            minAmount: 0,
            rmsId: "rms-group3",
            modifierId: "modifier-group3",
            childModifiers: [
                {
                    id: "mod5",
                    defaultAmount: 1,
                    rmsId: "r5",
                    modifierId: "mod-5"
                }
            ]
        },
        {
            id: "group4", // Группа без minAmount
            rmsId: "rms-group4",
            modifierId: "modifier-group4",
            childModifiers: [
                {
                    id: "mod6",
                    defaultAmount: 1,
                    rmsId: "r6",
                    modifierId: "mod-6"
                }
            ]
        }
    ];
    it("should set first modifier to minAmount if no defaultAmount exists", () => {
        const orderModifiers = []; // Пусто
        const productMod = new ProductModifier_1.ProductModifier(productModifiers);
        const result = productMod.ensureMinDefaults(orderModifiers);
        // Для group1: minAmount = 1 → должен выбрать модификатор mod1 (с defaultAmount)
        (0, chai_1.expect)(result[0]).to.deep.include({
            id: "mod1", // Первый модификатор
            groupId: "group1",
            amount: 1, // На minAmount
            rmsId: "r1"
        });
        // Для group2: minAmount = 1, нет defaultAmount → должен выбрать mod4 (первый по списку)
        (0, chai_1.expect)(result[1]).to.deep.include({
            id: "mod3",
            groupId: "group2",
            amount: 1, // На minAmount
            rmsId: "r3"
        });
        (0, chai_1.expect)(result).to.have.lengthOf(2); // Должно быть два модификатора
    });
    it("should add defaultAmount modifiers if available", () => {
        const orderModifiers = []; // Пусто
        const productMod = new ProductModifier_1.ProductModifier(productModifiers);
        const result = productMod.ensureMinDefaults(orderModifiers);
        // Для group1: minAmount = 1 → должен выбрать mod1 (с defaultAmount)
        (0, chai_1.expect)(result[0]).to.deep.include({
            id: "mod1",
            groupId: "group1",
            amount: 1,
            rmsId: "r1"
        });
        (0, chai_1.expect)(result).to.have.lengthOf(2); // Должно быть два модификатора
    });
    it("should do nothing if minAmount is 0 or does not exist", () => {
        const orderModifiers = []; // Пусто
        const productMod = new ProductModifier_1.ProductModifier(productModifiers);
        const result = productMod.ensureMinDefaults(orderModifiers);
        // Для group3 (minAmount = 0): ничего не должно быть добавлено
        const group3Modifier = result.find(mod => mod.groupId === "group3");
        (0, chai_1.expect)(group3Modifier).to.be.undefined; // Модификатор не должен быть добавлен для group3
        // Для group4 (minAmount не указан): ничего не должно быть добавлено
        const group4Modifier = result.find(mod => mod.groupId === "group4");
        (0, chai_1.expect)(group4Modifier).to.be.undefined; // Модификатор не должен быть добавлен для group4
        // Для других групп модификаторы все равно добавятся
        (0, chai_1.expect)(result).to.have.lengthOf(2); // Только 2 модификатора должны быть добавлены
    });
});
