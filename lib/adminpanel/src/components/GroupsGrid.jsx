import React from 'react';
import { GroupCard } from './GroupCard';
import { useTranslation } from '../i18n/I18nContext';

export function GroupsGrid({ groups, onGroupClick }) {
    const { t } = useTranslation();

    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">{t('Groups')}</h3>
            {/*
              * Sized by the tile and not by breakpoints. The breakpoint classes
              * this used to carry — sm:, md:, lg: — are not in the admin panel's
              * stylesheet, which is compiled from adminizer's own sources and
              * knows nothing of this file: the grid was two columns everywhere
              * below 1280 and six above it.
              */}
            <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
            >
                {groups.map((group) => (
                    <GroupCard
                        key={group.id}
                        group={group}
                        onGroupClick={onGroupClick}
                    />
                ))}
            </div>
        </div>
    );
}
