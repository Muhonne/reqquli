import { ReactNode } from 'react';

interface HeaderButton {
  key: string;
  element: ReactNode;
}

interface UnifiedHeaderProps {
  title: string;
  idText?: string | ReactNode;
  totalCount?: number;
  buttons?: HeaderButton[];
  className?: string;
}

export function UnifiedHeader({
  title,
  idText,
  totalCount,
  buttons = [],
  className = ''
}: UnifiedHeaderProps) {
  return (
    <div className={`px-4 py-4 border-b border-gray-200 h-16 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {idText && (
          <div className="flex-shrink-0">
            {typeof idText === 'string' ? (
              <span className="font-mono text-xs text-gray-600">
                {idText}
              </span>
            ) : (
              idText
            )}
          </div>
        )}
        <h1 className="text-base font-semibold text-gray-900">
          {title}
        </h1>
        {totalCount !== undefined && (
          <span className="text-xs text-gray-500 font-medium flex-shrink-0">
            ({totalCount})
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {buttons.map(button => (
          <div key={button.key}>
            {button.element}
          </div>
        ))}
      </div>
    </div>
  );
}