import { useNavigate } from 'react-router-dom';
import { ListItemStyle } from '../atoms';
import { Badge } from '../atoms/Badge';

interface TestResultLinkProps {
  id: string;
  testRunId: string;
  testRunName: string;
  description?: string;
  result: 'pass' | 'fail';
  className?: string;
}

export function TestResultLink({
  id,
  testRunId,
  testRunName,
  description,
  result,
  className = ''
}: TestResultLinkProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/test-runs/${testRunId}`);
  };

  return (
    <ListItemStyle
      className={`block p-1 ${className}`}
      onClick={handleClick}
      as="div"
    >
      <div
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Navigate to test run ${testRunId}`}
      >
        <div className="flex items-start gap-2">
          <Badge
            variant={result === 'pass' ? 'success' : 'error'}
            size="sm"
            className="mt-0.5"
          >
            {result.toUpperCase()}
          </Badge>
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900">
              {id} {testRunName}
            </div>
            {description && (
              <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </ListItemStyle>
  );
}