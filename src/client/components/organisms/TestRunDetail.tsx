import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestRun, TestRunCase } from '../../../types/test-runs';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Stack } from '../atoms/Stack';
import { Text } from '../atoms/Text';
import { Heading } from '../atoms/Heading';
import { ListItemStyle } from '../atoms/ListItemStyle';
import { MetadataSection } from '../molecules/MetadataSection';
import { TestExecutionModal } from '../molecules/TestExecutionModal';
import { PasswordConfirmModal } from '../molecules/PasswordConfirmModal';
import useTestRunStore from '../../stores/testRunStore';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface TestRunDetailProps {
  testRun: TestRun;
}

export const TestRunDetail: React.FC<TestRunDetailProps> = ({ testRun }) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [executionModalTestCase, setExecutionModalTestCase] = useState<TestRunCase | null>(null);

  const {
    currentTestRunCases,
    currentTestSteps,
    currentStepResults,
    approveTestRun
  } = useTestRunStore();

  const handleApprove = async (password: string) => {
    await approveTestRun(testRun.id, password);
    setShowApproveModal(false);
  };

  const handleOpenExecutionModal = (testRunCase: TestRunCase) => {
    setExecutionModalTestCase(testRunCase);
  };

  const handleCloseExecutionModal = () => {
    setExecutionModalTestCase(null);
  };

  const canApprove = testRun.status === 'complete' && !testRun.approvedAt;
  const isApproved = testRun.status === 'approved';

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <Stack spacing="md">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <Heading level={2}>{testRun.name}</Heading>
              {testRun.description && (
                <Text color="secondary" className="mt-2">
                  {testRun.description}
                </Text>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant={
                testRun.status === 'approved' ? 'success' :
                testRun.status === 'complete' ? 'pending' :
                testRun.status === 'in_progress' ? 'warning' : 'neutral'
              }>
                {testRun.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant={testRun.overallResult === 'pass' ? 'success' : testRun.overallResult === 'fail' ? 'error' : 'neutral'}>
                Result: {testRun.overallResult}
              </Badge>
            </div>
          </div>

          {/* Metadata */}
          <MetadataSection
            fields={[
              { label: 'Created At', value: testRun.createdAt, type: 'date' },
              { label: 'Created By', value: testRun.createdByName },
              { label: 'Approved At', value: testRun.approvedAt, type: 'date' },
              { label: 'Approved By', value: testRun.approvedByName }
            ]}
          />

          {isApproved && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <Text color="primary">
                This test run has been approved and locked. No further changes can be made.
              </Text>
            </div>
          )}

          {/* Approval Section */}
          {canApprove && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 flex items-center justify-between gap-4">
              <Text className="flex-1">
                All test cases have been executed. You can now approve this test run to finalize results and create traceability records.
              </Text>
              <Button
                variant="primary"
                onClick={() => setShowApproveModal(true)}
                data-testid="approve-test-run-btn"
                className="flex-shrink-0"
              >
                Approve Test Run
              </Button>
            </div>
          )}

          {/* Test Cases */}
          <div>
            <Heading level={3}>Test Cases</Heading>
            <div className="mt-4 bg-white">
              {currentTestRunCases.map((testRunCase) => (
                <TestCaseCard
                  key={testRunCase.id}
                  testRunCase={testRunCase}
                  onOpenModal={() => handleOpenExecutionModal(testRunCase)}
                  isLocked={isApproved}
                />
              ))}
            </div>
          </div>
        </Stack>
      </div>

      <PasswordConfirmModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApprove}
        title="Approve Test Run"
        message="Enter your password to approve this test run. This will create permanent test result records and traceability links to test cases. Once approved, the test run cannot be modified."
      />

      {executionModalTestCase && (
        <TestExecutionModal
          isOpen={!!executionModalTestCase}
          onClose={handleCloseExecutionModal}
          testRunId={testRun.id}
          testRunCase={executionModalTestCase}
          testSteps={currentTestSteps[executionModalTestCase.testCaseId] || []}
          stepResults={currentStepResults[executionModalTestCase.id] || []}
          isLocked={isApproved}
        />
      )}
    </div>
  );
};

interface TestCaseCardProps {
  testRunCase: TestRunCase;
  onOpenModal: () => void;
  isLocked: boolean;
}

const TestCaseCard: React.FC<TestCaseCardProps> = ({
  testRunCase,
  onOpenModal,
  isLocked
}) => {
  const navigate = useNavigate();


  const handleTestCaseClick = () => {
    if (isLocked) {
      navigate(`/test-cases/${testRunCase.testCaseId}`);
    }
  };

  return (
    <ListItemStyle
      isActive={false}
      className={`px-6 py-4 border-b border-gray-100 ${isLocked ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      testid={`test-case-card-${testRunCase.testCaseId}`}
      onClick={handleTestCaseClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {testRunCase.status === 'complete' && testRunCase.result === 'pass' ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
          ) : testRunCase.status === 'complete' && testRunCase.result === 'fail' ? (
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
          ) : testRunCase.status === 'in_progress' ? (
            <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              {isLocked ? (
                <a
                  href={`/test-cases/${testRunCase.testCaseId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/test-cases/${testRunCase.testCaseId}`);
                  }}
                  className="font-semibold text-gray-900 text-sm hover:text-blue-600 hover:underline"
                >
                  {testRunCase.testCaseId}
                  {(testRunCase as any).testCaseTitle && ` - ${(testRunCase as any).testCaseTitle}`}
                </a>
              ) : (
                <span className="font-semibold text-gray-900 text-sm">
                  {testRunCase.testCaseId}
                  {(testRunCase as any).testCaseTitle && ` - ${(testRunCase as any).testCaseTitle}`}
                </span>
              )}
            </div>

            {testRunCase.executedByName && (
              <div className="mt-2 text-xs text-gray-600">
                Executed by: {testRunCase.executedByName}
              </div>
            )}
          </div>
        </div>

        {!isLocked && (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal();
            }}
            data-testid={`execute-test-case-${testRunCase.testCaseId}`}
            className="self-center"
          >
            Execute
          </Button>
        )}
      </div>
    </ListItemStyle>
  );
};