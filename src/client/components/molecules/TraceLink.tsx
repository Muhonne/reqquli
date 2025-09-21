import { useNavigate } from 'react-router-dom';
import { ListItemStyle } from '../atoms';
import { RequirementCard } from './RequirementCard';

interface TraceLinkProps {
  id: string;
  title?: string;
  description?: string;
  type: 'user' | 'system' | 'testcase';
  className?: string;
}

export function TraceLink({ id, title, description, type, className = '' }: TraceLinkProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const basePath = type === 'user' ? '/user-requirements' :
                     type === 'system' ? '/system-requirements' : '/test-cases';
    navigate(`${basePath}/${id}`);
  };

  return (
    <ListItemStyle
      className={`block p-1 ${className}`}
      onClick={handleClick}
      as="div"
    >
      <a
        href={`${type === 'user' ? '/user-requirements' : type === 'system' ? '/system-requirements' : '/test-cases'}/${id}`}
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className="block text-inherit no-underline"
        aria-label={`Navigate to ${type} requirement ${id}`}
      >
        <RequirementCard
          id={id}
          title={title || ''}
          description={description}
        />
      </a>
    </ListItemStyle>
  );
}