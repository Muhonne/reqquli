import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button, Input, Textarea, Badge, Text, MonoText, Heading, Stack } from '../atoms';
import { FormField, MetadataSection, PasswordConfirmModal, Modal, TestCaseTraceEditModal, TraceLinksSection, TestResultLink } from '../molecules';
import useTestRunStore from '../../stores/testRunStore';
import { testCaseApprovalService } from '../../services/testCaseApprovalService';

interface TestStepInput {
  action: string;
  expectedResult: string;
}

interface TestCaseFormProps {
  isCreateMode?: boolean;
}

export function TestCaseForm({ isCreateMode = false }: TestCaseFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    testCases,
    currentTestSteps,
    loading,
    createTestCase,
    updateTestCase,
    fetchTestCases,
    deleteTestCase
  } = useTestRunStore();

  // Get test case from store
  const testCase = useMemo(() => {
    if (!id || id === 'new' || isCreateMode) {return null;}
    return testCases.find(tc => tc.id === id);
  }, [testCases, id, isCreateMode]);

  // Internal state
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showCreateApprovalForm, setShowCreateApprovalForm] = useState(false);
  const [showEditApprovalForm, setShowEditApprovalForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [showTraceEditModal, setShowTraceEditModal] = useState(false);
  const [upstreamTraces, setUpstreamTraces] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    type: 'user' | 'system' | 'testcase';
  }>>([]);
  const [downstreamTraces, setDownstreamTraces] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    result?: string;
    type: 'user' | 'system' | 'testcase' | 'testresult';
    testRunId?: string;
    testRunName?: string;
  }>>([]);
  const [loadingTraces, setLoadingTraces] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<TestStepInput[]>([{ action: '', expectedResult: '' }]);
  const [linkedRequirements, setLinkedRequirements] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<{title?: string, description?: string, steps?: string}>({});

  // Memoize existing steps to prevent infinite loops
  const existingSteps = useMemo(() => {
    return currentTestSteps[id || ''] || [];
  }, [currentTestSteps, id]);

  // Track if we've initialized the form for this test case
  const initializedRef = useRef<string | null>(null);
  // Track if we should focus on a new step
  const focusNewStep = useRef(false);

  // Load traces for the test case
  const loadTraces = useCallback(async (tc: { id: string }) => {
    if (!tc || !tc.id) {
      return;
    }

    setLoadingTraces(true);
    try {
      // Load traces using the traces API
      const response = await fetch(`/api/test-cases/${tc.id}/traces`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Map upstream traces to display linked requirements
        // Determine type from ID prefix (UR-, SR-, RISK-, etc.)
        const mappedUpstream = (data.upstreamTraces || []).map((trace: any) => {
          const id = trace.from_requirement_id;
          const type = id?.startsWith('UR-') ? 'user' :
                       id?.startsWith('SR-') ? 'system' :
                       id?.startsWith('RISK-') ? 'risk' : 'system';
          return {
            id,
            title: trace.from_title || id,
            description: trace.description,
            status: trace.status,
            type: type as 'user' | 'system' | 'testcase' | 'risk'
          };
        });
        setUpstreamTraces(mappedUpstream);

        // Map downstream traces
        const mappedDownstream = (data.downstreamTraces || []).map((trace: any) => {
          const id = trace.to_requirement_id;
          const type = trace.trace_type || (id?.startsWith('TRES-') ? 'testresult' : 'testcase');
          return {
            id,
            title: trace.to_title || trace.testRunName || id,
            description: trace.description,
            status: trace.status,
            type: type as 'user' | 'system' | 'testcase' | 'testresult',
            result: trace.result,
            testRunId: trace.testRunId,
            testRunName: trace.testRunName
          };
        });
        setDownstreamTraces(mappedDownstream);
      } else {
        // Failed to load traces
        setUpstreamTraces([]);
        setDownstreamTraces([]);
      }
    } catch {
      // Failed to load traces
      setUpstreamTraces([]);
      setDownstreamTraces([]);
    } finally {
      setLoadingTraces(false);
    }
  }, []);

  // Load test case data when component mounts or ID changes
  useEffect(() => {
    if (!isCreateMode && id && id !== 'new') {
      // Only fetch if we don't have the test case in the store
      const existingTestCase = testCases.find(tc => tc.id === id);
      if (!existingTestCase) {
        fetchTestCases();
      } else {
        loadTraces(existingTestCase);
      }
    }
  }, [id, isCreateMode, testCases, fetchTestCases, loadTraces]);

  // Initialize form fields when entering edit mode or test case changes
  useEffect(() => {
    if (isCreateMode) {
      // Reset form for create mode
      if (initializedRef.current !== 'create') {
        setTitle('');
        setDescription('');
        setSteps([{ action: '', expectedResult: '' }]);
        setLinkedRequirements([]);
        setValidationErrors({});
        initializedRef.current = 'create';
      }
      return;
    }

    // Only update form fields when we have a test case and are editing
    if (isEditing && testCase && !isCreateMode) {
      // Only initialize once per test case
      if (initializedRef.current !== testCase.id) {
        setTitle(testCase.title);
        setDescription(testCase.description || '');
        // Convert existing steps to form format
        if (existingSteps.length > 0) {
          setSteps(existingSteps.map(s => ({
            action: s.action,
            expectedResult: s.expectedResult
          })));
        } else {
          setSteps([{ action: '', expectedResult: '' }]);
        }
        setLinkedRequirements(testCase.linkedRequirements || []);
        setValidationErrors({});
        initializedRef.current = testCase.id;
        // Load traces for this test case
        loadTraces(testCase);
      }
    }
  }, [isEditing, isCreateMode, testCase, existingSteps, loadTraces]);

  // Reset to detail view when ID changes (unless in create mode)
  useEffect(() => {
    if (!isCreateMode) {
      setIsEditing(false);
      // Reset initialized ref when changing test cases
      initializedRef.current = null;
    }
  }, [id, isCreateMode]);

  // Focus on new step when added
  useEffect(() => {
    if (focusNewStep.current && steps.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const actionTextareas = document.querySelectorAll('textarea[placeholder="Describe the action to perform"]');
        const lastActionTextarea = actionTextareas[actionTextareas.length - 1] as HTMLTextAreaElement;
        if (lastActionTextarea) {
          lastActionTextarea.focus();
          lastActionTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        focusNewStep.current = false;
      }, 50);
    }
  }, [steps.length]);

  // Handlers
  const handleEdit = useCallback(() => {
    if (testCase?.status === 'approved') {
      setShowPasswordConfirm(true);
    } else {
      // Reset initialized ref when entering edit mode
      initializedRef.current = null;
      setIsEditing(true);
    }
  }, [testCase?.status]);

  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!testCase) {return;}

    // Ensure we have steps - use existing steps or a default step
    const stepsToSend = existingSteps.length > 0
      ? existingSteps.map(s => ({
          action: s.action,
          expectedResult: s.expectedResult
        }))
      : [{ action: 'Test step', expectedResult: 'Expected result' }];

    // Update test case with password to revert to draft (using store like requirements do)
    await updateTestCase(testCase.id, {
      title: testCase.title,
      description: testCase.description || '',
      steps: stepsToSend,
      linkedRequirements: testCase.linkedRequirements || [],
      password
    });

    // Only switch to edit mode if the update was successful
    initializedRef.current = null;
    setIsEditing(true);
    setShowPasswordConfirm(false);
    // Refresh to get updated revision
    await fetchTestCases();
  }, [testCase, existingSteps, updateTestCase, fetchTestCases]);

  const handleCancel = useCallback(() => {
    if (isCreateMode) {
      navigate('/test-cases');
    } else {
      setIsEditing(false);
    }
  }, [isCreateMode, navigate]);

  const handleAddStep = () => {
    setSteps([...steps, { action: '', expectedResult: '' }]);
    focusNewStep.current = true;
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: 'action' | 'expectedResult', value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const validateForm = useCallback(() => {
    const errors: {title?: string, description?: string, steps?: string} = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
    }

    if (steps.length === 0) {
      errors.steps = 'At least one test step is required';
    } else if (steps.some(s => !s.action.trim() || !s.expectedResult.trim())) {
      errors.steps = 'All test steps must have an action and expected result';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }

    setValidationErrors({});
    return true;
  }, [title, description, steps]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {e.preventDefault();}

    if (!isCreateMode && !isEditing) {return;}
    if (!validateForm()) {return;}

    try {
      if (isCreateMode) {
        const newTestCase = await createTestCase({
          title: title.trim(),
          description: description.trim(),
          steps,
          linkedRequirements
        });
        navigate(`/test-cases/${newTestCase.id}`);
      } else if (testCase) {
        // Update existing test case
        await updateTestCase(testCase.id, {
          title: title.trim(),
          description: description.trim(),
          steps,
          linkedRequirements
        });
        setIsEditing(false);
        // Reset the initialized ref after successful update
        initializedRef.current = null;
        // Refresh test cases to get updated data
        await fetchTestCases();
      }
    } catch {
      // Error saving test case - validation or network error
      // Error is handled by the store
    }
  }, [isCreateMode, isEditing, testCase, title, description, steps, linkedRequirements, createTestCase, updateTestCase, navigate, validateForm, fetchTestCases]);

  const handleCreateAndApprove = useCallback(async (password: string) => {
    // Use approval service to create and approve in one operation
    const newTestCase = await testCaseApprovalService.createTestCaseWithApproval(
      title.trim(),
      description.trim(),
      steps,
      linkedRequirements,
      password
    );

    // Navigate to the new test case and refresh
    navigate(`/test-cases/${newTestCase.id}`);
    await fetchTestCases();
  }, [title, description, steps, linkedRequirements, navigate, fetchTestCases]);

  const handleEditAndApprove = useCallback(async (password: string) => {
    if (!testCase) {return;}

    // Use approval service to update and approve
    await testCaseApprovalService.updateTestCaseWithApproval(
      testCase.id,
      title.trim(),
      description.trim(),
      steps,
      linkedRequirements,
      password,
      testCase.status === 'approved'
    );

    // Exit to detail view and refresh
    setIsEditing(false);
    initializedRef.current = null;
    await fetchTestCases();
  }, [testCase, title, description, steps, linkedRequirements, fetchTestCases]);

  const handleApprove = useCallback(async (password: string) => {
    if (!testCase) {return;}

    // Use approval service to bypass store error handling
    await testCaseApprovalService.approveTestCase(testCase.id, password);

    // Refresh test cases to get updated data
    await fetchTestCases();
  }, [testCase, fetchTestCases]);

  const handleDelete = useCallback(async () => {
    if (!testCase) {return;}

    // Check if test case is approved
    if (testCase.status === 'approved') {
      setShowDeletePasswordModal(true);
    } else {
      setShowDeleteConfirm(true);
    }
  }, [testCase]);

  // Show loading state
  if (!isCreateMode && !testCase && id !== 'new') {
    return <Stack className="p-6"><Text>Loading test case...</Text></Stack>;
  }

  // Show not found
  if (!isCreateMode && !testCase && id !== 'new') {
    return <Stack className="p-6"><Text>Test case not found</Text></Stack>;
  }

  const canEdit = testCase; // Can edit both draft and approved test cases
  const canApprove = testCase && testCase.status === 'draft';
  const canDelete = testCase; // Can delete both draft and approved test cases

  // Detail view (non-edit mode)
  if (!isEditing && !isCreateMode && testCase) {
    const metadataFields = [
      { label: 'Created By', value: testCase.createdByName || 'Unknown' },
      { label: 'Created At', value: new Date(testCase.createdAt).toLocaleString() }
    ];

    if (testCase.approvedAt) {
      metadataFields.push(
        { label: 'Approved By', value: testCase.approvedByName || 'Unknown' },
        { label: 'Approved At', value: new Date(testCase.approvedAt).toLocaleString() }
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="grid grid-cols-3 gap-4">
                <FormField label="ID">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                    <MonoText>{testCase.id}</MonoText>
                  </div>
                </FormField>

                <FormField label="Revision">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                    <Text weight="semibold">{testCase.revision || 0}</Text>
                  </div>
                </FormField>

                <FormField label="Status">
                  <div className="flex">
                    {testCase.status === 'approved' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </div>
                </FormField>
              </div>

              {/* Title and Description */}
              <FormField label="Title" required>
                <Input
                  value={testCase.title}
                  disabled
                  className="disabled:text-gray-900 disabled:opacity-100"
                />
              </FormField>

              <FormField label="Description" required>
                <Textarea
                  value={testCase.description || ''}
                  disabled
                  rows={6}
                  className="disabled:text-gray-900 disabled:opacity-100"
                />
              </FormField>

              {/* Test Steps */}
              <FormField label="Test Steps">
                {existingSteps.length === 0 ? (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-500">
                    No test steps defined
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    {existingSteps.map((step, index) => (
                      <div
                        key={`step-${index}`}
                        className={`px-5 py-4 ${index > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50 transition-colors`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center text-sm font-bold border border-gray-300">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <Text variant="small" weight="semibold" className="text-gray-600 uppercase tracking-wide mb-1 block">
                                ACTION
                              </Text>
                              <Text className="text-gray-900 leading-relaxed">{step.action}</Text>
                            </div>
                            <div>
                              <Text variant="small" weight="semibold" className="text-gray-600 uppercase tracking-wide mb-1 block">
                                EXPECTED RESULT
                              </Text>
                              <Text className="text-gray-900 leading-relaxed">{step.expectedResult}</Text>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FormField>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleEdit}
                      disabled={loading}
                      className="h-10"
                      testid="test-case-edit"
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleDelete}
                      disabled={loading}
                      className="h-10 text-red-700 hover:text-red-800"
                      testid="test-case-delete"
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div>
                  {canApprove && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setShowApprovalModal(true)}
                      disabled={loading}
                      className="h-10"
                      testid="test-case-approve"
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>

              {/* Traces Section */}
              <div className="space-y-4">
                {/* Upstream Traces Section - System Requirements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Heading level={2} className="text-base font-medium">
                      Trace from
                    </Heading>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowTraceEditModal(true)}
                      disabled={loading}
                      data-testid="testcase-edit-traces"
                    >
                      Edit Traces
                    </Button>
                  </div>
                  <TraceLinksSection
                    title=""
                    links={upstreamTraces}
                    type="system"
                    loading={loadingTraces}
                  />
                </div>

                {/* Test Results Section - Automatically generated from approved test runs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Heading level={2} className="text-base font-medium">
                      Test Execution Results
                    </Heading>
                    <Text variant="small" color="muted">
                      Generated from approved test runs
                    </Text>
                  </div>
                  {downstreamTraces.filter(t => t.type === 'testresult').length > 0 ? (
                    <div className="w-full border border-gray-300 bg-white px-3 py-2">
                      <div className="space-y-0.5">
                        {downstreamTraces.filter(t => t.type === 'testresult').map((result: any) => (
                          <TestResultLink
                            key={result.id}
                            id={result.id}
                            testRunId={result.testRunId}
                            testRunName={result.title || result.testRunName}
                            description={result.description}
                            result={result.result || 'pass'}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 italic">
                      No test results yet. Results will appear here after test runs are approved.
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <MetadataSection fields={metadataFields} />
            </div>
          </div>
        </div>

        {/* Approval Modal */}
        <PasswordConfirmModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onConfirm={handleApprove}
          title="Approve Test Case"
          message="Enter your password to approve this test case. Once approved, it cannot be modified without re-approval."
        />

        {/* Password Confirm Modal for Editing Approved Test Case */}
        {showPasswordConfirm && (
          <PasswordConfirmModal
            isOpen={showPasswordConfirm}
            onClose={() => setShowPasswordConfirm(false)}
            onConfirm={handlePasswordConfirm}
            title="Edit Approved Test Case"
            message="This test case is approved. Editing it will revert it to draft status. Please enter your password to continue."
          />
        )}

        {/* Delete Confirmation Dialog - Only for draft test cases */}
        {testCase?.status === 'draft' && (
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Delete Test Case"
          >
            <Stack spacing="md">
              <Text>
                Are you sure you want to delete test case <strong>{testCase?.id}</strong>?
              </Text>
              <Text color="muted" variant="small">
                This action cannot be undone. The test case and all its test steps will be permanently removed.
              </Text>
              <Stack direction="horizontal" spacing="sm" justify="end">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await deleteTestCase(testCase.id);
                    navigate('/test-cases');
                  }}
                  disabled={loading}
                  className="text-red-700 hover:text-red-800"
                >
                  Delete Test Case
                </Button>
              </Stack>
            </Stack>
          </Modal>
        )}

        {/* Delete Password Modal - For approved test cases */}
        {testCase && (
          <PasswordConfirmModal
            isOpen={showDeletePasswordModal}
            onClose={() => setShowDeletePasswordModal(false)}
            onConfirm={async (password: string) => {
              // Use approval service to delete with password
              await testCaseApprovalService.deleteTestCaseWithPassword(testCase.id, password);
              navigate('/test-cases');
            }}
            title="Delete Test Case"
            message="This test case is approved. Please enter your password to delete it."
            confirmText="Delete Test Case"
            loadingText="Deleting..."
          />
        )}

        {/* Test Case Trace Edit Modal - For View Mode */}
        {testCase && testCase.id && (
          <TestCaseTraceEditModal
            isOpen={showTraceEditModal}
            onClose={() => setShowTraceEditModal(false)}
            testCaseId={testCase.id}
            onSave={async () => {
              // Refresh traces
              await loadTraces(testCase);
              // Update linkedRequirements from upstream traces
              setLinkedRequirements(upstreamTraces.map(t => t.id));
            }}
          />
        )}
      </div>
    );
  }

  // Edit/Create Form View
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header for create mode */}
            {isCreateMode && (
              <>
                <Heading level={2}>Create Test Case</Heading>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="ID">
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                      <Text color="muted">Will be auto-generated</Text>
                    </div>
                  </FormField>

                  <FormField label="Revision">
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                      <Text weight="semibold">0</Text>
                    </div>
                  </FormField>

                  <FormField label="Status">
                    <div className="flex">
                      <Badge variant="warning">Draft</Badge>
                    </div>
                  </FormField>
                </div>
              </>
            )}

            {/* Header for edit mode */}
            {!isCreateMode && testCase && (
              <div className="grid grid-cols-3 gap-4">
                <FormField label="ID">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <MonoText>{testCase.id}</MonoText>
                  </div>
                </FormField>

                <FormField label="Revision">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <Text weight="semibold">{testCase.revision || 0}</Text>
                  </div>
                </FormField>

                <FormField label="Status">
                  <div className="flex">
                    {testCase.status === 'approved' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </div>
                </FormField>
              </div>
            )}

            {/* Title and Description */}
            <FormField label="Title" required error={validationErrors.title}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter test case title"
                disabled={loading}
              />
            </FormField>

            <FormField label="Description" required error={validationErrors.description}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the test case purpose and scope"
                rows={6}
                disabled={loading}
              />
            </FormField>

            {/* Test Steps */}
            <div className="space-y-4">
              <Heading level={2}>Test Steps</Heading>

              {validationErrors.steps && (
                <Text variant="small" className="text-red-600">{validationErrors.steps}</Text>
              )}

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`px-6 py-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <GripVertical className="h-5 w-5 text-gray-400 mb-1" />
                        <div className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center text-sm font-bold border border-gray-300">
                          {index + 1}
                        </div>
                        {steps.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => handleRemoveStep(index)}
                            variant="secondary"
                            size="sm"
                            className="mt-2 p-1 opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Action *
                          </label>
                          <Textarea
                            placeholder="Describe the action to perform"
                            value={step.action}
                            onChange={(e) => handleStepChange(index, 'action', e.target.value)}
                            rows={2}
                            disabled={loading}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Expected Result *
                          </label>
                          <Textarea
                            placeholder="Describe the expected outcome"
                            value={step.expectedResult}
                            onChange={(e) => handleStepChange(index, 'expectedResult', e.target.value)}
                            rows={2}
                            disabled={loading}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Step button at the bottom */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Button
                    type="button"
                    onClick={handleAddStep}
                    variant="secondary"
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </Button>
                </div>
              </div>
            </div>


            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>

              <div className="flex gap-2">
                {isCreateMode ? (
                  <>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!validateForm()) {return;}
                        setShowCreateApprovalForm(true);
                      }}
                      disabled={loading}
                    >
                      Create & Approve
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!validateForm()) {return;}
                        setShowEditApprovalForm(true);
                      }}
                      disabled={loading}
                    >
                      Save & Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Create & Approve Modal */}
      <PasswordConfirmModal
        isOpen={showCreateApprovalForm}
        onClose={() => setShowCreateApprovalForm(false)}
        onConfirm={handleCreateAndApprove}
        title="Create & Approve Test Case"
        message="Enter your password to create and immediately approve this test case."
      />

      {/* Save & Approve Modal */}
      <PasswordConfirmModal
        isOpen={showEditApprovalForm}
        onClose={() => setShowEditApprovalForm(false)}
        onConfirm={handleEditAndApprove}
        title="Save & Approve Test Case"
        message="Enter your password to save changes and approve this test case."
      />

      {/* Test Case Trace Edit Modal */}
      {testCase && (
        <TestCaseTraceEditModal
          isOpen={showTraceEditModal}
          onClose={() => setShowTraceEditModal(false)}
          testCaseId={testCase.id}
          onSave={async () => {
            // Refresh traces
            await loadTraces(testCase);
            // Update linkedRequirements from upstream traces
            setLinkedRequirements(upstreamTraces.map(t => t.id));
          }}
        />
      )}
    </div>
  );
}