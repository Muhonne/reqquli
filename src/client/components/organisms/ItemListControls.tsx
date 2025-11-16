import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { Input, Select, Button } from '../atoms';

interface StatusOption {
  value: string | undefined;
  label: string;
}

interface ItemListControlsProps {
  // Filter props
  search?: string;
  status?: string;
  totalCount: number;
  onSearchChange: (search: string | undefined) => void;
  onStatusChange: (status: string | undefined) => void;

  // Sorting props
  sortBy?: 'lastModified' | 'createdAt' | 'approvedAt';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => void;

  // Pagination props
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;

  // Custom status options for different entity types
  statusOptions?: StatusOption[];
  searchPlaceholder?: string;
}

function ItemListControlsComponent({
  search = '',
  status,
  totalCount: _totalCount,
  onSearchChange,
  onStatusChange,
  sortBy = 'lastModified',
  sortOrder = 'desc',
  onSortChange,
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  statusOptions = [
    { value: undefined, label: 'All' },
    { value: 'approved', label: 'Approved' },
    { value: 'draft', label: 'Draft' }
  ],
  searchPlaceholder = 'Search requirements...'
}: ItemListControlsProps) {
  const [searchTerm, setSearchTerm] = useState(search);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when props change
  useEffect(() => {
    setSearchTerm(search || '');
  }, [search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    
    // Set new timer for debounced search
    searchDebounceTimerRef.current = setTimeout(() => {
      onSearchChange(value.trim() || undefined);
    }, 300);
  }, [onSearchChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

  const handleStatusCycle = () => {
    // Cycle through status options
    const currentIndex = statusOptions.findIndex(opt => opt.value === status);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    onStatusChange(statusOptions[nextIndex].value);
  };

  const getStatusLabel = () => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.label || 'All';
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="border-b border-gray-200">
      <div className="px-4 py-4 space-y-2">
        {/* Full width search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-3 py-1.5 h-auto text-sm"
            testid="requirements-search"
          />
        </div>
        
        {/* Compact controls row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status filter */}
          <Button
            onClick={handleStatusCycle}
            variant="secondary"
            size="sm"
            className="text-xs h-7 px-2 min-w-[70px] flex items-center gap-1.5"
            testid="requirements-status-filter"
          >
            {getStatusLabel()}
            <RefreshCw className="w-3 h-3" />
          </Button>
          
          {/* Center: Sort controls */}
          <div className="flex items-center gap-1">
            <Select
              value={sortBy}
              onChange={(e) => onSortChange?.(e.target.value as 'lastModified' | 'createdAt' | 'approvedAt', sortOrder)}
              className="text-xs h-7 pl-2 pr-7 py-1"
              testid="requirements-sort"
              aria-label="Sort by"
            >
              <option value="lastModified">Last Modified</option>
              <option value="createdAt">Created</option>
              <option value="approvedAt">Approved</option>
            </Select>
            
            <Button
              onClick={() => onSortChange?.(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
              variant="secondary"
              size="sm"
              className="text-xs h-7 px-2"
              aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              testid="requirements-sort-order"
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          
          {/* Right: Pagination (if needed) */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-1">
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loading}
                variant="secondary"
                size="sm"
                className="text-xs h-7 px-2"
                aria-label="Previous page"
                testid="requirements-prev-page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              
              <span className="text-xs text-gray-600 font-medium">
                {currentPage}/{totalPages}
              </span>
              
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
                variant="secondary"
                size="sm"
                className="text-xs h-7 px-2"
                aria-label="Next page"
                testid="requirements-next-page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="w-[70px]"></div> // Spacer to keep sort controls centered
          )}
        </div>
      </div>
    </div>
  );
}

export const ItemListControls = memo(ItemListControlsComponent);