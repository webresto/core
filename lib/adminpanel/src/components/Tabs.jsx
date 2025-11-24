import React, { useState } from 'react';

export function Tabs({ tabs, defaultTab }) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const activeTabContent = tabs.find(tab => tab.id === activeTab);

    return (
        <div className="w-full">
            <div className="border-b border-border mb-6">
                <div className="flex space-x-1" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                px-4 py-2 font-medium text-sm rounded-t-lg transition-colors
                ${activeTab === tab.id
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
                {activeTabContent?.content}
            </div>
        </div>
    );
}
