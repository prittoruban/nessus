'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface SidebarProps {
  className?: string
}

interface NavItem {
  name: string
  icon: string
  path: string
  subItems: {
    name: string
    path: string
    icon: string
    sourceType: 'internal' | 'external'
  }[]
}

const navigationItems: NavItem[] = [
  {
    name: 'Quick Scan Uploads',
    icon: '📤',
    path: '/upload',
    subItems: [
      {
        name: 'Internal',
        path: '/upload?source=internal',
        icon: '🏢',
        sourceType: 'internal'
      },
      {
        name: 'External',
        path: '/upload?source=external',
        icon: '🌐',
        sourceType: 'external'
      }
    ]
  },
  {
    name: 'Risk Insights',
    icon: '📊',
    path: '/insights',
    subItems: [
      {
        name: 'Internal',
        path: '/insights?source=internal',
        icon: '🏢',
        sourceType: 'internal'
      },
      {
        name: 'External',
        path: '/insights?source=external',
        icon: '🌐',
        sourceType: 'external'
      }
    ]
  },
  {
    name: 'Overview of Results',
    icon: '👁️',
    path: '/overview',
    subItems: [
      {
        name: 'Internal',
        path: '/overview?source=internal',
        icon: '🏢',
        sourceType: 'internal'
      },
      {
        name: 'External',
        path: '/overview?source=external',
        icon: '🌐',
        sourceType: 'external'
      }
    ]
  },
  {
    name: 'Reports',
    icon: '📋',
    path: '/reports',
    subItems: [
      {
        name: 'Internal',
        path: '/reports?source=internal',
        icon: '🏢',
        sourceType: 'internal'
      },
      {
        name: 'External',
        path: '/reports?source=external',
        icon: '🌐',
        sourceType: 'external'
      }
    ]
  }
]

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Quick Scan Uploads', 'Reports'])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActivePath = (path: string) => {
    if (path === '/upload' && pathname === '/upload') return true
    if (path === '/reports' && pathname === '/reports') return true
    if (path === '/insights' && pathname === '/insights') return true
    if (path === '/overview' && pathname === '/overview') return true
    return pathname.startsWith(path) && path !== '/'
  }

  const isActiveSubItem = (path: string) => {
    if (!mounted) return false // Prevent hydration mismatch
    
    const url = new URL(path, 'http://localhost')
    const currentSource = searchParams.get('source')
    const expectedSource = url.searchParams.get('source')
    
    return pathname === url.pathname && currentSource === expectedSource
  }

  return (
    <div className={`bg-gray-900 text-white w-80 h-screen overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Nessus Portal</h1>
            <p className="text-gray-400 text-sm">Vulnerability Assessment</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const isExpanded = expandedItems.includes(item.name)
          const isActive = isActivePath(item.path)
          
          return (
            <div key={item.name} className="space-y-1">
              {/* Main Navigation Item */}
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => toggleExpanded(item.name)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="text-sm">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>

              {/* Sub Items */}
              {isExpanded && (
                <div className="ml-8 space-y-1">
                  {item.subItems.map((subItem) => {
                    const isSubActive = isActiveSubItem(subItem.path)
                    
                    return (
                      <Link
                        key={subItem.path}
                        href={subItem.path}
                        className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                          isSubActive
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <span className="text-sm">{subItem.icon}</span>
                        <span className="text-sm">{subItem.name}</span>
                        <span className={`ml-auto px-2 py-1 text-xs rounded-full ${
                          subItem.sourceType === 'internal' 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-orange-900 text-orange-300'
                        }`}>
                          {subItem.sourceType.charAt(0).toUpperCase()}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-900">
        <div className="text-center text-xs text-gray-500">
          <p>Nessus VA Portal v1.0</p>
          <p className="mt-1">© 2025 Security Assessment</p>
        </div>
      </div>
    </div>
  )
}
