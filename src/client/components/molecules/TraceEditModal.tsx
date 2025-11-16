import { useState, useEffect, useCallback } from "react";
import { Modal } from "./Modal";
import { Button, Input, ListItemStyle } from "../atoms";
import { TraceListItem } from "./TraceListItem";
import {
  userRequirementApi,
  systemRequirementApi,
  riskApi,
  tracesApi,
  testRunApi,
  ApiError,
} from "../../services/api";
import { RequirementTrace, RequirementTracesResponse } from "../../../types/traces";
import { ListableEntity } from "../organisms/ItemList";
import { SystemRequirement } from "../../../types/system-requirements";
import { UserRequirement } from "../../../types/user-requirements";
import { RiskRecord } from "../../../types/risks";
import { LoadingState, EmptyState } from "../molecules";
import { CheckCircle, Clock, FileText } from "lucide-react";

interface TraceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  requirementType: "user" | "system" | "risk";
  traceDirection: "upstream" | "downstream";
  onSave: () => Promise<void>;
}

interface TraceableItem extends ListableEntity {
  status: "draft" | "approved";
  revision: number;
  lastModified?: string;
}

// Configuration for each requirement type's trace behavior
type DirectionConfig = {
  // Support multiple source APIs (e.g., system upstream can be from user requirements OR risks)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSourceApis: () => any[];
  getTracedIds: (traces: RequirementTrace[]) => string[];
  isTestCase?: boolean;
  // Function to determine fromId/toId based on direction
  getTraceIds: (direction: "upstream" | "downstream", itemId: string, requirementId: string) => {
    fromId: string;
    toId: string;
  };
};

type TraceConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getApi: (id: string) => Promise<any>;
  upstream: DirectionConfig | null;
  downstream: DirectionConfig | null;
};

const TRACE_CONFIGS: Record<"user" | "system" | "risk", TraceConfig> = {
  system: {
    getApi: (id: string) => systemRequirementApi.get(id),
    upstream: {
      // System requirements can trace from both user requirements AND risks
      getSourceApis: () => [userRequirementApi, riskApi],
      getTracedIds: (traces) => traces.map((t) => t.id),
      getTraceIds: (_direction, itemId, requirementId) => ({
        fromId: itemId,
        toId: requirementId,
      }),
    },
    downstream: {
      getSourceApis: () => [testRunApi],
      getTracedIds: (traces) => traces.map((t) => t.id),
      isTestCase: true,
      getTraceIds: (_direction, itemId, requirementId) => ({
        fromId: requirementId,
        toId: itemId,
      }),
    },
  },
  risk: {
    getApi: (id: string) => riskApi.get(id),
    upstream: null,
    downstream: {
      getSourceApis: () => [systemRequirementApi],
      getTracedIds: (traces) => traces.map((t) => t.id),
      getTraceIds: (_direction, itemId, requirementId) => ({
        fromId: requirementId,
        toId: itemId,
      }),
    },
  },
  user: {
    getApi: (id: string) => userRequirementApi.get(id),
    upstream: null,
    downstream: {
      getSourceApis: () => [systemRequirementApi],
      getTracedIds: (traces) => traces.map((t) => t.id),
      getTraceIds: (_direction, itemId, requirementId) => ({
        fromId: requirementId,
        toId: itemId,
      }),
    },
  },
};

