import React from 'react';
import { Button } from '@/components/ui/button';

export function Navigation({ currentGroup, groupStack, onBackClick }) {
    if (!currentGroup && groupStack.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 flex items-center gap-4">
            <Button onClick={onBackClick} variant="outline" size="sm">
                ← Back
            </Button>
            <span className="font-bold text-lg">
                {currentGroup ? currentGroup.name : 'Root'}
            </span>
        </div>
    );
}
