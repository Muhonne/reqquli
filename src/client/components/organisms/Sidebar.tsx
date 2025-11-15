import { useNavigate, useLocation } from 'react-router-dom'
import { GitBranch, FileText, Settings, TestTube, CheckSquare, Activity, AlertTriangle } from 'lucide-react'
import { UserSessionBox } from '../molecules/UserSessionBox'
import { ListItemStyle } from '../atoms'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const navigationItems = [
    { label: 'Traceability', path: '/', icon: GitBranch },
    { label: 'User Requirements', path: '/user-requirements', icon: FileText },
    { label: 'System Requirements', path: '/system-requirements', icon: Settings },
    { label: 'Risk Management', path: '/risks', icon: AlertTriangle },
    { label: 'Test Cases', path: '/test-cases', icon: TestTube },
    { label: 'Test Runs', path: '/test-runs', icon: CheckSquare }
  ]

  const bottomNavigationItems = [
    { label: 'Audit Trail', path: '/audit', icon: Activity }
  ]
  
  return (
    <aside className="w-64 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Reqquli</h1>
      </div>
      
      <UserSessionBox />
      
      <nav className="flex-1 overflow-y-auto">
        <div className="py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
                           (item.path === '/user-requirements' && location.pathname.startsWith('/user-requirements/')) ||
                           (item.path === '/system-requirements' && location.pathname.startsWith('/system-requirements/')) ||
                           (item.path === '/risks' && location.pathname.startsWith('/risks/')) ||
                           (item.path === '/test-cases' && location.pathname.startsWith('/test-cases/')) ||
                           (item.path === '/test-runs' && location.pathname.startsWith('/test-runs/'))
            return (
              <ListItemStyle
                key={item.label}
                isActive={isActive}
                onClick={() => navigate(item.path)}
                className={`
                  w-full px-4 py-3 flex items-center gap-3 justify-start rounded-none
                  ${isActive
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-gray-700' : 'text-gray-500'}`} />
                <span className="text-[15px]">{item.label}</span>
              </ListItemStyle>
            )
          })}
        </div>
      </nav>

      {/* Bottom navigation items */}
      <div className="border-t border-gray-200 py-2">
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path ||
                          (item.path === '/audit' && location.pathname.startsWith('/audit'))
          return (
            <ListItemStyle
              key={item.label}
              isActive={isActive}
              onClick={() => navigate(item.path)}
              className={`
                w-full px-4 py-3 flex items-center gap-3 justify-start rounded-none
                ${isActive
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
              testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-700' : 'text-gray-500'}`} />
              <span className="text-[15px]">{item.label}</span>
            </ListItemStyle>
          )
        })}
      </div>
    </aside>
  )
}