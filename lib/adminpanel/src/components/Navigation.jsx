import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../i18n/I18nContext';

export function Navigation({ currentGroup, groupStack, onBackClick }) {
    const { t } = useTranslation();

    if (!currentGroup && groupStack.length === 0) {
        return null;
    }

    // Build breadcrumb path: Root -> Group1 -> Group2 -> Current
    const breadcrumbs = [
        { id: null, name: t('back_to_root'), level: 0 },
        ...groupStack.filter(g => g !== null).map((group, index) => ({
            id: group.id,
            name: group.name,
            level: index + 1
        }))
    ];

    if (currentGroup) {
        breadcrumbs.push({
            id: currentGroup.id,
            name: currentGroup.name,
            level: breadcrumbs.length
        });
    }

    const handleBreadcrumbClick = (level) => {
        // Calculate how many times to go back
        const currentLevel = breadcrumbs.length - 1;
        const stepsBack = currentLevel - level;

        // Go back the required number of times
        for (let i = 0; i < stepsBack; i++) {
            onBackClick();
        }
    };

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
                        onClick={() => handleBreadcrumbClick(crumb.level)}
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
