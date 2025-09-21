interface RequirementCardProps {
  id: string
  title: string
  description?: string
}

export function RequirementCard({ id, title, description }: RequirementCardProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm text-gray-900">
          {id} {title}
        </span>
      </div>
      
      {description && (
        <p className="text-xs text-gray-600 line-clamp-2">
          {description}
        </p>
      )}
    </>
  )
}