import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Textarea } from '../atoms/Textarea';
import { Text } from '../atoms/Text';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { TestRunCase, TestStep, TestStepResult, StepStatus } from '../../../types/test-runs';
import useTestRunStore from '../../stores/testRunStore';

interface TestExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  testRunId: string;
  testRunCase: TestRunCase;
  testSteps: TestStep[];
  stepResults: TestStepResult[];
  isLocked: boolean;
}

export function TestExecutionModal({
  isOpen,
  onClose,
  testRunId,
  testRunCase,
  testSteps,
  stepResults,
  isLocked
}: TestExecutionModalProps) {
  const { updateStepResult, uploadEvidence, savingStepResult } = useTestRunStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tempResult, setTempResult] = useState<{ status: StepStatus; actualResult: string }>({
    status: 'not_executed',
    actualResult: ''
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentStep = testSteps[currentStepIndex];
  const totalSteps = testSteps.length;

  useEffect(() => {
    if (isOpen && currentStep) {
      const existingResult = (stepResults || []).find(sr => sr && sr.stepNumber === currentStep.stepNumber);
      setTempResult({
        status: existingResult?.status || 'not_executed',
        actualResult: existingResult?.actualResult || ''
      });
      setHasUnsavedChanges(false);
    }
  }, [isOpen, currentStepIndex, currentStep, stepResults]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to navigate away?');
        if (!confirmed) {return;}
      }
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex, hasUnsavedChanges]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to navigate away?');
        if (!confirmed) {return;}
      }
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, totalSteps, hasUnsavedChanges]);

  const handleSaveStep = useCallback(async () => {
    if (!currentStep) {return;}

    try {
      await updateStepResult(testRunId, testRunCase.testCaseId, currentStep.stepNumber, {
        status: tempResult.status,
        actualResult: tempResult.actualResult || 'No details provided'
      });

      setHasUnsavedChanges(false);

      // Auto-advance to next step if not on last step
      if (currentStepIndex < totalSteps - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } catch {
      // Error handling silently - auto-advance is not critical
    }
  }, [currentStep, testRunId, testRunCase.testCaseId, tempResult, updateStepResult, currentStepIndex, totalSteps]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!currentStep) {return;}

    try {
      const fileId = await uploadEvidence(testRunId, testRunCase.testCaseId, currentStep.stepNumber, file);
      await updateStepResult(testRunId, testRunCase.testCaseId, currentStep.stepNumber, {
        ...tempResult,
        evidenceFileId: fileId
      });
    } catch {
      // Error uploading evidence - non-critical failure
    }
  }, [currentStep, testRunId, testRunCase.testCaseId, tempResult, uploadEvidence, updateStepResult]);

  const handleStatusChange = useCallback((status: StepStatus) => {
    setTempResult(prev => ({ ...prev, status }));
    setHasUnsavedChanges(true);
  }, []);

  const handleActualResultChange = useCallback((actualResult: string) => {
    setTempResult(prev => ({ ...prev, actualResult }));
    setHasUnsavedChanges(true);
  }, []);


  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case 'pass':
        return <Badge variant="success">PASS</Badge>;
      case 'fail':
        return <Badge variant="error">FAIL</Badge>;
      default:
        return <Badge variant="neutral">NOT EXECUTED</Badge>;
    }
  };

  const customTitle = useMemo(() => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <span>Execute Test Case: {testRunCase.testCase?.title || testRunCase.testCaseId}</span>
        <div className="text-center px-2">
          <Text weight="semibold">
            Step {currentStepIndex + 1} of {totalSteps}
          </Text>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePreviousStep}
          disabled={currentStepIndex === 0}
          testid="step-previous"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNextStep}
          disabled={currentStepIndex === totalSteps - 1}
          testid="step-next"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ), [testRunCase.testCase?.title, testRunCase.testCaseId, currentStepIndex, totalSteps, handlePreviousStep, handleNextStep]);

  if (!currentStep) {return null;}

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customTitle}
      size="fixed"
      hideCloseButton={true}
    >
      <div className="flex flex-col h-full">
        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Step details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text weight="semibold" className="mb-2">Action</Text>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <Text>{currentStep.action}</Text>
                  </div>
                </div>

                <div>
                  <Text weight="semibold" className="mb-2">Expected Result</Text>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <Text>{currentStep.expectedResult}</Text>
                  </div>
                </div>
              </div>
            </div>

            {/* Execution section */}
            {!isLocked && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2">
                    <Text weight="semibold">Actual Result</Text>
                  </label>
                  <Textarea
                    value={tempResult.actualResult}
                    onChange={(e) => handleActualResultChange(e.target.value)}
                    rows={2}
                    placeholder="Describe what actually happened..."
                    disabled={savingStepResult}
                    testid="step-actual-result"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">
                      <Text weight="semibold">Evidence</Text>
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="evidence-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {handleFileUpload(file);}
                        }}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        disabled={savingStepResult}
                        className="hidden"
                        data-testid="evidence-upload"
                      />
                      <label
                        htmlFor="evidence-upload"
                        className={`inline-block px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors ${
                          savingStepResult ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Choose File
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2">
                      <Text weight="semibold">Status</Text>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange('not_executed')}
                        disabled={savingStepResult}
                        className={`px-4 py-2 border transition-all ${
                          tempResult.status === 'not_executed'
                            ? 'bg-gray-50 text-gray-700 border-gray-300 font-semibold'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${savingStepResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-testid="status-not-executed"
                      >
                        NOT EXECUTED
                      </button>
                      <button
                        onClick={() => handleStatusChange('pass')}
                        disabled={savingStepResult}
                        className={`px-4 py-2 border transition-all ${
                          tempResult.status === 'pass'
                            ? 'bg-green-50 text-green-700 border-green-300 font-semibold'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:bg-green-50'
                        } ${savingStepResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-testid="status-pass"
                      >
                        PASS
                      </button>
                      <button
                        onClick={() => handleStatusChange('fail')}
                        disabled={savingStepResult}
                        className={`px-4 py-2 border transition-all ${
                          tempResult.status === 'fail'
                            ? 'bg-red-50 text-red-700 border-red-300 font-semibold'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:bg-red-50'
                        } ${savingStepResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-testid="status-fail"
                      >
                        FAIL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only view when locked */}
            {isLocked && (
              <div className="space-y-4">
                <div>
                  <Text weight="semibold" className="mb-2">Status</Text>
                  {getStatusBadge(tempResult.status)}
                </div>

                {tempResult.actualResult && (
                  <div>
                    <Text weight="semibold" className="mb-2">Actual Result</Text>
                    <div className="bg-gray-50 rounded p-3">
                      <Text>{tempResult.actualResult}</Text>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end gap-2">
            {!isLocked && (
              <Button
                variant="primary"
                onClick={handleSaveStep}
                disabled={savingStepResult || !hasUnsavedChanges}
                testid="save-step"
              >
                <Save className="h-4 w-4" />
                {savingStepResult ? 'Saving...' : 'Save Step'}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={onClose}
              testid="close-modal"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}