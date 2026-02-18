import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '../i18n/I18nContext';

export function SearchBar({ query, onQueryChange, onClear }) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-2 mb-6">
            <Input
                placeholder={t('search_placeholder')}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                className="flex-1"
            />
            {query && (
                <Button onClick={onClear} variant="outline" size="sm">
                    ✕ {t('clear')}
                </Button>
            )}
        </div>
    );
}
