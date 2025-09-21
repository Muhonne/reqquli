import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Heading } from '../atoms/Heading';

interface PageHeaderProps {
  title: string;
  count?: number;
  onCreateNew?: () => void;
  createButtonText?: string;
  testId?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  count,
  onCreateNew,
  createButtonText = 'New',
  testId = 'create-new-btn'
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <Heading level={1}>
        {title}
        {count !== undefined && (
          <span className="ml-2 text-gray-500 font-normal">({count})</span>
        )}
      </Heading>
      {onCreateNew && (
        <Button
          onClick={onCreateNew}
          variant="primary"
          data-testid={testId}
        >
          <Plus className="w-4 h-4 mr-1" />
          {createButtonText}
        </Button>
      )}
    </div>
  );
};