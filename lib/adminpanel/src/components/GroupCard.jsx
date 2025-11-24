import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function GroupCard({ group, onGroupClick, onUpdateVisibility }) {
    const handleClick = () => {
        onGroupClick(group);
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
    };

    const handleLabelClick = (e) => {
        e.stopPropagation();
    };

    return (
        <Card
            onClick={handleClick}
            className="cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center min-h-[100px] text-center"
        >
            <CardContent className="p-4 flex flex-col items-center">
                <div className="text-2xl mb-2">📁</div>
                <div className="font-bold">{group.name}</div>
                <div className="mt-2 text-sm flex items-center gap-2">
                    <Checkbox
                        id={`visible-group-${group.id}`}
                        checked={!!group.visible}
                        onClick={handleCheckboxClick}
                        onCheckedChange={(checked) => onUpdateVisibility(group.id, 'group', checked)}
                    />
                    <Label
                        htmlFor={`visible-group-${group.id}`}
                        className="cursor-pointer"
                        onClick={handleLabelClick}
                    >
                        Visible
                    </Label>
                </div>
            </CardContent>
        </Card>
    );
}
