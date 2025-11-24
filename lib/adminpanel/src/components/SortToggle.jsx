import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUpAZ, ArrowDownZA, ListOrdered, CheckCircle2 } from 'lucide-react';

export function SortToggle({ sortMode, onSortModeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const sortOptions = [
        { value: 'name-asc', label: 'Name (A-Z)', icon: ArrowUpAZ },
        { value: 'name-desc', label: 'Name (Z-A)', icon: ArrowDownZA },
        { value: 'sortOrder', label: 'By Order', icon: ListOrdered },
        { value: 'status', label: 'Active First', icon: CheckCircle2 },
    ];

    const currentOption = sortOptions.find(opt => opt.value === sortMode) || sortOptions[3];
    const CurrentIcon = currentOption.icon;

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelect = (value) => {
        onSortModeChange(value);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                title={`Sort: ${currentOption.label}`}
                className="h-8 gap-2"
            >
                <CurrentIcon className="w-4 h-4" />
                <ArrowUpDown className="w-3 h-3 opacity-50" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-50 text-popover-foreground">
                    <div className="py-1">
                        {sortOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${sortMode === option.value ? 'bg-accent font-medium' : ''
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {option.label}
                                    {sortMode === option.value && (
                                        <span className="ml-auto text-primary">✓</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
