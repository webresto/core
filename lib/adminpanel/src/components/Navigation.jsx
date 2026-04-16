import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../i18n/I18nContext';

export function Navigation({ currentGroup, groupStack, onBreadcrumbNavigate }) {
    const { t } = useTranslation();

    if (!currentGroup && groupStack.length === 0) {
        return null;
    }

    // Build breadcrumb path: Root -> Group1 -> Group2 -> Current
    // Deduplicate by id to avoid loops when data has accidental cycles.
    const rawBreadcrumbs = [
        { id: null, name: t('back_to_root'), level: 0 },
        ...groupStack.filter(g => g !== null).map((group, index) => ({
            id: group.id,
            name: group.name,
            level: index + 1
        }))
    ];

    if (currentGroup) {
        rawBreadcrumbs.push({
            id: currentGroup.id,
            name: currentGroup.name,
            level: rawBreadcrumbs.length
        });
    }
    const breadcrumbs = [];
    const seen = new Set();
    for (const crumb of rawBreadcrumbs) {
        const key = crumb.id === null ? '__root__' : String(crumb.id);
        if (seen.has(key)) {
            break;
        }
        seen.add(key);
        breadcrumbs.push(crumb);
    }

    return (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
            {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.level}>
                    {index > 0 && (
                        <span className="text-muted-foreground">/</span>
                    )}
                    <Button
                        variant={index === breadcrumbs.length - 1 ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onBreadcrumbNavigate?.(crumb.level)}
                        disabled={index === breadcrumbs.length - 1}
                        className={index === breadcrumbs.length - 1 ? 'font-bold cursor-default' : ''}
                    >
                        {crumb.name}
                    </Button>
                </React.Fragment>
            ))}
        </div>
    );
}
