import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Badge, Text, Heading, Stack, MonoText } from '../atoms';
import { FormField, MetadataSection, PasswordConfirmModal, TraceLinksSection, TraceEditModal } from '../molecules';
import { riskApi, tracesApi } from '../../services/api';
import { approvalService } from '../../services/approvalService';
import { RiskRecord } from '../../../types/risks';
import { RequirementTrace } from '../../../types/traces';
import {
  useRisks,
  useRisksLoading,
  useCreateRisk,
  useUpdateRisk,
  useFetchRisks
} from '../../stores/riskStore';

interface RiskFormProps {
  isCreateMode?: boolean;
}

export function RiskForm({ isCreateMode = false }: RiskFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const risks = useRisks();
  const loading = useRisksLoading();
  const createRisk = useCreateRisk() as (data: import('../../../types/risks').CreateRiskRecordRequest) => Promise<RiskRecord>;
  const updateRisk = useUpdateRisk() as (id: string, data: import('../../../types/risks').UpdateRiskRecordRequest) => Promise<RiskRecord>;
  const fetchRisks = useFetchRisks() as (filters?: import('../../../types/risks').RiskRecordFilters) => Promise<void>;

  const [risk, setRisk] = useState<RiskRecord | null>(null);
  const [loadingRequirement, setLoadingRequirement] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateApprovalForm, setShowCreateApprovalForm] = useState(false);
  const [showEditApprovalForm, setShowEditApprovalForm] = useState(false);
  const [showDownstreamTraceModal, setShowDownstreamTraceModal] = useState(false);
  const [downstreamTraces, setDownstreamTraces] = useState<RequirementTrace[]>([]);
  const [loadingTraced, setLoadingTraced] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hazard, setHazard] = useState('');
  const [harm, setHarm] = useState('');
  const [foreseeableSequence, setForeseeableSequence] = useState('');
  const [severity, setSeverity] = useState<number>(1);
  const [probabilityP1, setProbabilityP1] = useState<number>(1);
  const [probabilityP2, setProbabilityP2] = useState<number>(1);
  const [pTotalCalculationMethod, setPTotalCalculationMethod] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Clear form function
  const clearForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setHazard('');
    setHarm('');
    setForeseeableSequence('');
    setSeverity(1);
    setProbabilityP1(1);
    setProbabilityP2(1);
    setPTotalCalculationMethod('');
    setValidationErrors({});
    setRisk(null);
    setIsEditing(true); // Create mode is always in edit mode
  }, []);

  // Fetch risk if we have an ID but it's not in the store
  useEffect(() => {
    if (!id || id === 'new' || isCreateMode) {
      clearForm();
      return;
    }

    const loadRiskData = async () => {
      // First check if it's in the store
      const storeRisk = Array.isArray(risks) ? risks.find((r: RiskRecord) => r.id.toUpperCase() === id.toUpperCase()) : null;
      if (storeRisk) {
        setRisk(storeRisk);
        setTitle(storeRisk.title);
        setDescription(storeRisk.description);
        setHazard(storeRisk.hazard);
        setHarm(storeRisk.harm);
        setForeseeableSequence(storeRisk.foreseeableSequence || '');
        setSeverity(storeRisk.severity);
        setProbabilityP1(storeRisk.probabilityP1);
        setProbabilityP2(storeRisk.probabilityP2);
        setPTotalCalculationMethod(storeRisk.pTotalCalculationMethod);
        setIsEditing(false);
        return;
      }

      // If not in store, fetch it
      setLoadingRequirement(true);
      try {
        const response = await riskApi.get(id.toUpperCase());
        const fetchedRisk = response.requirement;
        setRisk(fetchedRisk);
        setTitle(fetchedRisk.title);
        setDescription(fetchedRisk.description);
        setHazard(fetchedRisk.hazard);
        setHarm(fetchedRisk.harm);
        setForeseeableSequence(fetchedRisk.foreseeableSequence || '');
        setSeverity(fetchedRisk.severity);
        setProbabilityP1(fetchedRisk.probabilityP1);
        setProbabilityP2(fetchedRisk.probabilityP2);
        setPTotalCalculationMethod(fetchedRisk.pTotalCalculationMethod);
        setIsEditing(false);
      } catch {
        // Error is logged by the API layer
        setRisk(null);
      } finally {
        setLoadingRequirement(false);
      }
    };

    loadRiskData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreateMode, clearForm]);

  // Load traces when risk is loaded
  useEffect(() => {
    const loadTraces = async () => {
      if (!risk || !risk.id) {
        setDownstreamTraces([]);
        return;
      }

      setLoadingTraced(true);
      try {
        const tracesResponse = await tracesApi.getRequirementTraces(risk.id);
        setDownstreamTraces(tracesResponse.downstreamTraces);
      } catch {
        // Error is logged by the API layer
        setDownstreamTraces([]);
      } finally {
        setLoadingTraced(false);
      }
    };

    loadTraces();
  }, [risk]);

  const handleSave = async () => {
    setValidationErrors({});

    if (!title.trim()) {
      setValidationErrors({ title: 'Title is required' });
      return;
    }
    if (!description.trim()) {
      setValidationErrors({ description: 'Description is required' });
      return;
    }
    if (!hazard.trim()) {
      setValidationErrors({ hazard: 'Hazard is required' });
      return;
    }
    if (!harm.trim()) {
      setValidationErrors({ harm: 'Harm is required' });
      return;
    }
    if (!pTotalCalculationMethod.trim()) {
      setValidationErrors({ pTotalCalculationMethod: 'P_total calculation method is required' });
      return;
    }

    try {
      if (isCreateMode) {
        const newRisk = await createRisk({
          title,
          description,
          hazard,
          harm,
          foreseeableSequence: foreseeableSequence || undefined,
          severity,
          probabilityP1,
          probabilityP2,
          pTotalCalculationMethod,
        });
        // Refresh the risks list to ensure the new risk appears
        await fetchRisks();
        navigate(`/risks/${newRisk.id}`);
      } else if (risk) {
        const updatedRisk = await updateRisk(risk.id, {
          title,
          description,
          hazard,
          harm,
          foreseeableSequence: foreseeableSequence || undefined,
          severity,
          probabilityP1,
          probabilityP2,
          pTotalCalculationMethod,
        });
        setIsEditing(false);
        // Update local state with the updated risk
        setRisk(updatedRisk);
        setTitle(updatedRisk.title);
        setDescription(updatedRisk.description);
        setHazard(updatedRisk.hazard);
        setHarm(updatedRisk.harm);
        setForeseeableSequence(updatedRisk.foreseeableSequence || '');
        setSeverity(updatedRisk.severity);
        setProbabilityP1(updatedRisk.probabilityP1);
        setProbabilityP2(updatedRisk.probabilityP2);
        setPTotalCalculationMethod(updatedRisk.pTotalCalculationMethod);
      }
    } catch (error: unknown) {
      // Error is logged by the API layer
      if (error && typeof error === 'object' && 'data' in error) {
        const apiError = error as { data?: { error?: string } };
        if (apiError.data?.error) {
          setValidationErrors({ general: apiError.data.error });
        }
      }
    }
  };

  const handleCancel = () => {
    if (isCreateMode) {
      navigate('/risks');
    } else {
      setIsEditing(false);
      // Reset form to original values
      if (risk) {
        setTitle(risk.title);
        setDescription(risk.description);
        setHazard(risk.hazard);
        setHarm(risk.harm);
        setForeseeableSequence(risk.foreseeableSequence || '');
        setSeverity(risk.severity);
        setProbabilityP1(risk.probabilityP1);
        setProbabilityP2(risk.probabilityP2);
        setPTotalCalculationMethod(risk.pTotalCalculationMethod);
      }
    }
  };

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    }
    if (!description.trim()) {
      errors.description = 'Description is required';
    }
    if (!hazard.trim()) {
      errors.hazard = 'Hazard is required';
    }
    if (!harm.trim()) {
      errors.harm = 'Harm is required';
    }
    if (!pTotalCalculationMethod.trim()) {
      errors.pTotalCalculationMethod = 'P_total calculation method is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, description, hazard, harm, pTotalCalculationMethod]);

  const handleEdit = useCallback(() => {
    if (risk?.status === 'approved') {
      // Editing approved risk requires password confirmation
      setShowPasswordConfirm(true);
    } else {
      setIsEditing(true);
    }
  }, [risk]);

  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!risk) {
      return;
    }

    // Use API directly to bypass store error handling (similar to approval flow)
    // This ensures errors are properly caught and displayed in the modal
    const response = await riskApi.update(risk.id, {
      title: risk.title,
      description: risk.description,
      hazard: risk.hazard,
      harm: risk.harm,
      foreseeableSequence: risk.foreseeableSequence,
      severity: risk.severity,
      probabilityP1: risk.probabilityP1,
      probabilityP2: risk.probabilityP2,
      pTotalCalculationMethod: risk.pTotalCalculationMethod,
      password
    });
    
    const updatedRisk = response.requirement;
    // Update local state with the updated risk
    setRisk(updatedRisk);
    setTitle(updatedRisk.title);
    setDescription(updatedRisk.description);
    setHazard(updatedRisk.hazard);
    setHarm(updatedRisk.harm);
    setForeseeableSequence(updatedRisk.foreseeableSequence || '');
    setSeverity(updatedRisk.severity);
    setProbabilityP1(updatedRisk.probabilityP1);
    setProbabilityP2(updatedRisk.probabilityP2);
    setPTotalCalculationMethod(updatedRisk.pTotalCalculationMethod);
    // Only switch to edit mode if the update was successful
    setIsEditing(true);
    setShowPasswordConfirm(false);
  }, [risk]);

  const handleDelete = useCallback(() => {
    if (!risk) {
      return;
    }
    setShowDeleteConfirm(true);
  }, [risk]);

  const handleCreateAndApprove = useCallback(() => {
    if (!validateForm()) {
      return;
    }
    setShowCreateApprovalForm(true);
  }, [validateForm]);

  const handleEditAndApprove = useCallback(() => {
    if (!validateForm()) {
      return;
    }
    setShowEditApprovalForm(true);
  }, [validateForm]);

  if (loadingRequirement || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text>Loading risk...</Text>
      </div>
    );
  }

  if (!isCreateMode && !risk) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text>Risk not found</Text>
      </div>
    );
  }

  const canEdit = !!(risk && !risk.deletedAt);
  const canApprove = !!(risk && risk.status === 'draft' && !risk.deletedAt);
  const canDelete = !!(risk && !risk.deletedAt);

  return (
    <div className="h-full overflow-y-auto p-6">
      <Stack spacing="lg">
        {validationErrors.general && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <Text className="text-red-800">{validationErrors.general}</Text>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Heading level={2}>
            {isCreateMode ? 'Create New Risk' : risk?.title || 'Risk Details'}
          </Heading>
        </div>

        {!isCreateMode && risk && (
          <div className="grid grid-cols-3 gap-4">
            <FormField label="ID">
              <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                <MonoText>{risk.id}</MonoText>
              </div>
            </FormField>

            <FormField label="Revision">
              <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                <Text weight="semibold">{risk.revision}</Text>
              </div>
            </FormField>

            <FormField label="Status">
              <div className="flex">
                {risk.status === 'approved' ? (
                  <Badge variant="success">Approved</Badge>
                ) : (
                  <Badge variant="warning">Draft</Badge>
                )}
              </div>
            </FormField>
          </div>
        )}

        <FormField label="Title" required error={validationErrors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isEditing && !isCreateMode}
            placeholder="Enter risk title"
          />
        </FormField>

        <FormField label="Description" required error={validationErrors.description}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isEditing && !isCreateMode}
            placeholder="Enter risk description"
            rows={4}
          />
        </FormField>

        <FormField label="Hazard" required error={validationErrors.hazard}>
          <Textarea
            value={hazard}
            onChange={(e) => setHazard(e.target.value)}
            disabled={!isEditing && !isCreateMode}
            placeholder="Describe the hazard"
            rows={3}
          />
        </FormField>

        <FormField label="Harm" required error={validationErrors.harm}>
          <Textarea
            value={harm}
            onChange={(e) => setHarm(e.target.value)}
            disabled={!isEditing && !isCreateMode}
            placeholder="Describe the potential harm"
            rows={3}
          />
        </FormField>

        <FormField label="Foreseeable Sequence of Events">
          <Textarea
            value={foreseeableSequence}
            onChange={(e) => setForeseeableSequence(e.target.value)}
            disabled={!isEditing && !isCreateMode}
            placeholder="Describe the foreseeable sequence of events"
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Severity (1-5)" required>
            <Input
              type="number"
              min="1"
              max="5"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value) || 1)}
              disabled={!isEditing && !isCreateMode}
            />
          </FormField>

          <FormField label="P₁ (1-5)" required>
            <Input
              type="number"
              min="1"
              max="5"
              value={probabilityP1}
              onChange={(e) => setProbabilityP1(parseInt(e.target.value) || 1)}
              disabled={!isEditing && !isCreateMode}
            />
          </FormField>

          <FormField label="P₂ (1-5)" required>
            <Input
              type="number"
              min="1"
              max="5"
              value={probabilityP2}
              onChange={(e) => setProbabilityP2(parseInt(e.target.value) || 1)}
              disabled={!isEditing && !isCreateMode}
            />
          </FormField>
        </div>

        <FormField label="P_total Calculation Method" required error={validationErrors.pTotalCalculationMethod}>
          <Textarea
            value={pTotalCalculationMethod}
            onChange={(e) => setPTotalCalculationMethod(e.target.value)}
            disabled={!isEditing && !isCreateMode}
            placeholder="Document how P_total is calculated from P₁ and P₂"
            rows={3}
          />
        </FormField>

        {!isCreateMode && risk && !isEditing && (
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleEdit}
                  disabled={!!loading}
                  className="h-10"
                  testid="risk-edit"
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleDelete}
                  disabled={!!loading}
                  className="h-10 text-red-700 hover:text-red-800"
                  testid="risk-delete"
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
                  onClick={() => setShowApprovalForm(true)}
                  disabled={!!loading}
                  className="h-10"
                  testid="risk-approve"
                >
                  Approve
                </Button>
              )}
            </div>
          </div>
        )}

        {!isCreateMode && risk && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text className="text-sm font-medium text-gray-700">P_total</Text>
              <Text className="text-lg">{risk.pTotal}</Text>
            </div>
            {risk.residualRiskScore && (
              <div>
                <Text className="text-sm font-medium text-gray-700">Residual Risk Score</Text>
                <Text className="text-lg">{risk.residualRiskScore}</Text>
              </div>
            )}
          </div>
        )}

        {!isCreateMode && risk && !isEditing && (
          <>
            {/* Traces Section */}
            <div className="space-y-4">
              {/* Downstream Traces Section - Risks trace to System Requirements */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Heading level={2} className="text-base font-medium">
                    Trace to
                  </Heading>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDownstreamTraceModal(true)}
                    disabled={loading || !risk}
                    data-testid="risk-edit-traces"
                  >
                    Edit Traces
                  </Button>
                </div>
                <TraceLinksSection
                  title=""
                  links={downstreamTraces.map(trace => ({
                    id: trace.id,
                    title: trace.title,
                    type: trace.type === 'testresult' ? undefined : trace.type as 'user' | 'system' | 'testcase' | 'risk' | undefined
                  }))}
                  type="system"
                  loading={loadingTraced}
                />
              </div>
            </div>

            <MetadataSection
              fields={[
                { label: 'Created', value: risk.createdAt, type: 'date' },
                { label: 'Created By', value: risk.createdByName || 'Unknown' },
                { label: 'Modified', value: risk.lastModified, type: 'date' },
                { label: 'Modified By', value: risk.modifiedByName },
                { label: 'Approved', value: risk.approvedAt, type: 'date' },
                { label: 'Approved By', value: risk.approvedByName },
                { label: 'Approval Notes', value: risk.approvalNotes }
              ]}
            />
          </>
        )}

        {(isEditing || isCreateMode) && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} variant="primary">
              {isCreateMode ? 'Create' : 'Save'}
            </Button>
            {isCreateMode ? (
              <Button onClick={handleCreateAndApprove} variant="primary">
                Create & Approve
              </Button>
            ) : (
              <Button onClick={handleEditAndApprove} variant="primary">
                Save & Approve
              </Button>
            )}
            <Button onClick={handleCancel} variant="secondary">
              Cancel
            </Button>
          </div>
        )}

        {/* Approval modal */}
        <PasswordConfirmModal
          isOpen={showApprovalForm}
          onClose={() => {
            setShowApprovalForm(false);
            setApprovalNotes('');
          }}
          onConfirm={async (password: string) => {
            if (!risk) {
              return;
            }
            const approvedRisk = await approvalService.approveRisk(
              risk.id,
              password,
              approvalNotes.trim() || undefined
            );
            setRisk(approvedRisk);
            setShowApprovalForm(false);
            setApprovalNotes('');
          }}
          title="Approve Risk Record"
          message="This action will mark the risk record as approved and increment its revision number."
          confirmText="Approve Risk"
        >
          <FormField label="Approval Notes">
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Optional notes about this approval..."
              rows={3}
            />
          </FormField>
        </PasswordConfirmModal>

        {/* Password modal for Save & Approve in edit mode */}
        <PasswordConfirmModal
          isOpen={showEditApprovalForm}
          onClose={() => {
            setShowEditApprovalForm(false);
            setApprovalNotes('');
          }}
          onConfirm={async (password: string) => {
            if (!risk) {
              return;
            }
            const approvedRisk = await approvalService.updateRiskWithApproval(
              risk.id,
              title.trim(),
              description.trim(),
              hazard.trim(),
              harm.trim(),
              foreseeableSequence.trim() || undefined,
              severity,
              probabilityP1,
              probabilityP2,
              pTotalCalculationMethod.trim(),
              password,
              approvalNotes.trim() || undefined
            );
            setRisk(approvedRisk);
            setIsEditing(false);
            setShowEditApprovalForm(false);
            setApprovalNotes('');
            navigate(`/risks/${approvedRisk.id}`);
          }}
          title="Save & Approve Risk Record"
          message="This will save your changes and immediately mark the risk record as approved."
          confirmText="Save & Approve"
        >
          <FormField label="Approval Notes">
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Optional notes about this approval..."
              rows={3}
            />
          </FormField>
        </PasswordConfirmModal>

        {/* Password modal for Create & Approve */}
        <PasswordConfirmModal
          isOpen={showCreateApprovalForm}
          onClose={() => {
            setShowCreateApprovalForm(false);
            setApprovalNotes('');
          }}
          onConfirm={async (password: string) => {
            const newRisk = await approvalService.createRiskWithApproval(
              title.trim(),
              description.trim(),
              hazard.trim(),
              harm.trim(),
              foreseeableSequence.trim() || undefined,
              severity,
              probabilityP1,
              probabilityP2,
              pTotalCalculationMethod.trim(),
              password,
              approvalNotes.trim() || undefined
            );
            setShowCreateApprovalForm(false);
            setApprovalNotes('');
            // Refresh the risks list to ensure the new risk appears
            await fetchRisks();
            navigate(`/risks/${newRisk.id}`);
          }}
          title="Create & Approve Risk Record"
          message="This will create the risk record and immediately mark it as approved."
          confirmText="Create & Approve"
        >
          <FormField label="Approval Notes">
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Optional notes about this approval..."
              rows={3}
            />
          </FormField>
        </PasswordConfirmModal>

        {/* Password modal for Edit (when approved) */}
        {risk && risk.status === 'approved' && (
          <PasswordConfirmModal
            isOpen={showPasswordConfirm}
            onClose={() => setShowPasswordConfirm(false)}
            onConfirm={handlePasswordConfirm}
            title="Edit Approved Risk Record"
            message="This risk record is approved. Editing will revert it to draft status."
            confirmText="Edit Risk"
            loadingText="Reverting to draft..."
          />
        )}

        {/* Password modal for Delete */}
        {risk && (
          <PasswordConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={async (password: string) => {
              if (!risk) {
                return;
              }
              await approvalService.deleteRisk(risk.id, password);
              // Refresh the risks list to remove the deleted risk
              await fetchRisks();
              navigate('/risks');
            }}
            title="Delete Risk Record"
            message="This action will permanently delete this risk record. This cannot be undone."
            confirmText="Delete Risk"
          />
        )}

        {/* Trace Edit Modal */}
        {risk && (
          <TraceEditModal
            isOpen={showDownstreamTraceModal}
            onClose={() => setShowDownstreamTraceModal(false)}
            requirementId={risk.id}
            requirementType="risk"
            traceDirection="downstream"
            onSave={async () => {
              // Reload traces after saving
              if (risk?.id) {
                setLoadingTraced(true);
                try {
                  const tracesResponse = await tracesApi.getRequirementTraces(risk.id);
                  setDownstreamTraces(tracesResponse.downstreamTraces);
                } catch {
                  // Error is logged by the API layer
                } finally {
                  setLoadingTraced(false);
                }
              }
            }}
          />
        )}
      </Stack>
    </div>
  );
}

