import { TraceLink } from './TraceLink';
import { FormField } from './FormField';

interface TraceLinkData {
  id: string;
  title: string;
  description?: string;
  type?: 'user' | 'system' | 'testcase' | 'risk';
}

interface TraceLinksSectionProps {
  title: string;
  links: TraceLinkData[];
  type: 'user' | 'system' | 'testcase' | 'risk';
  loading?: boolean;
}

export function TraceLinksSection({ title, links, type, loading = false }: TraceLinksSectionProps) {
  const content = loading ? (
    <div className="flex h-10 w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500">
      Loading...
    </div>
  ) : (!links || links.length === 0) ? (
    <div className="w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 italic">
      No requirements linked.
    </div>
  ) : (
    <div className="w-full border border-gray-300 bg-white px-3 py-2">
      <div className="space-y-0.5">
        {links.map((link) => (
          <TraceLink
            key={link.id}
            id={link.id}
            title={link.title}
            description={link.description}
            type={link.type || type}
          />
        ))}
      </div>
    </div>
  );

  // If no title provided, return content directly without FormField wrapper
  if (!title) {
    return content;
  }

  return (
    <FormField label={title}>
      {content}
    </FormField>
  );
}