export function TraceEditModal({
  isOpen,
  onClose,
  requirementId,
  requirementType,
  traceDirection,
  onSave,
}: TraceEditModalProps) {
  const [upstreamTraces, setUpstreamTraces] = useState<RequirementTrace[]>([]);
  const [downstreamTraces, setDownstreamTraces] = useState<RequirementTrace[]>([]);
  const [searchResults, setSearchResults] = useState<TraceableItem[]>([]);
  const [recentItems, setRecentItems] = useState<TraceableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingTraceId, setAddingTraceId] = useState<string | null>(null);
  const [removingTraceId, setRemovingTraceId] = useState<string | null>(null);
  const [requirement, setRequirement] = useState<SystemRequirement | UserRequirement | RiskRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) {
      return "N/A";
    }
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const transformToTraceableItem = (item: SystemRequirement | UserRequirement | RiskRecord | { id: string; title: string; description?: string; status: string; revision?: number; createdAt?: string; lastModified?: string; approvedAt?: string }): TraceableItem => {
    return {
      id: item.id,
      title: item.title,
      description: item.description || "",
      status: item.status === "approved" ? "approved" : "draft",
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
      const config = TRACE_CONFIGS[requirementType];
      
      // Load current traces
      const tracesResponse: RequirementTracesResponse =
        await tracesApi.getRequirementTraces(requirementId);
      setUpstreamTraces(tracesResponse.upstreamTraces);
      setDownstreamTraces(tracesResponse.downstreamTraces);

      // Load requirement details for title
      try {
        const reqResponse = await config.getApi(requirementId);
        setRequirement(reqResponse);
      } catch {
        setRequirement(null);
      }

      // Load recent items based on trace direction
      const directionConfig =
        traceDirection === "upstream" ? config.upstream : config.downstream;
      if (!directionConfig) {
        setRecentItems([]);
        return;
      }

      // Get already traced IDs from the traces we just loaded
      const currentTraces = traceDirection === "upstream" 
        ? tracesResponse.upstreamTraces 
        : tracesResponse.downstreamTraces;
      const alreadyTracedIds = directionConfig.getTracedIds(currentTraces);

      // Load items for this direction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allItems: any[] = [];
      const sourceApis = directionConfig.getSourceApis();
      const isTestCase = directionConfig.isTestCase || false;

      const listParams = {
        sort: "lastModified",
        order: "desc" as const,
        limit: 20,
      };

      for (const sourceApi of sourceApis) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let response: any;
          if (isTestCase) {
            response = await sourceApi.listTestCases(listParams);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = (response.data || []).map((tc: any) => ({
              id: tc.id,
              title: tc.title,
              description: tc.description,
              status: tc.status,
              revision: tc.revision || 0,
              createdAt: tc.createdAt,
              lastModified: tc.lastModified || tc.createdAt,
              type: "testcase" as const,
            }));
            allItems.push(...items);
          } else {
            response = await sourceApi.list(listParams);
            allItems.push(...(response.data || []));
          }
        } catch {
          // Continue with other APIs even if one fails
        }
      }

      // Remove duplicates and filter
      const uniqueItems = Array.from(
        new Map(allItems.map((item) => [item.id, item])).values()
      );

      const filtered = uniqueItems
        .map(transformToTraceableItem)
        .filter((item) => {
          if (isTestCase) {
            return !alreadyTracedIds.includes(item.id);
          }
          return item.id !== requirementId && !alreadyTracedIds.includes(item.id);
        })
        .slice(0, 10);

      setRecentItems(filtered);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : "Failed to load data";
      setError(errorMessage);
      setUpstreamTraces([]);
      setDownstreamTraces([]);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  }, [requirementId, requirementType, traceDirection]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      setError(null);
      try {
        const config = TRACE_CONFIGS[requirementType];
        const directionConfig =
          traceDirection === "upstream" ? config.upstream : config.downstream;
        if (!directionConfig) {
          setSearchResults([]);
          return;
        }

        // Get already traced IDs from current state
        const currentTraces = traceDirection === "upstream" ? upstreamTraces : downstreamTraces;
        const alreadyTracedIds = directionConfig.getTracedIds(currentTraces);

        // Load items for this direction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allItems: any[] = [];
        const sourceApis = directionConfig.getSourceApis();
        const isTestCase = directionConfig.isTestCase || false;

        const listParams = {
          search: term,
          sort: "lastModified",
          order: "desc" as const,
          limit: 20,
        };

        for (const sourceApi of sourceApis) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let response: any;
            if (isTestCase) {
              response = await sourceApi.listTestCases(listParams);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const items = (response.data || []).map((tc: any) => ({
                id: tc.id,
                title: tc.title,
                description: tc.description,
                status: tc.status,
                revision: tc.revision || 0,
                createdAt: tc.createdAt,
                lastModified: tc.lastModified || tc.createdAt,
                type: "testcase" as const,
              }));
              allItems.push(...items);
            } else {
              response = await sourceApi.list(listParams);
              allItems.push(...(response.data || []));
            }
          } catch {
            // Continue with other APIs even if one fails
          }
        }

        // Remove duplicates and filter
        const uniqueItems = Array.from(
          new Map(allItems.map((item) => [item.id, item])).values()
        );

        const filtered = uniqueItems
          .map(transformToTraceableItem)
          .filter((item) => {
            if (isTestCase) {
              return !alreadyTracedIds.includes(item.id);
            }
            return item.id !== requirementId && !alreadyTracedIds.includes(item.id);
          })
          .slice(0, 10);

        setSearchResults(filtered);
      } catch (err) {
        const errorMessage = err instanceof ApiError ? err.message : "Search failed";
        setError(errorMessage);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [requirementId, requirementType, traceDirection, upstreamTraces, downstreamTraces]
  );

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
    return title.substring(0, maxLength - 3) + "...";
  };

  const handleRemoveUpstreamTrace = async (traceId: string) => {
    setRemovingTraceId(traceId);
    setError(null);
    try {
      await tracesApi.deleteTrace(traceId, requirementId);
      await loadData();
      await onSave();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : "Failed to remove trace";
      setError(errorMessage);
    } finally {
      setRemovingTraceId(null);
    }
  };

  const handleRemoveDownstreamTrace = async (traceId: string) => {
    setRemovingTraceId(traceId);
    setError(null);
    try {
      await tracesApi.deleteTrace(requirementId, traceId);
      await loadData();
      await onSave();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : "Failed to remove trace";
      setError(errorMessage);
    } finally {
      setRemovingTraceId(null);
    }
  };

  const handleAddTrace = async (itemId: string) => {
    setAddingTraceId(itemId);
    setError(null);
    try {
      const config = TRACE_CONFIGS[requirementType];
      const directionConfig =
        traceDirection === "upstream" ? config.upstream : config.downstream;
      if (!directionConfig) {
        throw new Error(`No configuration for ${traceDirection} direction`);
      }

      // Get fromId/toId based on direction (no types needed - backend determines from ID prefixes)
      const { fromId, toId } = directionConfig.getTraceIds(
        traceDirection,
        itemId,
        requirementId
      );

      // Create trace with only IDs (types determined by backend from ID prefixes)
      await tracesApi.createTrace({ fromId, toId });

      await loadData();
      await onSave();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : "Failed to add trace";
      setError(errorMessage);
    } finally {
      setAddingTraceId(null);
    }
  };

  const currentTraces =
    traceDirection === "upstream" ? upstreamTraces : downstreamTraces;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Traces - ${requirementId}${requirement?.title ? ` - ${truncateTitle(requirement.title)}` : ""}`}
      size="fixed"
    >
      <div className="flex h-full gap-6 p-6 box-border overflow-hidden">
        {/* Left Column - Existing Traces */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">Current Traces</div>

          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {loading ? (
              <LoadingState message="Loading traces..." />
            ) : currentTraces.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                  {traceDirection === "upstream" ? "Upstream Traces" : "Downstream Traces"}
                </div>
                <div className="border border-gray-300 flex-1 min-h-0 overflow-y-auto box-border">
                  {currentTraces.map((trace) => (
                    <TraceListItem
                      key={trace.id}
                      id={trace.id}
                      title={trace.title}
                      onRemove={
                        traceDirection === "upstream"
                          ? handleRemoveUpstreamTrace
                          : handleRemoveDownstreamTrace
                      }
                      isRemoving={removingTraceId === trace.id}
                      removeButtonVariant="secondary"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title={`No ${traceDirection} traces`}
                description={`No ${traceDirection} trace relationships exist yet`}
                testid="traces-empty"
              />
            )}
          </div>
        </div>

        {/* Right Column - Search and Available Items */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="text-lg font-medium mb-4 flex-shrink-0">
            Add {traceDirection.charAt(0).toUpperCase() + traceDirection.slice(1)} Traces
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
                  {searchTerm ? "Search Results" : "Recent Items"}
                </div>
                <div className="border border-gray-300 flex-1 min-h-0 overflow-y-scroll bg-white box-border">
                  {displayItems.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title={searchTerm ? "No results found" : "No items available"}
                      description={
                        searchTerm
                          ? "Try adjusting your search terms"
                          : "No items available to add as traces"
                      }
                      testid="trace-items-empty"
                    />
                  ) : (
                    displayItems.map((item, index) => (
                      <ListItemStyle
                        key={item.id}
                        className={`px-6 py-4 border-b border-gray-100 ${
                          index === displayItems.length - 1 ? "border-b-0" : ""
                        }`}
                        testid={`trace-item-${item.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {item.status === "approved" ? (
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
                            {addingTraceId === item.id ? "Adding..." : "Add Trace"}
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
