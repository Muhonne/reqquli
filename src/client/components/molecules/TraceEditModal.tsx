import { useState, useEffect, useCallback } from "react";
import { Modal } from "./Modal";
import { Button, Input, ListItemStyle } from "../atoms";
import { TraceListItem } from "./TraceListItem";
import { RequirementCard } from "./RequirementCard";
import {
  userRequirementApi,
  systemRequirementApi,
  riskApi,
  tracesApi,
  testRunApi,
} from "../../services/api";

interface TraceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  requirementType: "user" | "system" | "risk";
  traceDirection?: "upstream" | "downstream" | "both";
  onSave: () => Promise<void>;
}

// Configuration for each requirement type's trace behavior
type DirectionConfig = {
  // Support multiple source APIs (e.g., system upstream can be from user requirements OR risks)
  getSourceApis: () => any[];
  getTracedIds: (traces: any[]) => string[];
  isTestCase?: boolean;
  // Function to determine fromId/toId based on direction
  getTraceIds: (direction: "upstream" | "downstream", itemId: string, requirementId: string) => {
    fromId: string;
    toId: string;
  };
};

type TraceConfig = {
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

  const config = TRACE_CONFIGS[requirementType];

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, requirementType, requirementId, traceDirection]);

  // Helper to get already traced IDs based on direction
  const getAlreadyTracedIds = useCallback(
    (direction: "upstream" | "downstream" | "both"): string[] => {
      const upstreamConfig = config.upstream;
      const downstreamConfig = config.downstream;

      if (direction === "upstream" && upstreamConfig) {
        return upstreamConfig.getTracedIds(upstreamTraces);
      }
      if (direction === "downstream" && downstreamConfig) {
        return downstreamConfig.getTracedIds(downstreamTraces);
      }
      if (direction === "both") {
        const upstreamIds = upstreamConfig
          ? upstreamConfig.getTracedIds(upstreamTraces)
          : [];
        const downstreamIds = downstreamConfig
          ? downstreamConfig.getTracedIds(downstreamTraces)
          : [];
        return [...upstreamIds, ...downstreamIds];
      }
      return [];
    },
    [config, upstreamTraces, downstreamTraces]
  );

  // Helper to load items for a specific direction (supports multiple source APIs)
  const loadItemsForDirection = async (
    directionConfig: DirectionConfig,
    searchTerm?: string
  ): Promise<any[]> => {
    const sourceApis = directionConfig.getSourceApis();
    const isTestCase = directionConfig.isTestCase || false;

    try {
      const listParams = {
        ...(searchTerm && { search: searchTerm }),
        sort: "lastModified",
        order: "desc" as const,
        limit: 20,
      };

      const allItems: any[] = [];

      // Load from all source APIs and combine results
      for (const sourceApi of sourceApis) {
        try {
          let response: any;
          if (isTestCase) {
            response = await sourceApi.listTestCases(listParams);
            const items = (response.data || []).map((tc: any) => ({
              id: tc.id,
              title: tc.title,
              description: tc.description,
              status: tc.status,
              type: "testcase" as const,
            }));
            allItems.push(...items);
          } else {
            response = await sourceApi.list(listParams);
            allItems.push(...(response.data || []));
          }
        } catch (error) {
          console.error("Error loading items from API:", error);
          // Continue with other APIs even if one fails
        }
      }

      // Remove duplicates by ID (in case same item appears from multiple APIs)
      const uniqueItems = Array.from(
        new Map(allItems.map((item) => [item.id, item])).values()
      );

      return uniqueItems;
    } catch (error) {
      console.error("Error loading items:", error);
      return [];
    }
  };

  // Helper to filter and format items
  const filterAndFormatItems = (
    items: any[],
    alreadyTracedIds: string[],
    isTestCase: boolean
  ): any[] => {
    return items
      .filter((item) => {
        if (isTestCase) {
          return !alreadyTracedIds.includes(item.id);
        }
        return (
          item.id !== requirementId &&
          !item.deletedAt &&
          !alreadyTracedIds.includes(item.id)
        );
      })
      .slice(0, 10);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current traces
      const tracesResponse =
        await tracesApi.getRequirementTraces(requirementId);
      setUpstreamTraces(tracesResponse.upstreamTraces);
      setDownstreamTraces(tracesResponse.downstreamTraces);

      // Load requirement details for title
      try {
        const reqResponse = await config.getApi(requirementId);
        setRequirement(reqResponse);
      } catch (error) {
        console.error("Failed to load requirement details:", error);
        setRequirement(null);
      }

      // Load recent items based on trace direction
      const directionsToLoad: ("upstream" | "downstream")[] = [];
      if (traceDirection === "upstream" || traceDirection === "both") {
        directionsToLoad.push("upstream");
      }
      if (traceDirection === "downstream" || traceDirection === "both") {
        directionsToLoad.push("downstream");
      }

      const allItems: any[] = [];
      for (const direction of directionsToLoad) {
        const directionConfig =
          direction === "upstream" ? config.upstream : config.downstream;
        if (!directionConfig) {continue;}

        const items = await loadItemsForDirection(directionConfig);
        const alreadyTracedIds = getAlreadyTracedIds(direction);
        const filtered = filterAndFormatItems(
          items,
          alreadyTracedIds,
          directionConfig.isTestCase || false
        );
        allItems.push(...filtered);
      }

      setRecentItems(allItems);
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
      const directionsToSearch: ("upstream" | "downstream")[] = [];
      if (traceDirection === "upstream" || traceDirection === "both") {
        directionsToSearch.push("upstream");
      }
      if (traceDirection === "downstream" || traceDirection === "both") {
        directionsToSearch.push("downstream");
      }

      const allResults: any[] = [];
      for (const direction of directionsToSearch) {
        const directionConfig =
          direction === "upstream" ? config.upstream : config.downstream;
        if (!directionConfig) {continue;}

        const items = await loadItemsForDirection(directionConfig, term);
        const alreadyTracedIds = getAlreadyTracedIds(
          traceDirection === "both" ? "both" : direction
        );
        const filtered = filterAndFormatItems(
          items,
          alreadyTracedIds,
          directionConfig.isTestCase || false
        );
        allResults.push(...filtered);
      }

      setSearchResults(allResults);
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
      await loadData();
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
      await tracesApi.deleteTrace(requirementId, traceId);
      await loadData();
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
      // Determine direction: if both directions are possible, check which one the item matches
      let direction: "upstream" | "downstream" = "downstream";
      
      if (traceDirection === "upstream") {
        direction = "upstream";
      } else if (traceDirection === "downstream") {
        direction = "downstream";
      } else if (traceDirection === "both") {
        // For "both", try to determine based on available configs
        // Prefer upstream if available, otherwise downstream
        direction = config.upstream ? "upstream" : "downstream";
      }

      const directionConfig =
        direction === "upstream" ? config.upstream : config.downstream;
      if (!directionConfig) {
        throw new Error(`No configuration for ${direction} direction`);
      }

      // Get fromId/toId based on direction (no types needed - backend determines from ID prefixes)
      const { fromId, toId } = directionConfig.getTraceIds(
        direction,
        itemId,
        requirementId
      );

      // Create trace with only IDs (types determined by backend from ID prefixes)
      await tracesApi.createTrace({ fromId, toId });

      await loadData();
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
            {/* Upstream Traces */}
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
