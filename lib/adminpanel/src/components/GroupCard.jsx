import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function GroupCard({ group, onGroupClick }) {
    const handleClick = () => {
        onGroupClick(group);
    };

    return (
        <Card
            onClick={handleClick}
            className="cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center min-h-[100px] text-center"
        >
            <CardContent className="p-4 flex flex-col items-center">
                <div className="text-2xl mb-2">📁</div>
                <div className="font-bold">{group.name}</div>
            </CardContent>
        </Card>
    );
}
