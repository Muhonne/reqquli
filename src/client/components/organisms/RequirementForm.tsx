import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Input, Textarea, Badge, Text, MonoText, Heading, Stack } from '../atoms'
import { FormField, MetadataSection, TraceLinksSection, PasswordConfirmModal, TraceEditModal } from '../molecules'
import { tracesApi, userRequirementApi, systemRequirementApi } from '../../services/api'
import { approvalService } from '../../services/approvalService'
import {
  useUserRequirements,
  useUserRequirementsLoading,
  useUserRequirementsActions
} from '../../stores/userRequirementsStore'
import {
  useSystemRequirements,
  useSystemRequirementsLoading,
  useSystemRequirementsActions
} from '../../stores/systemRequirementStore'

interface RequirementFormProps {
  requirementType: 'user' | 'system'
  isCreateMode?: boolean
}

export function RequirementForm({ requirementType, isCreateMode = false }: RequirementFormProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Get data and actions from appropriate store
  const userRequirements = useUserRequirements()
  const userLoading = useUserRequirementsLoading()
  const userActions = useUserRequirementsActions()

  const systemRequirements = useSystemRequirements()
  const systemLoading = useSystemRequirementsLoading()
  const systemActions = useSystemRequirementsActions()

  // Select correct store data based on requirementType
  const requirements = requirementType === 'user' ? userRequirements : systemRequirements
  const loading = requirementType === 'user' ? userLoading : systemLoading
  const actions = requirementType === 'user' ? userActions : systemActions

  // Get requirement from store using URL id (unless in create mode)
  const [requirement, setRequirement] = useState<any>(null)
  const [loadingRequirement, setLoadingRequirement] = useState(false)

  // Internal state - starts in edit mode if creating new
  const [isEditing, setIsEditing] = useState(isCreateMode)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [upstreamTraces, setUpstreamTraces] = useState<any[]>([]);
  const [downstreamTraces, setDownstreamTraces] = useState<any[]>([]);
  const [loadingTraced, setLoadingTraced] = useState(false)
  const [showUpstreamTraceModal, setShowUpstreamTraceModal] = useState(false);
  const [showDownstreamTraceModal, setShowDownstreamTraceModal] = useState(false);

  // Form fields - only used when editing
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationErrors, setValidationErrors] = useState<{title?: string, description?: string}>({})
  const [showCreateApprovalForm, setShowCreateApprovalForm] = useState(false)
  const [showEditApprovalForm, setShowEditApprovalForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch requirement if we have an ID but it's not in the store
  useEffect(() => {
    if (!id || id === 'new' || isCreateMode) {
      setRequirement(null)
      return
    }

    // First check if it's in the store
    const storeRequirement = requirements?.find(r => r.id.toUpperCase() === id.toUpperCase())
    if (storeRequirement) {
      setRequirement(storeRequirement)
      return
    }

    // If not in store, fetch it
    const fetchRequirement = async () => {
      setLoadingRequirement(true)
      try {
        const api = requirementType === 'user' ? userRequirementApi : systemRequirementApi
        const response = await api.get(id.toUpperCase())
        setRequirement(response.requirement)
      } catch {
        setRequirement(null)
      } finally {
        setLoadingRequirement(false)
      }
    }

    fetchRequirement()
  }, [id, requirementType, requirements, isCreateMode])

  // Load trace relationships when requirement changes (not in create mode)
  useEffect(() => {
    if (!requirement?.id || isCreateMode) {return}

    const loadTraces = async () => {
      setLoadingTraced(true)
      try {
        const response = await tracesApi.getRequirementTraces(requirement.id)
        setUpstreamTraces(response.upstreamTraces)
        setDownstreamTraces(response.downstreamTraces)
      } catch {
        setUpstreamTraces([])
        setDownstreamTraces([])
      } finally {
        setLoadingTraced(false)
      }
    }
    loadTraces()
  }, [requirement?.id, requirementType, isCreateMode])

  // Reset to detail view when ID changes (unless in create mode)
  useEffect(() => {
    if (!isCreateMode) {
      setIsEditing(false)
    }
  }, [id, isCreateMode])

  // Initialize form fields when entering edit mode or in create mode
  useEffect(() => {
    if (isCreateMode) {
      // Always clear fields in create mode
      setTitle('')
      setDescription('')
      setValidationErrors({})
    } else if (isEditing && requirement) {
      setTitle(requirement.title)
      setDescription(requirement.description)
      setValidationErrors({})
    }
  }, [isEditing, requirement, isCreateMode])

  // Internal handlers
  const handleEdit = useCallback(() => {
    if (requirement?.status === 'approved') {
      setShowPasswordConfirm(true)
    } else {
      setIsEditing(true)
    }
  }, [requirement?.status])

  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!requirement) {return}

    // Update requirement with password to revert to draft
    await actions.updateRequirement(requirement.id, {
      title: requirement.title,
      description: requirement.description,
      password
    })
    // Only switch to edit mode if the update was successful
    setIsEditing(true)
    setShowPasswordConfirm(false)
  }, [requirement, actions])

  const handleCancel = useCallback(() => {
    if (isCreateMode) {
      navigate(`/${requirementType}-requirements`)
    } else {
      setIsEditing(false)
    }
  }, [isCreateMode, requirementType, navigate])

  const validateForm = useCallback(() => {
    const errors: {title?: string, description?: string} = {}
    
    if (!title.trim()) {
      errors.title = 'Title is required'
    } else if (title.length > 200) {
      errors.title = 'Title must be 200 characters or less'
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required'
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return false
    }
    
    setValidationErrors({})
    return true
  }, [title, description])

  // Check if there are changes to the requirement
  const hasChanges = useMemo(() => {
    if (isCreateMode) {
      // In create mode, there are changes if title or description is not empty
      return title.trim().length > 0 || description.trim().length > 0
    }
    if (!requirement) {
      return false
    }
    // Compare current form values with original requirement values
    const titleChanged = title.trim() !== (requirement.title || '').trim()
    const descriptionChanged = description.trim() !== (requirement.description || '').trim()
    return titleChanged || descriptionChanged
  }, [title, description, requirement, isCreateMode])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // In create mode, always allow submission. In edit mode, check if editing.
    if (!isCreateMode && !isEditing) {return}

    if (!validateForm()) {return}

    if (isCreateMode) {
      // Create new requirement
      const createData = {
        title: title.trim(),
        description: description.trim()
      }

      try {
        const newRequirement = await actions.createRequirement(createData)
        // Navigate to the new requirement's detail page (not edit mode)
        navigate(`/${requirementType}-requirements/${newRequirement.id}`)
      } catch {
        // Error handling is done by the API service
      }
    } else if (requirement) {
      // If there are no changes, just exit edit mode without making an API call
      if (!hasChanges) {
        setIsEditing(false)
        return
      }

      // Update existing requirement
      const updateData = {
        title: title.trim(),
        description: description.trim()
      }

      try {
        const updatedRequirement = await actions.updateRequirement(requirement.id, updateData)
        // Explicitly sync the requirement state to ensure it's updated
        setRequirement(updatedRequirement)
        setIsEditing(false)
      } catch (error) {
        // Error handling is done by the API service
        // Stay in edit mode on error so user can retry
        console.error('Failed to update requirement:', error)
      }
    }
  }, [isEditing, requirement, title, description, requirementType, actions, isCreateMode, navigate, validateForm, hasChanges])

  const handleCreateAndApprove = useCallback(() => {
    if (!validateForm()) {return}
    setShowCreateApprovalForm(true)
  }, [validateForm])

  const handleEditAndApprove = useCallback(() => {
    if (!validateForm()) {return}
    setShowEditApprovalForm(true)
  }, [validateForm])


  const handleDelete = useCallback(() => {
    if (!requirement) {return}
    setShowDeleteConfirm(true)
  }, [requirement])

  // Show loading state while fetching requirement
  if (loadingRequirement) {
    return <Stack className="p-6"><Text>Loading requirement...</Text></Stack>
  }

  // In create mode, we don't need an existing requirement
  if (!isCreateMode && !requirement) {
    return <Stack className="p-6"><Text>Requirement not found</Text></Stack>
  }

  const canEdit = requirement && !requirement.deletedAt
  const canApprove = requirement && requirement.status === 'draft' && !requirement.deletedAt
  const canDelete = requirement && !requirement.deletedAt

  if (!isEditing && !isCreateMode && requirement) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto" tabIndex={0} role="region" aria-label="Requirement details">
          <div className="px-8 py-6">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <FormField label="ID">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                    <MonoText>{requirement.id}</MonoText>
                  </div>
                </FormField>

                <FormField label="Revision">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300">
                    <Text weight="semibold">{requirement.revision}</Text>
                  </div>
                </FormField>

                <FormField label="Status">
                  <div className="flex">
                    {requirement.status === 'approved' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </div>
                </FormField>
              </div>

              <FormField label="Title" required>
                <Input
                  value={requirement.title}
                  disabled
                  className="disabled:text-gray-900 disabled:opacity-100"
                  testid="requirement-title-readonly"
                  aria-label="Title"
                />
              </FormField>

              <FormField label="Description" required>
                <Textarea
                  value={requirement.description}
                  disabled
                  rows={12}
                  className="disabled:text-gray-900 disabled:opacity-100"
                  testid="requirement-description-readonly"
                  aria-label="Description"
                />
              </FormField>

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleEdit}
                      disabled={loading}
                      className="h-10"
                      testid="requirement-edit"
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
                      testid="requirement-delete"
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
                      disabled={loading}
                      className="h-10"
                      testid="requirement-approve"
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>

              {/* Traces Section */}
              <div className="space-y-4">
                {/* Upstream Traces Section - Only for System Requirements */}
                {requirementType === 'system' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Heading level={2} className="text-base font-medium">
                        Trace from
                      </Heading>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowUpstreamTraceModal(true)}
                        disabled={loading || !requirement}
                        data-testid="requirement-edit-traces-upstream"
                      >
                        Edit Traces
                      </Button>
                    </div>
                    <TraceLinksSection
                      title=""
                      links={upstreamTraces}
                      type="user"
                      loading={loadingTraced}
                    />
                  </div>
                )}

                {/* Downstream Traces Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Heading level={2} className="text-base font-medium">
                      Trace to
                    </Heading>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDownstreamTraceModal(true)}
                      disabled={loading || !requirement}
                      data-testid="requirement-edit-traces"
                    >
                      Edit Traces
                    </Button>
                  </div>
                  <TraceLinksSection
                    title=""
                    links={downstreamTraces}
                    type="system"
                    loading={loadingTraced}
                  />
                </div>
              </div>

              {requirement.deletedAt && (
                <div className="bg-red-50 border border-red-200 p-4">
                  <Heading level={2} className="text-red-900">Deleted</Heading>
                  <Text className="text-red-700">
                    This requirement was deleted on {new Date(requirement.deletedAt).toLocaleString()}
                  </Text>
                </div>
              )}

              <MetadataSection
                fields={[
                  { label: 'Created', value: requirement.createdAt, type: 'date' },
                  { label: 'Created By', value: requirement.createdByName },
                  { label: 'Modified', value: requirement.lastModified, type: 'date' },
                  { label: 'Modified By', value: requirement.modifiedByName },
                  { label: 'Approved', value: requirement.approvedAt, type: 'date' },
                  { label: 'Approved By', value: requirement.approvedByName }
                ]}
              />
            </div>
          </div>
        </div>

        <PasswordConfirmModal
          isOpen={showApprovalForm}
          onClose={() => {
            setShowApprovalForm(false)
            setApprovalNotes('')
          }}
          onConfirm={async (password: string) => {
            // Use approval service to bypass store error handling
            requirementType === 'user'
              ? await approvalService.approveUserRequirement(
                  requirement.id,
                  password,
                  approvalNotes.trim() || undefined
                )
              : await approvalService.approveSystemRequirement(
                  requirement.id,
                  password,
                  approvalNotes.trim() || undefined
                )
            
            // Exit to detail view and refresh
            setIsEditing(false)
            setApprovalNotes('')
            await actions.fetchRequirements()
          }}
          title={`Approve ${requirementType === 'user' ? 'User' : 'System'} Requirement`}
          message="This action will mark the requirement as approved and increment its revision number."
          confirmText="Approve Requirement"
          loadingText="Approving..."
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

        <PasswordConfirmModal
          isOpen={showPasswordConfirm}
          onClose={() => setShowPasswordConfirm(false)}
          onConfirm={handlePasswordConfirm}
          title="Edit Approved Requirement"
          message="This requirement is approved. Editing will revert it to draft status."
          confirmText="Edit Requirement"
          loadingText="Updating..."
        />

        {requirement && (
          <>
            <TraceEditModal
              isOpen={showUpstreamTraceModal}
              onClose={() => setShowUpstreamTraceModal(false)}
              requirementId={requirement.id}
              requirementType={requirementType}
              traceDirection="upstream"
              onSave={async () => {
                // Refresh trace relationships after operations
                try {
                  const response = await tracesApi.getRequirementTraces(requirement.id)
                  setUpstreamTraces(response.upstreamTraces)
                  setDownstreamTraces(response.downstreamTraces)
                } catch {
                  // Error handling is done by the API service
                }
                // Reload requirement data
                await actions.fetchRequirements();
              }}
            />
            <TraceEditModal
              isOpen={showDownstreamTraceModal}
              onClose={() => setShowDownstreamTraceModal(false)}
              requirementId={requirement.id}
              requirementType={requirementType}
              traceDirection="downstream"
              onSave={async () => {
                // Refresh trace relationships after operations
                try {
                  const response = await tracesApi.getRequirementTraces(requirement.id)
                  setUpstreamTraces(response.upstreamTraces)
                  setDownstreamTraces(response.downstreamTraces)
                } catch {
                  // Error handling is done by the API service
                }
                // Reload requirement data
                await actions.fetchRequirements();
              }}
            />
          </>
        )}
      </div>
    )
  }

  // Edit mode or Create mode
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto" tabIndex={0} role="region" aria-label="Requirement form">
        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isCreateMode && (
              <>
                <Heading level={2}>Create New {requirementType === 'user' ? 'User' : 'System'} Requirement</Heading>
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
            {!isCreateMode && requirement && (
              <div className="grid grid-cols-3 gap-4">
                <FormField label="ID">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <MonoText>{requirement.id}</MonoText>
                  </div>
                </FormField>

                <FormField label="Revision">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <Text weight="semibold">{requirement.revision}</Text>
                  </div>
                </FormField>

                <FormField label="Status">
                  <div className="flex">
                    {requirement.status === 'approved' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </div>
                </FormField>
              </div>
            )}

            <FormField label="Title" required>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (validationErrors.title) {
                    setValidationErrors({...validationErrors, title: undefined})
                  }
                }}
                placeholder="Enter requirement title (max 200 characters)"
                maxLength={200}
                disabled={loading}
                className={validationErrors.title ? 'border-red-500' : ''}
                testid="requirement-title"
              />
              {validationErrors.title && (
                <Text variant="small" className="text-red-600 mt-1">
                  {validationErrors.title}
                </Text>
              )}
              {!validationErrors.title && isCreateMode && (
                <Text variant="small" color="muted" className="mt-1">
                  Provide a clear, concise title for the requirement ({title.length}/200)
                </Text>
              )}
            </FormField>

            <FormField label="Description" required>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (validationErrors.description) {
                    setValidationErrors({...validationErrors, description: undefined})
                  }
                }}
                placeholder="Enter detailed requirement description (min 50 characters)"
                rows={12}
                disabled={loading}
                className={validationErrors.description ? 'border-red-500' : ''}
                testid="requirement-description"
              />
              {validationErrors.description && (
                <Text variant="small" className="text-red-600 mt-1">
                  {validationErrors.description}
                </Text>
              )}
              {!validationErrors.description && isCreateMode && (
                <Text variant="small" color="muted" className="mt-1">
                  Provide a comprehensive description ({description.length} characters)
                </Text>
              )}
            </FormField>

            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={loading || (!isCreateMode && !hasChanges)} 
                  testid="requirement-save"
                >
                  {loading ? (isCreateMode ? 'Creating...' : 'Saving...') : (isCreateMode ? 'Create as Draft' : 'Save')}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading} testid="requirement-cancel">
                  Cancel
                </Button>
              </div>
              {isCreateMode && (
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleCreateAndApprove} 
                  disabled={loading}
                  testid="requirement-create-approve"
                >
                  Create & Approve
                </Button>
              )}
              {!isCreateMode && requirement?.status === 'draft' && (
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleEditAndApprove} 
                  disabled={loading}
                  testid="requirement-save-approve"
                >
                  Save & Approve
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Password modal for Save & Approve in edit mode */}
      {!isCreateMode && (
        <PasswordConfirmModal
          isOpen={showEditApprovalForm}
          onClose={() => {
            setShowEditApprovalForm(false)
            setApprovalNotes('')
          }}
          onConfirm={async (password: string) => {
            // Use approval service to bypass store error handling
            requirementType === 'user'
              ? await approvalService.updateUserRequirementWithApproval(
                  requirement.id,
                  title.trim(),
                  description.trim(),
                  password,
                  approvalNotes.trim() || undefined
                )
              : await approvalService.updateSystemRequirementWithApproval(
                  requirement.id,
                  title.trim(),
                  description.trim(),
                  password,
                  approvalNotes.trim() || undefined
                )
            
            // Exit to detail view and refresh
            setIsEditing(false)
            setApprovalNotes('')
            await actions.fetchRequirements()
          }}
          title={`Save & Approve ${requirementType === 'user' ? 'User' : 'System'} Requirement`}
          message="This will save your changes and immediately mark the requirement as approved."
          confirmText="Save & Approve"
          loadingText="Saving & Approving..."
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
      )}

      {/* Password modal for Create & Approve */}
      {isCreateMode && (
        <PasswordConfirmModal
          isOpen={showCreateApprovalForm}
          onClose={() => {
            setShowCreateApprovalForm(false)
            setApprovalNotes('')
          }}
          onConfirm={async (password: string) => {
            // Use approval service to bypass store error handling
            const newRequirement = requirementType === 'user'
              ? await approvalService.createUserRequirementWithApproval(
                  title.trim(),
                  description.trim(),
                  password,
                  approvalNotes.trim() || undefined
                )
              : await approvalService.createSystemRequirementWithApproval(
                  title.trim(),
                  description.trim(),
                  password,
                  approvalNotes.trim() || undefined
                )
            
            // Navigate to the new requirement's detail page
            navigate(`/${requirementType}-requirements/${newRequirement.id}`)
            setApprovalNotes('')
          }}
          title={`Create & Approve ${requirementType === 'user' ? 'User' : 'System'} Requirement`}
          message="This will create the requirement and immediately mark it as approved."
          confirmText="Create & Approve"
          loadingText="Creating & Approving..."
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
      )}

      {/* Password modal for Delete */}
      {requirement && (
        <PasswordConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={async (password: string) => {
            // Use approval service to bypass store error handling
            requirementType === 'user'
              ? await approvalService.deleteUserRequirement(requirement.id, password)
              : await approvalService.deleteSystemRequirement(requirement.id, password)
            
            // Navigate back to list after successful deletion
            navigate(`/${requirementType}-requirements`)
          }}
          title={`Delete ${requirementType === 'user' ? 'User' : 'System'} Requirement`}
          message="This action will permanently delete this requirement. This cannot be undone."
          confirmText="Delete Requirement"
          loadingText="Deleting..."
        />
      )}
    </div>
  )
}