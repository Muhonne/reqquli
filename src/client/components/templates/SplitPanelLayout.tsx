import { ReactNode } from 'react'

interface SplitPanelLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  leftPanelWidth?: string
  className?: string
}

export function SplitPanelLayout({
  leftPanel,
  rightPanel,
  leftPanelWidth = '400px',
  className = ''
}: SplitPanelLayoutProps) {
  return (
    <div className={`flex h-full ${className}`}>
      <div 
        className="border-r border-gray-200 flex flex-col overflow-hidden"
        style={{ width: leftPanelWidth, minWidth: leftPanelWidth }}
      >
        {leftPanel}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {rightPanel}
      </div>
    </div>
  )
}