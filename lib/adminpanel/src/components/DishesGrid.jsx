import React from 'react';
import { DishCard } from './DishCard';

export function DishesGrid({
    dishes,
    balances,
    onUpdateStock,
    onUpdateVisibility,
    onBalanceChange,
    title = 'Dishes'
}) {
    if (dishes.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {dishes.map((dish) => (
                    <DishCard
                        key={dish.id}
                        dish={dish}
                        balance={balances[dish.id]}
                        onUpdateStock={onUpdateStock}
                        onUpdateVisibility={onUpdateVisibility}
                        onBalanceChange={onBalanceChange}
                    />
                ))}
            </div>
        </div>
    );
}
