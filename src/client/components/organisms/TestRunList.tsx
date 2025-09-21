import React from 'react';
import { TestRun } from '../../../types/test-runs';
import { Badge } from '../atoms/Badge';
import { ListItemStyle } from '../atoms/ListItemStyle';
import { LoadingState } from '../molecules/LoadingState';
import { EmptyState } from '../molecules/EmptyState';
import { CheckCircle, Clock, ChevronRight, XCircle } from 'lucide-react';

interface TestRunListProps {
  testRuns: TestRun[];
  selectedTestRun: TestRun | null;
  onSelectTestRun: (testRun: TestRun) => void;
  loading?: boolean;
}

export const TestRunList: React.FC<TestRunListProps> = ({
  testRuns,
  selectedTestRun,
  onSelectTestRun,
  loading
}) => {
  if (loading) {
    return <LoadingState />;
  }

  if (testRuns.length === 0) {
    return <EmptyState title="No test runs found" />;
  }

  const getStatusIcon = (status: string, result: string) => {
    if (status === 'complete' || status === 'approved') {
      if (result === 'pass') {
        return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />;
      } else if (result === 'fail') {
        return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />;
      }
    }
    if (status === 'in_progress') {
      return <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />;
    }
    return <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />;
  };

  return (
    <div>
      {testRuns.map((testRun) => (
        <ListItemStyle
          key={testRun.id}
          isActive={selectedTestRun?.id === testRun.id}
          onClick={() => onSelectTestRun(testRun)}
          className="px-6 py-4 border-b border-gray-100"
          testid={`test-run-item-${testRun.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {getStatusIcon(testRun.status, testRun.overallResult)}
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <span className="font-semibold text-gray-900 text-sm">
                    {testRun.name}
                  </span>
                  {testRun.status === 'approved' && (
                    <Badge
                      variant="success"
                      size="sm"
                      className="ml-2"
                    >
                      APPROVED
                    </Badge>
                  )}
                </div>

                {testRun.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {testRun.description}
                  </p>
                )}

                <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
                  <span>Created: {testRun.createdAt ? new Date(testRun.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  {testRun.createdByName && (
                    <span>By: {testRun.createdByName}</span>
                  )}
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 self-center" />
          </div>
        </ListItemStyle>
      ))}
    </div>
  );
};