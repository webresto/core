import React from 'react';

/**
 * Controlled tab strip.
 *
 * The active tab lives in the page, not here: it is part of the address
 * alongside the browsed group, and both have to be written together.
 */
export function Tabs({ tabs, activeTab, onTabChange }) {
    const current = tabs.find(tab => tab.id === activeTab) || tabs[0];

    return (
        <div className="w-full">
            <div className="border-b border-border mb-6">
                <div className="flex space-x-1" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={current?.id === tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                px-4 py-2 font-medium text-sm rounded-t-lg transition-colors
                ${current?.id === tab.id
                                    ? 'bg-background text-foreground border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="tab-content">
                {current?.content}
            </div>
        </div>
    );
}
