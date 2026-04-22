import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../i18n/I18nContext';

export function ViewToggle({ viewMode, onViewModeChange }) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-1 border border-border rounded-md p-1">
            <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                title={t('Grid view')}
                className="h-8 w-8 p-0"
            >
                ⊞
            </Button>
            <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                title={t('List view')}
                className="h-8 w-8 p-0"
            >
                ☰
            </Button>
        </div>
    );
}
