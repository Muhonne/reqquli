import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { Button, Input, ListItemStyle } from '../atoms';
import { TraceListItem } from './TraceListItem';
import { systemRequirementApi, tracesApi, ApiError } from '../../services/api';
import { RequirementTrace } from '../../../types/traces';
import { ListableEntity } from '../organisms/ItemList';
import { TestCase } from '../../../types/test-runs';
import { SystemRequirement } from '../../../types/system-requirements';
import { LoadingState, EmptyState } from '../molecules';
import { CheckCircle, Clock, FileText } from 'lucide-react';

interface TestCaseTraceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseId: string;
  onSave: () => Promise<void>;
}

interface TraceableItem extends ListableEntity {
  status: 'draft' | 'approved';
  revision: number;
  lastModified?: string;
}

export function TestCaseTraceEditModal({
  isOpen,
  onClose,
  testCaseId,
  onSave
}: TestCaseTraceEditModalProps) {
  const [upstreamTraces, setUpstreamTraces] = useState<RequirementTrace[]>([]);
  const [searchResults, setSearchResults] = useState<TraceableItem[]>([]);
  const [recentItems, setRecentItems] = useState<TraceableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingTraceId, setAddingTraceId] = useState<string | null>(null);
  const [removingTraceId, setRemovingTraceId] = useState<string | null>(null);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) {
      return 'N/A';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const transformToTraceableItem = (item: SystemRequirement | { id: string; title: string; description?: string; status: string; revision?: number; createdAt?: string; lastModified?: string; approvedAt?: string }): TraceableItem => {
    return {
      id: item.id,
      title: item.title,
      description: item.description || '',
      status: item.status === 'approved' ? 'approved' : 'draft',
      revision: item.revision || 0,
      createdAt: item.createdAt || new Date().toISOString(),
      lastModified: item.lastModified || item.createdAt || new Date().toISOString(),
      approvedAt: item.approvedAt,
    };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load test case details - using fetch directly since there's no getTestCase method in API service
      const testCaseResponse = await fetch(`/api/test-cases/${testCaseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!testCaseResponse.ok) {
        const errorData = await testCaseResponse.json().catch(() => ({}));
        throw new ApiError(testCaseResponse.status, errorData.error?.message || 'Failed to load test case');
      }

      const testCaseData = await testCaseResponse.json();
      setTestCase(testCaseData.testCase || testCaseData);

      // Load traces for this test case - using fetch directly since there's no test case traces method
      const tracesResponse = await fetch(`/api/test-cases/${testCaseId}/traces`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!tracesResponse.ok) {
        const errorData = await tracesResponse.json().catch(() => ({}));
        throw new ApiError(tracesResponse.status, errorData.error?.message || 'Failed to load traces');
      }

      const tracesData = await tracesResponse.json();
      setUpstreamTraces(tracesData.upstreamTraces || []);

      // Load recent system requirements for selection
      const systemReqResponse = await systemRequirementApi.list({
        sort: 'lastModified',
        order: 'desc',
        limit: 20
      });

      // Filter out already traced requirements
      const alreadyTracedIds = (tracesData.upstreamTraces || []).map((t: RequirementTrace) => t.id);
      const filteredItems = systemReqResponse.data
        .filter((req: SystemRequirement) => !req.deletedAt && !alreadyTracedIds.includes(req.id))
        .slice(0, 10)
        .map(transformToTraceableItem);
      setRecentItems(filteredItems);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load data';
      setError(errorMessage);
      setUpstreamTraces([]);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  }, [testCaseId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const alreadyTracedIds = upstreamTraces.map(trace => trace.id);

      // Search system requirements
      const response = await systemRequirementApi.list({
        search: term,
        limit: 20,
        sort: 'lastModified',
        order: 'desc'
      });

      const filteredResults = response.data
        .filter((req: SystemRequirement) => !req.deletedAt && !alreadyTracedIds.includes(req.id))
        .slice(0, 10)
        .map(transformToTraceableItem);
      setSearchResults(filteredResults);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Search failed';
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [upstreamTraces]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);

  const displayItems = searchTerm ? searchResults : recentItems;

  const truncateTitle = (title: string, maxLength = 30): string => {
    if (title.length <= maxLength) {
      return title;
    }
    return title.substring(0, maxLength - 3) + '...';
  };

  const handleRemoveUpstreamTrace = async (traceId: string) => {
    setRemovingTraceId(traceId);
    setError(null);
    try {
      // Remove trace using the traces API
      await tracesApi.deleteTrace(traceId, testCaseId);

      // Reload data to refresh the trace list
      await loadData();

      // Notify parent
      await onSave();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to remove trace';
      setError(errorMessage);
    } finally {
      setRemovingTraceId(null);
    }
  };

  const handleAddTrace = async (itemId: string) => {
    setAddingTraceId(itemId);
    setError(null);
    try {
      // Create trace from system requirement to test case
      // Types are determined from ID prefixes on the backend
      await tracesApi.createTrace({
        fromId: itemId,
        toId: testCaseId
      });

      // Reload data to refresh the trace list
      await loadData();

      // Notify parent
      await onSave();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to add trace';
      setError(errorMessage);
    } finally {
      setAddingTraceId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Upstream Traces - ${testCaseId}${testCase?.title ? ` - ${truncateTitle(testCase.title)}` : ''}`}
      size="fixed"
    >
      <div className="flex h-full gap-6 p-6 box-border overflow-hidden">
        {/* Left Column - Existing Traces */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">Current Upstream Traces</div>

          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {loading ? (
              <LoadingState message="Loading traces..." />
            ) : upstreamTraces.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="border border-gray-300 flex-1 min-h-0 overflow-y-auto box-border">
                  {upstreamTraces.map(trace => (
                    <TraceListItem
                      key={trace.id}
                      id={trace.id}
                      title={trace.title}
                      onRemove={handleRemoveUpstreamTrace}
                      isRemoving={removingTraceId === trace.id}
                      removeButtonVariant="secondary"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No upstream traces"
                description="No upstream traces from system requirements exist yet"
                testid="testcase-traces-empty"
              />
            )}
          </div>
        </div>

        {/* Right Column - Search and Available System Requirements */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">Add System Requirements</div>

          <div className="mb-4 flex-shrink-0">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search system requirements by ID or title..."
              className="w-full"
              testid="trace-search"
            />
            {searching && (
              <div className="text-xs text-gray-500 mt-1" data-testid="trace-searching">
                Searching...
              </div>
            )}
            {error && (
              <div className="text-red-600 text-sm mt-2" data-testid="trace-error">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {loading ? (
              <LoadingState message="Loading items..." />
            ) : (
              <>
                <div className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                  {searchTerm ? 'Search Results' : 'Recent System Requirements'}
                </div>
                <div className="border border-gray-300 flex-1 min-h-0 overflow-y-scroll bg-white box-border">
                  {displayItems.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title={searchTerm ? 'No results found' : 'No items available'}
                      description={searchTerm ? 'Try adjusting your search terms' : 'No system requirements available to add as traces'}
                      testid="trace-items-empty"
                    />
                  ) : (
                    displayItems.map((item, index) => (
                      <ListItemStyle
                        key={item.id}
                        className={`px-6 py-4 border-b border-gray-100 ${
                          index === displayItems.length - 1 ? 'border-b-0' : ''
                        }`}
                        testid={`trace-item-${item.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {item.status === 'approved' ? (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="mb-2">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {item.id}-{item.revision} {item.title}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {item.description}
                              </p>
                              <div className="mt-2 text-xs text-gray-600">
                                Modified: {formatDate(item.lastModified || item.createdAt)}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddTrace(item.id);
                            }}
                            disabled={addingTraceId === item.id}
                            className="ml-4 flex-shrink-0"
                            testid={`trace-add-${item.id}`}
                          >
                            {addingTraceId === item.id ? 'Adding...' : 'Add Trace'}
                          </Button>
                        </div>
                      </ListItemStyle>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
