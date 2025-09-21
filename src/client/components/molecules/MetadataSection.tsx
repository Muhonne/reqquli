import { Badge } from '../atoms';
import { FormField } from './FormField';

interface MetadataField {
  label: string;
  value: string | null | undefined;
  type?: 'text' | 'date' | 'status' | 'badge';
}

interface MetadataSectionProps {
  title?: string;
  fields: MetadataField[];
  className?: string;
}

export function MetadataSection({ 
  title = 'Metadata', 
  fields, 
  className = ''
}: MetadataSectionProps) {
  
  const renderValue = (field: MetadataField) => {
    if (!field.value) {return <span className="text-gray-400">-</span>;}
    
    switch (field.type) {
      case 'date':
        return <span className="font-medium">{new Date(field.value).toLocaleString()}</span>;
      case 'status':
        return field.value === 'approved' ? (
          <Badge variant="success">Approved</Badge>
        ) : (
          <Badge variant="warning">Draft</Badge>
        );
      case 'badge':
        return <Badge variant="neutral">{field.value}</Badge>;
      default:
        return <span className="font-medium">{field.value}</span>;
    }
  };

  const visibleFields = fields.filter(field => field.value);
  
  if (visibleFields.length === 0) {
    return (
      <FormField label={title} className={className}>
        <div className="flex h-10 w-full border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 italic">
          No metadata available.
        </div>
      </FormField>
    );
  }

  return (
    <FormField label={title} className={className}>
      <div className="w-full border border-gray-300 bg-gray-50 px-3 py-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {visibleFields.map((field, index) => (
            <div key={index} className="flex">
              <span className="text-gray-500 min-w-fit">{field.label}:</span>
              <span className="ml-2">
                {renderValue(field)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FormField>
  );
}