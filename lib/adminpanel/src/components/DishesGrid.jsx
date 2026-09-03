import React from 'react';
import { DishCard } from './DishCard';
import { DishListItem } from './DishListItem';
import { GroupToolbox } from './GroupToolbox';
import { ViewToggle } from './ViewToggle';
import { SortToggle } from './SortToggle';
import { useTranslation } from '../i18n/I18nContext';

export function DishesGrid({
    dishes,
    mode,
    localBalances,
    onUpdateStock,
    onLocalBalanceChange,
    onToggleEnable,
    onBulkBalance,
    title,
    showToolbox = false,
    canManage = false,
    viewMode = 'grid',
    onViewModeChange,
    sortMode = 'name-asc',
    onSortModeChange
}) {
    const { t } = useTranslation();
    const displayTitle = title || t('Dishes');

    // Deleted dishes must never appear in stock manager.
    const visibleDishes = dishes.filter((d) => !d.isDeleted);

    if (dishes.length === 0) {
        return null;
    }

    // Sorting logic
    const sortedDishes = [...visibleDishes].sort((a, b) => {
        switch (sortMode) {
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '');

            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '');

            case 'sortOrder':
                const orderA = a.sortOrder ?? 999999;
                const orderB = b.sortOrder ?? 999999;
                return orderA - orderB;

            case 'status': // Saved preference from the old UI: no longer uses enable/visible.
                return (a.name || '').localeCompare(b.name || '');

            default:
                return 0;
        }
    });

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{displayTitle}</h3>
                <div className="flex items-center gap-2">
                    {onSortModeChange && (
                        <SortToggle sortMode={sortMode} onSortModeChange={onSortModeChange} />
                    )}
                    {onViewModeChange && (
                        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
                    )}
                </div>
            </div>

            {showToolbox && canManage && (
                <GroupToolbox
                    dishes={sortedDishes}
                    onBulkBalance={onBulkBalance}
                />
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedDishes.map((dish) => (
                        <DishCard
                            key={dish.id}
                            dish={dish}
                            mode={mode}
                            localBalance={localBalances[dish.id]}
                            onUpdateStock={onUpdateStock}
                            onLocalBalanceChange={onLocalBalanceChange}
                            onToggleEnable={onToggleEnable}
                            canManage={canManage}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {sortedDishes.map((dish) => (
                        <DishListItem
                            key={dish.id}
                            dish={dish}
                            mode={mode}
                            localBalance={localBalances[dish.id]}
                            onUpdateStock={onUpdateStock}
                            onLocalBalanceChange={onLocalBalanceChange}
                            onToggleEnable={onToggleEnable}
                            canManage={canManage}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
