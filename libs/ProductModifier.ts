import { GroupModifier, OrderModifier } from "../interfaces/Modifier";

export class ProductModifier {
  private productModifiers: GroupModifier[];

  constructor(productModifiers: GroupModifier[]) {
    this.productModifiers = productModifiers;
  }

  validate(orderModifiers: OrderModifier[]): void {
    for (const group of this.productModifiers) {
      this.validateGroupOrThrow(group, orderModifiers);
    }
  }

  private validateGroupOrThrow(group: GroupModifier, orderModifiers: OrderModifier[]): void {
    const { id: groupId, childModifiers, minAmount = 0, maxAmount = Infinity } = group;

    const allowedModifierIds = new Set(childModifiers.map(m => m.id));  

    const relevantOrderMods = orderModifiers.filter(mod => allowedModifierIds.has(mod.id));

    const selectedAmount = relevantOrderMods.reduce((sum, mod) => sum + (mod.amount ?? 1), 0);

    if (selectedAmount < minAmount) {
      throw new Error(
        `Group ${groupId ?? '[no id]'}: minimum required modifiers is ${minAmount}, but got ${selectedAmount}`
      );
    }

    if (selectedAmount > maxAmount) {
      throw new Error(
        `Group ${groupId ?? '[no id]'}: maximum allowed modifiers is ${maxAmount}, but got ${selectedAmount}`
      );
    }
  }
}
