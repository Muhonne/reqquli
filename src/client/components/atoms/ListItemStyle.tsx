import React, { memo } from 'react'

interface ListItemStyleProps {
  children: React.ReactNode
  isActive?: boolean
  onClick?: () => void
  className?: string
  asChild?: boolean
  as?: React.ElementType
  testid?: string
}

const ListItemStyleComponent = ({
  children,
  isActive = false,
  onClick,
  className = '',
  asChild = false,
  as: Component = 'div',
  testid
}: ListItemStyleProps) => {
  const baseStyles = 'cursor-pointer transition-all relative'
  
  const hoverStyles = isActive 
    ? 'bg-gray-200 shadow-inner' 
    : 'hover:bg-gray-100 hover:shadow-md'
    
  const activeStyles = isActive ? {
    boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.1), inset 0 1px 2px 0 rgba(0,0,0,0.06)',
    transform: 'translateY(1px)'
  } : {}

  const combinedClassName = `${baseStyles} ${hoverStyles} ${className}`.trim()

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as any;
    const newProps = {
      ...childProps,
      className: `${childProps.className || ''} ${combinedClassName}`.trim(),
      style: { ...childProps.style, ...activeStyles },
      onClick: onClick || childProps.onClick,
      'data-testid': testid
    };
    return React.cloneElement(children as React.ReactElement<any>, newProps)
  }

  return (
    <Component 
      data-testid={testid}
      className={combinedClassName}
      style={activeStyles}
      onClick={onClick}
    >
      {children}
    </Component>
  )
}

export const ListItemStyle = memo(ListItemStyleComponent)