import React from 'react';
import { GroupCard } from './GroupCard';

export function GroupsGrid({ groups, onGroupClick }) {
    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Groups</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
