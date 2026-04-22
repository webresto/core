import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export function GroupCard({ group, onGroupClick, onUpdateVisible }) {
    const { t } = useTranslation();
    
    const handleClick = () => {
        onGroupClick(group);
    };

    const toggleVisibility = (e) => {
        e.stopPropagation();
        onUpdateVisible(group.id, 'group', !group.visible);
    };

    return (
        <Card
            onClick={handleClick}
            className="cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center min-h-[100px] text-center relative"
        >
            <button 
                onClick={toggleVisibility}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                title={t('Visible in menu (publicity)')}
            >
                {group.visible !== false ? (
                    <Eye className="w-4 h-4" />
                ) : (
                    <EyeOff className="w-4 h-4 text-red-500" />
                )}
            </button>
            <CardContent className="p-4 flex flex-col items-center">
                <div className="text-2xl mb-2">📁</div>
                <div className="font-bold">{group.name}</div>
            </CardContent>
        </Card>
    );
}
