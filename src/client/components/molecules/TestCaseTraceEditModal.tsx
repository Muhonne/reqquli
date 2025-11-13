import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button, Input, ListItemStyle } from '../atoms';
import { TraceListItem } from './TraceListItem';
import { RequirementCard } from './RequirementCard';
import { systemRequirementApi, tracesApi } from '../../services/api';
import axios from 'axios';

interface TestCaseTraceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseId: string;
  onSave: () => Promise<void>;
}

export function TestCaseTraceEditModal({
  isOpen,
  onClose,
  testCaseId,
  onSave
}: TestCaseTraceEditModalProps) {
  const [upstreamTraces, setUpstreamTraces] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingTraceId, setAddingTraceId] = useState<string | null>(null);
  const [removingTraceId, setRemovingTraceId] = useState<string | null>(null);
  const [testCase, setTestCase] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, testCaseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load test case details
      const testCaseResponse = await axios.get(
        `/api/test-cases/${testCaseId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setTestCase(testCaseResponse.data.testCase || testCaseResponse.data);

      // Load traces for this test case using the traces API
      const tracesResponse = await axios.get(
        `/api/test-cases/${testCaseId}/traces`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setUpstreamTraces(tracesResponse.data.upstreamTraces || []);

      // Load recent system requirements for selection
      const systemReqResponse = await systemRequirementApi.list({
        sort: 'lastModified',
        order: 'desc',
        limit: 20
      });

      // Filter out already traced requirements
      const alreadyTracedIds = tracesResponse.data.upstreamTraces?.map((t: any) => t.id) || [];
      const filteredItems = systemReqResponse.data.filter((req: any) =>
        !req.deletedAt &&
        !alreadyTracedIds.includes(req.id)
      );
      setRecentItems(filteredItems.slice(0, 10));
    } catch (error) {
      console.error('Error loading trace data:', error);
      setUpstreamTraces([]);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const alreadyTracedIds = upstreamTraces.map(trace => trace.id);

      // Search system requirements
      const response = await systemRequirementApi.list({
        search: term,
        limit: 20,
        sort: 'lastModified',
        order: 'desc'
      });

      const filteredResults = response.data.filter((req: any) =>
        !req.deletedAt &&
        !alreadyTracedIds.includes(req.id)
      );
      setSearchResults(filteredResults.slice(0, 10));
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, upstreamTraces]);

  const displayItems = searchTerm ? searchResults : recentItems;

  const handleRemoveUpstreamTrace = async (traceId: string) => {
    setRemovingTraceId(traceId);
    try {
      // Remove trace using the traces API
      await tracesApi.deleteTrace(traceId, testCaseId);

      // Reload data to refresh the trace list
      await loadData();

      // Notify parent
      await onSave();
    } catch (error) {
      console.error('Error removing upstream trace:', error);
    } finally {
      setRemovingTraceId(null);
    }
  };

  const handleAddTrace = async (itemId: string) => {
    setAddingTraceId(itemId);
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
    } catch (error) {
      console.error('Error adding trace:', error);
    } finally {
      setAddingTraceId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Upstream Traces - ${testCaseId} ${testCase?.title || ''}`}
      size="fixed"
    >
      <div className="flex h-full gap-6 p-6 box-border overflow-hidden">
        {/* Left Column - Existing Traces */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">Current Upstream Traces</div>

          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {upstreamTraces.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="border border-gray-300 flex-1 min-h-0 overflow-y-auto box-border">
                {upstreamTraces.map(trace => (
                  <TraceListItem
                    key={trace.id}
                    id={trace.id}
                    title={trace.title}
                    description={trace.description}
                    onRemove={handleRemoveUpstreamTrace}
                    isRemoving={removingTraceId === trace.id}
                    removeButtonVariant="secondary"
                  />
                ))}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="text-gray-500 italic text-center py-8">
                  No upstream traces from system requirements exist yet
                </div>
              )
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
            {searching && <div className="text-xs text-gray-500 mt-1">Searching...</div>}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
              {searchTerm ? 'Search Results' : 'Recent System Requirements'}
            </div>
            <div className="border border-gray-300 flex-1 min-h-0 overflow-y-scroll bg-white box-border">
              {displayItems.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 italic">
                    {searchTerm ? 'No results found' : 'No items available'}
                  </div>
                </div>
              ) : (
                displayItems.map((item, index) => (
                  <ListItemStyle
                    key={item.id}
                    className={`px-6 py-4 border-b border-gray-100 ${
                      index === displayItems.length - 1 ? 'border-b-0' : ''
                    }`}
                    testid={`trace-item-${item.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <RequirementCard
                          id={item.id}
                          title={item.title}
                          description={item.description}
                        />
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
          </div>
        </div>
      </div>
    </Modal>
  );
}