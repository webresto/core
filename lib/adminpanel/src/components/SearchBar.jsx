import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SearchBar({ query, onQueryChange, onClear }) {
    return (
        <div className="flex gap-2 mb-6">
            <Input
                placeholder="Search dishes by name or code..."
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                className="flex-1"
            />
            {query && (
                <Button onClick={onClear} variant="outline" size="sm">
                    ✕ Clear
                </Button>
            )}
        </div>
    );
}
