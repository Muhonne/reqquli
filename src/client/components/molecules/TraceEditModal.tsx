import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button, Input, ListItemStyle } from "../atoms";
import { TraceListItem } from "./TraceListItem";
import { RequirementCard } from "./RequirementCard";
import {
  userRequirementApi,
  systemRequirementApi,
  tracesApi,
  testRunApi,
} from "../../services/api";

interface TraceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  requirementType: "user" | "system";
  traceDirection?: "upstream" | "downstream" | "both";
  onSave: () => Promise<void>;
}

export function TraceEditModal({
  isOpen,
  onClose,
  requirementId,
  requirementType,
  traceDirection = "both",
  onSave,
}: TraceEditModalProps) {
  const [upstreamTraces, setUpstreamTraces] = useState<any[]>([]);
  const [downstreamTraces, setDownstreamTraces] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingTraceId, setAddingTraceId] = useState<string | null>(null);
  const [removingTraceId, setRemovingTraceId] = useState<string | null>(null);
  const [requirement, setRequirement] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, requirementType, requirementId, traceDirection]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current traces for this requirement
      const tracesResponse =
        await tracesApi.getRequirementTraces(requirementId);
      setUpstreamTraces(tracesResponse.upstreamTraces);

      // Downstream traces will include test cases if they're linked via the junction table
      // The API should return test cases as downstream traces with type 'testcase'
      setDownstreamTraces(tracesResponse.downstreamTraces);

      // Load requirement details for title
      try {
        if (requirementType === "system") {
          const reqResponse = await systemRequirementApi.get(requirementId);
          setRequirement(reqResponse);
        } else {
          const reqResponse = await userRequirementApi.get(requirementId);
          setRequirement(reqResponse);
        }
      } catch (error) {
        console.error("Failed to load requirement details:", error);
        setRequirement(null);
      }

      // Get IDs of items that are already traced to exclude them
      const getAlreadyTracedIds = () => {
        if (requirementType === "system") {
          // System requirements trace FROM user requirements (upstream)
          return tracesResponse.upstreamTraces.map((trace) => trace.id);
        } else {
          // User requirements trace TO system requirements (downstream)
          return tracesResponse.downstreamTraces.map((trace) => trace.id);
        }
      };

      const alreadyTracedIds = getAlreadyTracedIds();

      // Load recent items for selection, excluding already traced items
      // Based on requirement type and trace direction
      if (requirementType === "system") {
        if (traceDirection === "upstream" || traceDirection === "both") {
          // System requirements trace upstream from user requirements
          const userReqResponse = await userRequirementApi.list({
            sort: "lastModified",
            order: "desc",
            limit: 20,
          });
          const filteredItems = userReqResponse.data.filter(
            (req) =>
              req.id !== requirementId &&
              !req.deletedAt &&
              !alreadyTracedIds.includes(req.id),
          );
          setRecentItems(filteredItems.slice(0, 10));
        } else if (traceDirection === "downstream") {
          // System requirements trace downstream to test cases
          try {
            const testCaseResponse = await testRunApi.listTestCases({
              sort: "lastModified",
              order: "desc",
              limit: 20,
            });
            const filteredItems = (testCaseResponse.data || [])
              .filter((tc) => !alreadyTracedIds.includes(tc.id))
              .map((tc) => ({
                id: tc.id,
                title: tc.title,
                description: tc.description,
                status: tc.status,
                type: "testcase" as const,
              }));
            setRecentItems(filteredItems.slice(0, 10));
          } catch (error) {
            console.error("Failed to load test cases:", error);
            setRecentItems([]);
          }
        }
      } else {
        // User requirements
        if (traceDirection === "downstream" || traceDirection === "both") {
          // User requirements trace downstream to system requirements
          const systemReqResponse = await systemRequirementApi.list({
            sort: "lastModified",
            order: "desc",
            limit: 20,
          });
          const filteredItems = systemReqResponse.data.filter(
            (req) => !req.deletedAt && !alreadyTracedIds.includes(req.id),
          );
          setRecentItems(filteredItems.slice(0, 10));
        } else if (traceDirection === "upstream") {
          // User requirements don't have upstream traces in current model
          setRecentItems([]);
        }
      }
    } catch (error) {
      console.error("Error loading trace data:", error);
      setUpstreamTraces([]);
      setDownstreamTraces([]);
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
      // Get IDs of items that are already traced to exclude them
      const getAlreadyTracedIds = () => {
        if (requirementType === "system") {
          if (traceDirection === "upstream") {
            return upstreamTraces.map((trace) => trace.id);
          } else if (traceDirection === "downstream") {
            return downstreamTraces.map((trace) => trace.id);
          } else {
            // Both - need to consider direction being searched
            return [
              ...upstreamTraces.map((t) => t.id),
              ...downstreamTraces.map((t) => t.id),
            ];
          }
        } else {
          // User requirements trace TO system requirements (downstream)
          return downstreamTraces.map((trace) => trace.id);
        }
      };

      const alreadyTracedIds = getAlreadyTracedIds();

      if (requirementType === "system") {
        if (traceDirection === "upstream" || traceDirection === "both") {
          // System requirements can trace from user requirements (upstream)
          const response = await userRequirementApi.list({
            search: term,
            limit: 20,
            sort: "lastModified",
            order: "desc",
          });
          const filteredResults = response.data.filter(
            (req) =>
              req.id !== requirementId &&
              !req.deletedAt &&
              !alreadyTracedIds.includes(req.id),
          );
          setSearchResults(filteredResults.slice(0, 10));
        } else if (traceDirection === "downstream") {
          // System requirements trace to test cases (downstream)
          const response = await testRunApi.listTestCases({
            search: term,
            limit: 20,
            sort: "lastModified",
            order: "desc",
          });
          const filteredResults = (response.data || [])
            .filter((tc) => !alreadyTracedIds.includes(tc.id))
            .map((tc) => ({
              id: tc.id,
              title: tc.title,
              description: tc.description,
              status: tc.status,
              type: "testcase" as const,
            }));
          setSearchResults(filteredResults.slice(0, 10));
        }
      } else {
        // User requirements can trace to system requirements
        const response = await systemRequirementApi.list({
          search: term,
          limit: 20, // Get more to filter and still show results
          sort: "lastModified",
          order: "desc",
        });
        const filteredResults = response.data.filter(
          (req) => !req.deletedAt && !alreadyTracedIds.includes(req.id),
        );
        setSearchResults(filteredResults.slice(0, 10)); // Take first 10 after filtering
      }
    } catch (error) {
      console.error("Error searching:", error);
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
  }, [searchTerm]);

  const displayItems = searchTerm ? searchResults : recentItems;

  const handleRemoveUpstreamTrace = async (traceId: string) => {
    setRemovingTraceId(traceId);
    try {
      await tracesApi.deleteTrace(traceId, requirementId);
      // Immediately refresh the modal's trace data
      await loadData();
      // Notify parent component
      await onSave();
    } catch (error) {
      console.error("Error removing upstream trace:", error);
    } finally {
      setRemovingTraceId(null);
    }
  };

  const handleRemoveDownstreamTrace = async (traceId: string) => {
    setRemovingTraceId(traceId);
    try {
      // Use the junction table for all traces
      await tracesApi.deleteTrace(requirementId, traceId);

      // Immediately refresh the modal's trace data
      await loadData();
      // Notify parent component
      await onSave();
    } catch (error) {
      console.error("Error removing downstream trace:", error);
    } finally {
      setRemovingTraceId(null);
    }
  };

  const handleAddTrace = async (itemId: string) => {
    setAddingTraceId(itemId);
    try {
      if (requirementType === "system") {
        if (traceDirection === "upstream") {
          // System requirement tracing FROM user requirement
          await tracesApi.createTrace({
            fromId: itemId,
            toId: requirementId,
            fromType: "user",
            toType: "system",
          });
        } else if (traceDirection === "downstream") {
          // System requirement tracing TO test case
          // Use the junction table with test case as target
          await tracesApi.createTrace({
            fromId: requirementId,
            toId: itemId, // Test case ID
            fromType: "system",
            toType: "testcase",
          });
        }
      } else {
        // User requirement tracing TO system requirement
        await tracesApi.createTrace({
          fromId: requirementId,
          toId: itemId,
          fromType: "user",
          toType: "system",
        });
      }

      // Immediately refresh the modal's trace data
      await loadData();
      // Notify parent component
      await onSave();
    } catch (error) {
      console.error("Error adding trace:", error);
    } finally {
      setAddingTraceId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Traces - ${requirementId} ${requirement?.title || ""}`}
      size="fixed"
    >
      <div className="flex h-full gap-6 p-6 box-border overflow-hidden">
        {/* Left Column - Existing Traces */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">
            Current Traces
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Upstream Traces - requirements that trace TO this one */}
            {(traceDirection === "upstream" || traceDirection === "both") &&
              upstreamTraces.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                    Upstream Traces
                  </div>
                  <div className="border border-gray-300 flex-1 min-h-0 overflow-y-auto box-border">
                    {upstreamTraces.map((trace) => (
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
              )}

            {/* Downstream Traces */}
            {(traceDirection === "downstream" || traceDirection === "both") &&
              downstreamTraces.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                    Downstream Traces
                  </div>
                  <div className="border border-gray-300 flex-1 min-h-0 overflow-y-auto box-border">
                    {downstreamTraces.map((trace) => (
                      <TraceListItem
                        key={trace.id}
                        id={trace.id}
                        title={trace.title}
                        description={trace.description}
                        onRemove={handleRemoveDownstreamTrace}
                        isRemoving={removingTraceId === trace.id}
                        removeButtonVariant="secondary"
                      />
                    ))}
                  </div>
                </div>
              )}

            {((traceDirection === "upstream" && upstreamTraces.length === 0) ||
              (traceDirection === "downstream" &&
                downstreamTraces.length === 0) ||
              (traceDirection === "both" &&
                upstreamTraces.length === 0 &&
                downstreamTraces.length === 0)) &&
              !loading && (
                <div className="text-gray-500 italic text-center py-8">
                  No{" "}
                  {traceDirection === "both"
                    ? "trace relationships"
                    : `${traceDirection} traces`}{" "}
                  exist yet
                </div>
              )}
          </div>
        </div>

        {/* Right Column - Search and Available Items */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">
            Add{" "}
            {traceDirection === "both"
              ? "New Traces"
              : `${traceDirection.charAt(0).toUpperCase() + traceDirection.slice(1)} Traces`}
          </div>

          <div className="mb-4 flex-shrink-0">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID or title..."
              className="w-full"
              testid="trace-search"
            />
            {searching && (
              <div className="text-xs text-gray-500 mt-1">Searching...</div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
              {searchTerm ? "Search Results" : "Recent Items"}
            </div>
            <div className="border border-gray-300 flex-1 min-h-0 overflow-y-scroll bg-white box-border">
              {displayItems.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 italic">
                    {searchTerm ? "No results found" : "No items available"}
                  </div>
                </div>
              ) : (
                displayItems.map((item, index) => (
                  <ListItemStyle
                    key={item.id}
                    className={`px-6 py-4 border-b border-gray-100 ${
                      index === displayItems.length - 1 ? "border-b-0" : ""
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
                        {addingTraceId === item.id ? "Adding..." : "Add Trace"}
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
