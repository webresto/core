import { GroupModifier, OrderModifier } from "../interfaces/Modifier";

interface ValidationResult {
  groupId: string;
  valid: boolean;
  error?: string;
}

export class ProductModifier {
  private productModifiers: GroupModifier[];

  constructor(productModifiers: GroupModifier[]) {
    this.productModifiers = productModifiers;
  }

  ensureMinDefaults(orderModifiers: OrderModifier[]): OrderModifier[] {
    const result = [...orderModifiers];
  
    for (const group of this.productModifiers) {
      const { id: groupId, minAmount = 0, childModifiers } = group;
  
      if (minAmount < 1) continue;
  
      const selectedInGroup = result.filter(m => m.groupId === groupId);
      const totalSelectedAmount = selectedInGroup.reduce((sum, mod) => sum + (mod.amount ?? 1), 0);
  
      if (totalSelectedAmount === 0) {
        // Проверяем, если есть модификаторы с defaultAmount
        const defaultMods = childModifiers.filter(m => m.defaultAmount && m.defaultAmount > 0);
  
        if (defaultMods.length > 0) {
          // Добавим дефолтные модификаторы до достижения minAmount
          let amountToFill = minAmount;
          for (const mod of defaultMods) {
            if (amountToFill <= 0) break;
  
            const addAmount = Math.min(mod.defaultAmount!, amountToFill);
            result.push({
              id: mod.id,
              groupId,
              amount: addAmount,
              rmsId: mod.rmsId
            });
  
            amountToFill -= addAmount;
          }
        } else {
          // Если нет модификаторов с defaultAmount, устанавливаем первый модификатор на minAmount
          const firstModifier = childModifiers[0];
          if (firstModifier) {
            result.push({
              id: firstModifier.id,
              groupId,
              amount: minAmount,
              rmsId: firstModifier.rmsId
            });
          }
        }
      }
    }
  
    return result;
  }

  fillDefault(orderModifiers: OrderModifier[]): OrderModifier[] {
    const filledModifiers = [...orderModifiers];
  
    for (const group of this.productModifiers) {
      const { id: groupId, childModifiers } = group;
  
      for (const mod of childModifiers) {
        if (mod.defaultAmount && mod.defaultAmount > 0) {
          const alreadyAdded = filledModifiers.some(
            m => m.id === mod.id && m.groupId === groupId
          );
  
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
  

  validate(orderModifiers: OrderModifier[]): ValidationResult[] {
    return this.productModifiers.map(group => this.validateGroup(group, orderModifiers));
  }

  private validateGroup(group: GroupModifier, orderModifiers: OrderModifier[]): ValidationResult {
    const { id: groupId, childModifiers, minAmount = 0, maxAmount = Infinity } = group;

    const relevantOrderMods = orderModifiers.filter(mod => mod.groupId === groupId);

    const allowedModifierIds = new Set(childModifiers.map(m => m.id));

    const selectedAmount = relevantOrderMods
      .filter(mod => allowedModifierIds.has(mod.id))
      .reduce((sum, mod) => sum + (mod.amount ?? 1), 0);

    if (selectedAmount < minAmount) {
      throw new Error(
        `Minimum number of modifiers for group ${groupId}: ${minAmount}, selected: ${selectedAmount}`
      );
    }

    if (selectedAmount > maxAmount) {
      throw new Error(
        `Maximum number of modifiers for group ${groupId}: ${maxAmount}, selected: ${selectedAmount}`
      );
    }

    return { groupId, valid: true };
  }
}
