import { useNavigate } from 'react-router-dom';
import { ListItemStyle } from '../atoms';
import { RequirementCard } from './RequirementCard';

interface TraceLinkProps {
  id: string;
  title?: string;
  description?: string;
  type: 'user' | 'system' | 'testcase' | 'risk';
  className?: string;
}

export function TraceLink({ id, title, description, type, className = '' }: TraceLinkProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const basePath = type === 'user' ? '/user-requirements' :
                     type === 'system' ? '/system-requirements' :
                     type === 'risk' ? '/risks' : '/test-cases';
    navigate(`${basePath}/${id}`);
  };

  const getHref = () => {
    if (type === 'user') {return '/user-requirements';}
    if (type === 'system') {return '/system-requirements';}
    if (type === 'risk') {return '/risks';}
    return '/test-cases';
  };

  return (
    <ListItemStyle
      className={`block p-1 ${className}`}
      onClick={handleClick}
      as="div"
    >
      <a
        href={`${getHref()}/${id}`}
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