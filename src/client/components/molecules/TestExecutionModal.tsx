import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Textarea } from '../atoms/Textarea';
import { Text } from '../atoms/Text';
import { ChevronLeft, ChevronRight, Save, X, Download } from 'lucide-react';
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
  const { 
    updateStepResult, 
    uploadEvidence, 
    downloadEvidence,
    executeTestCase,
    savingStepResult,
    error
  } = useTestRunStore();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tempResult, setTempResult] = useState<{ status: StepStatus; actualResult: string; evidenceFileId?: string }>({
    status: 'not_executed',
    actualResult: ''
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentStep = testSteps[currentStepIndex];
  const totalSteps = testSteps.length;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setHasUnsavedChanges(false);
      setSaveError(null);
      
      // Execute test case if it hasn't been started yet
      if (testRunCase.status === 'not_started') {
        executeTestCase(testRunId, testRunCase.testCaseId).catch(() => {
          // Error is handled in store
        });
      }
    } else {
      // Reset to first step when modal closes
      setCurrentStepIndex(0);
      setHasUnsavedChanges(false);
      setSaveError(null);
    }
  }, [isOpen, testRunId, testRunCase.testCaseId, testRunCase.status, executeTestCase]);

  // Load step result when step changes
  useEffect(() => {
    if (isOpen && currentStep) {
      const existingResult = (stepResults || []).find(sr => sr && sr.stepNumber === currentStep.stepNumber);
      setTempResult({
        status: existingResult?.status || 'not_executed',
        actualResult: existingResult?.actualResult || '',
        evidenceFileId: existingResult?.evidenceFileId
      });
      setHasUnsavedChanges(false);
      setSaveError(null);
    }
  }, [isOpen, currentStepIndex, currentStep, stepResults]);

  // Focus textarea when step changes (only if modal is open and not locked)
  useEffect(() => {
    if (isOpen && !isLocked && currentStep && textareaRef.current) {
      // Small delay to ensure the DOM has updated
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isLocked, currentStepIndex, currentStep]);

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

    // Don't allow saving with 'not_executed' status
    if (tempResult.status === 'not_executed') {
      setSaveError('Please select a status (PASS or FAIL) before saving.');
      return;
    }

    // Require actual result
    if (!tempResult.actualResult || tempResult.actualResult.trim() === '') {
      setSaveError('Please provide an actual result before saving.');
      return;
    }

    setSaveError(null);

    try {
      await updateStepResult(testRunId, testRunCase.testCaseId, currentStep.stepNumber, {
        status: tempResult.status,
        actualResult: tempResult.actualResult.trim()
      });

      setHasUnsavedChanges(false);

      // Auto-advance to next step if not on last step
      if (currentStepIndex < totalSteps - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } catch (err) {
      setSaveError('Failed to save step result. Please try again.');
      console.error('Error saving step result:', err);
    }
  }, [currentStep, testRunId, testRunCase.testCaseId, tempResult, updateStepResult, currentStepIndex, totalSteps]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!currentStep) {return;}

    setUploadingFile(true);
    setSaveError(null);

    try {
      const fileId = await uploadEvidence(testRunId, testRunCase.testCaseId, currentStep.stepNumber, file);
      
      // Update the step result with the evidence file ID, preserving current status and actual result
      await updateStepResult(testRunId, testRunCase.testCaseId, currentStep.stepNumber, {
        status: tempResult.status === 'not_executed' ? 'pass' : tempResult.status,
        actualResult: tempResult.actualResult || 'Evidence uploaded',
        evidenceFileId: fileId
      });
      
      // Update local state to reflect the evidence upload
      setTempResult(prev => ({ ...prev, evidenceFileId: fileId }));
      setHasUnsavedChanges(false);
    } catch (err) {
      setSaveError('Failed to upload evidence file. Please try again.');
      console.error('Error uploading evidence:', err);
    } finally {
      setUploadingFile(false);
    }
  }, [currentStep, testRunId, testRunCase.testCaseId, tempResult, uploadEvidence, updateStepResult]);

  const handleDownloadEvidence = useCallback(async (fileId: string) => {
    try {
      await downloadEvidence(fileId);
    } catch (err) {
      setSaveError('Failed to download evidence file.');
      console.error('Error downloading evidence:', err);
    }
  }, [downloadEvidence]);

  const handleStatusChange = useCallback((status: StepStatus) => {
    setTempResult(prev => ({ ...prev, status }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  }, []);

  const handleActualResultChange = useCallback((actualResult: string) => {
    setTempResult(prev => ({ ...prev, actualResult }));
    setHasUnsavedChanges(true);
    setSaveError(null);
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

  const currentStepResult = useMemo(() => {
    if (!currentStep) {return null;}
    return (stepResults || []).find(sr => sr && sr.stepNumber === currentStep.stepNumber);
  }, [currentStep, stepResults]);

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
          disabled={currentStepIndex === 0 || savingStepResult}
          testid="step-previous"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNextStep}
          disabled={currentStepIndex === totalSteps - 1 || savingStepResult}
          testid="step-next"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ), [testRunCase.testCase?.title, testRunCase.testCaseId, currentStepIndex, totalSteps, handlePreviousStep, handleNextStep, savingStepResult]);

  if (!currentStep) {return null;}

  const canSave = hasUnsavedChanges && 
                  tempResult.status !== 'not_executed' && 
                  tempResult.actualResult.trim() !== '';

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
            {/* Error message */}
            {(saveError || error) && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <Text className="text-red-600 text-sm">{saveError || error}</Text>
              </div>
            )}

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
                    <Text className="text-xs text-gray-500 ml-1">(required)</Text>
                  </label>
                  <Textarea
                    ref={textareaRef}
                    value={tempResult.actualResult}
                    onChange={(e) => handleActualResultChange(e.target.value)}
                    rows={4}
                    placeholder="Describe what actually happened..."
                    disabled={savingStepResult || uploadingFile}
                    testid="step-actual-result"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">
                      <Text weight="semibold">Evidence</Text>
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="file"
                          id="evidence-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {handleFileUpload(file);}
                            // Reset input so same file can be selected again
                            e.target.value = '';
                          }}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          disabled={savingStepResult || uploadingFile}
                          className="hidden"
                          data-testid="evidence-upload"
                        />
                        <label
                          htmlFor="evidence-upload"
                          className={`inline-block px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors rounded ${
                            savingStepResult || uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {uploadingFile ? 'Uploading...' : 'Choose File'}
                        </label>
                      </div>
                      {currentStepResult?.evidenceFileId && (
                        <div className="flex items-center gap-2 text-sm">
                          <Text className="text-gray-600">Evidence uploaded</Text>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadEvidence(currentStepResult.evidenceFileId!)}
                            disabled={savingStepResult}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2">
                      <Text weight="semibold">Status</Text>
                      <Text className="text-xs text-gray-500 ml-1">(required)</Text>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStatusChange('not_executed')}
                        disabled={savingStepResult || uploadingFile}
                        variant={tempResult.status === 'not_executed' ? 'primary' : 'secondary'}
                        size="sm"
                        className={tempResult.status === 'not_executed' ? '' : 'text-gray-500'}
                        testid="status-not-executed"
                      >
                        NOT EXECUTED
                      </Button>
                      <Button
                        onClick={() => handleStatusChange('pass')}
                        disabled={savingStepResult || uploadingFile}
                        variant={tempResult.status === 'pass' ? 'primary' : 'secondary'}
                        size="sm"
                        className={tempResult.status === 'pass' ? 'bg-green-600 hover:bg-green-700 border-0' : 'text-gray-500'}
                        testid="status-pass"
                      >
                        PASS
                      </Button>
                      <Button
                        onClick={() => handleStatusChange('fail')}
                        disabled={savingStepResult || uploadingFile}
                        variant={tempResult.status === 'fail' ? 'primary' : 'secondary'}
                        size="sm"
                        className={tempResult.status === 'fail' ? 'bg-red-600 hover:bg-red-700 border-0' : 'text-gray-500'}
                        testid="status-fail"
                      >
                        FAIL
                      </Button>
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

                {currentStepResult?.evidenceFileId && (
                  <div>
                    <Text weight="semibold" className="mb-2">Evidence</Text>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadEvidence(currentStepResult.evidenceFileId!)}
                    >
                      <Download className="h-3 w-3" />
                      Download Evidence
                    </Button>
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
                disabled={savingStepResult || uploadingFile || !canSave}
                testid="save-step"
              >
                <Save className="h-4 w-4" />
                {savingStepResult ? 'Saving...' : 'Save Step'}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={onClose}
              disabled={savingStepResult || uploadingFile}
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
