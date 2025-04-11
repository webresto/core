"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModifier = void 0;
class ProductModifier {
    constructor(productModifiers) {
        this.productModifiers = productModifiers;
    }
    fillDefault(orderModifiers) {
        const filledModifiers = [...orderModifiers];
        for (const group of this.productModifiers) {
            const { id: groupId, childModifiers } = group;
            for (const mod of childModifiers) {
                if (mod.defaultAmount && mod.defaultAmount > 0) {
                    const alreadyAdded = filledModifiers.some(m => m.id === mod.id && m.groupId === groupId);
                    if (!alreadyAdded) {
                        filledModifiers.push({
                            id: mod.id,
                            groupId,
                            amount: mod.defaultAmount,
                            rmsId: mod.rmsId
                        });
                    }
                }
            }
        }
        return filledModifiers;
    }
    validate(orderModifiers) {
        return this.productModifiers.map(group => this.validateGroup(group, orderModifiers));
    }
    validateGroup(group, orderModifiers) {
        const { id: groupId, childModifiers, minAmount = 0, maxAmount = Infinity } = group;
        const relevantOrderMods = orderModifiers.filter(mod => mod.groupId === groupId);
        const allowedModifierIds = new Set(childModifiers.map(m => m.id));
        const selectedAmount = relevantOrderMods
            .filter(mod => allowedModifierIds.has(mod.id))
            .reduce((sum, mod) => sum + (mod.amount ?? 1), 0);
        if (selectedAmount < minAmount) {
            throw new Error(`Minimum number of modifiers for group ${groupId}: ${minAmount}, selected: ${selectedAmount}`);
        }
        if (selectedAmount > maxAmount) {
            throw new Error(`Maximum number of modifiers for group ${groupId}: ${maxAmount}, selected: ${selectedAmount}`);
        }
        return { groupId, valid: true };
    }
}
exports.ProductModifier = ProductModifier;
