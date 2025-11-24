import React from 'react';
import { DishCard } from './DishCard';
import { DishListItem } from './DishListItem';
import { GroupToolbox } from './GroupToolbox';
import { ViewToggle } from './ViewToggle';

export function DishesGrid({
    dishes,
    balances,
    onUpdateStock,
    onUpdateVisibility,
    onUpdateIsDeleted,
    onBalanceChange,
    onBulkVisibility,
    onBulkBalance,
    title = 'Dishes',
    showToolbox = false,
    viewMode = 'grid',
    onViewModeChange
}) {
    if (dishes.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{title}</h3>
                {onViewModeChange && (
                    <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
                )}
            </div>

            {showToolbox && (
                <GroupToolbox
                    dishes={dishes}
                    onBulkVisibility={onBulkVisibility}
                    onBulkBalance={onBulkBalance}
                />
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {dishes.map((dish) => (
                        <DishCard
                            key={dish.id}
                            dish={dish}
                            balance={balances[dish.id]}
                            onUpdateStock={onUpdateStock}
                            onUpdateVisibility={onUpdateVisibility}
                            onUpdateIsDeleted={onUpdateIsDeleted}
                            onBalanceChange={onBalanceChange}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {dishes.map((dish) => (
                        <DishListItem
                            key={dish.id}
                            dish={dish}
                            balance={balances[dish.id]}
                            onUpdateStock={onUpdateStock}
                            onUpdateVisibility={onUpdateVisibility}
                            onUpdateIsDeleted={onUpdateIsDeleted}
                            onBalanceChange={onBalanceChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
