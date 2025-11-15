import React from 'react';
import { PageHeader } from '../molecules';

interface LeftPanelProps {
  title: string;
  count?: number;
  onCreateNew?: () => void;
  createButtonText?: string;
  headerTestId?: string;
  filters?: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Shared left panel component for all list pages.
 * Provides consistent styling and structure across all pages.
 * Only the list item contents should vary by type.
 */
export function LeftPanel({
  title,
  count,
  onCreateNew,
  createButtonText = 'New',
  headerTestId,
  filters,
  children,
  ariaLabel = 'Items list'
}: LeftPanelProps) {
  return (
    <div 
      className="flex flex-col h-full bg-white" 
      style={{ 
        boxShadow: 'inset -2px 0 4px 0 rgba(0,0,0,0.1), inset -1px 0 2px 0 rgba(0,0,0,0.06), inset 2px 0 4px 0 rgba(0,0,0,0.1), inset 1px 0 2px 0 rgba(0,0,0,0.06)' 
      }}
    >
      <div className="p-6 pb-4 border-b">
        <PageHeader
          title={title}
          count={count}
          onCreateNew={onCreateNew}
          createButtonText={createButtonText}
          testId={headerTestId}
        />
      </div>
      
      {filters && filters}
      
      <div 
        className="flex-1 overflow-auto" 
        role="region" 
        aria-label={ariaLabel} 
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

