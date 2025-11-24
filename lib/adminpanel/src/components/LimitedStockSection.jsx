import React from 'react';
import { DishesGrid } from './DishesGrid';

export function LimitedStockSection({
    items,
    balances,
    onUpdateStock,
    onUpdateVisibility,
    onBalanceChange
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <DishesGrid
                dishes={items}
                balances={balances}
                onUpdateStock={onUpdateStock}
                onUpdateVisibility={onUpdateVisibility}
                onBalanceChange={onBalanceChange}
                title="Items with limited stock"
            />
        </div>
    );
}
