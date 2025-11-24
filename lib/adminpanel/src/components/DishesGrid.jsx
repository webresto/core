import React from 'react';
import { DishCard } from './DishCard';
import { DishListItem } from './DishListItem';
import { GroupToolbox } from './GroupToolbox';
import { ViewToggle } from './ViewToggle';
import { SortToggle } from './SortToggle';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export function DishesGrid({
    dishes,
    balances,
    onUpdateStock,
    onUpdateIsDeleted,
    onBalanceChange,
    onBulkVisibility,
    onBulkBalance,
    title,
    showToolbox = false,
    viewMode = 'grid',
    onViewModeChange,
    sortMode = 'status',
    onSortModeChange,
    showDeleted = true,
    onShowDeletedChange
}) {
    const { t } = useTranslation();
    const displayTitle = title || t('dishes_title');

    // Filter dishes based on showDeleted
    const visibleDishes = showDeleted
        ? dishes
        : dishes.filter(d => !d.isDeleted);

    if (visibleDishes.length === 0 && dishes.length > 0 && !showDeleted) {
        // If all dishes are hidden, show a message or just empty grid?
        // For now, let's just show empty grid, or maybe we should show the toggle even if empty?
    }

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

            case 'status':
                // Disabled dishes (isDeleted === true) go to the bottom
                // Enabled dishes (isDeleted === false or undefined) stay at the top
                const isDisabledA = a.isDeleted === true;
                const isDisabledB = b.isDeleted === true;

                if (isDisabledA && !isDisabledB) return 1;  // A is disabled, B is not -> A goes down
                if (!isDisabledA && isDisabledB) return -1; // B is disabled, A is not -> B goes down

                // If both have same status, sort by name
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
                    {onShowDeletedChange && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onShowDeletedChange(!showDeleted)}
                            title={t('show_disabled')}
                            className={`h-8 gap-2 ${showDeleted ? 'bg-accent text-accent-foreground' : ''}`}
                        >
                            {showDeleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                    )}
                    {onSortModeChange && (
                        <SortToggle sortMode={sortMode} onSortModeChange={onSortModeChange} />
                    )}
                    {onViewModeChange && (
                        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
                    )}
                </div>
            </div>

            {showToolbox && (
                <GroupToolbox
                    dishes={sortedDishes}
                    onBulkVisibility={onBulkVisibility}
                    onBulkBalance={onBulkBalance}
                />
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedDishes.map((dish) => (
                        <DishCard
                            key={dish.id}
                            dish={dish}
                            balance={balances[dish.id]}
                            onUpdateStock={onUpdateStock}
                            onUpdateIsDeleted={onUpdateIsDeleted}
                            onBalanceChange={onBalanceChange}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {sortedDishes.map((dish) => (
                        <DishListItem
                            key={dish.id}
                            dish={dish}
                            balance={balances[dish.id]}
                            onUpdateStock={onUpdateStock}
                            onUpdateIsDeleted={onUpdateIsDeleted}
                            onBalanceChange={onBalanceChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
