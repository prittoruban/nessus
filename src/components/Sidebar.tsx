'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ArrowUpTrayIcon as ArrowUpTrayIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  PresentationChartLineIcon as PresentationChartLineIconSolid
} from '@heroicons/react/24/solid'

interface SidebarProps {
  className?: string
}

interface NavItem {
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconSolid: React.ComponentType<React.SVGProps<SVGSVGElement>>
  path: string
  description: string
  badge?: string
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    path: '/',
    description: 'Overview & Analytics'
  },
  {
    name: 'Upload Scans',
    icon: ArrowUpTrayIcon,
    iconSolid: ArrowUpTrayIconSolid,
    path: '/upload',
    description: 'Import vulnerability data'
  },
  {
    name: 'Reports',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    path: '/reports',
    description: 'Manage assessments',
    badge: 'New'
  },
  {
    name: 'Risk Insights',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    path: '/insights',
    description: 'Vulnerability trends'
  },
  {
    name: 'Executive Summary',
    icon: PresentationChartLineIcon,
    iconSolid: PresentationChartLineIconSolid,
    path: '/overview',
    description: 'Leadership dashboard'
  }
]

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load collapsed state from localStorage on mount
    const savedCollapsedState = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsedState !== null) {
      setIsCollapsed(savedCollapsedState === 'true')
    }
  }, [])

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false)
      }
    }

    if (isMobileOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isMobileOpen])

  const isActivePath = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    // Save collapsed state to localStorage
    localStorage.setItem('sidebar-collapsed', newCollapsedState.toString())
  }

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  if (!mounted) {
    return (
      <div className={`bg-white border-r border-gray-200 ${isCollapsed ? 'w-16' : 'w-64'} h-screen transition-all duration-300 overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-b border-gray-200`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className={`${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-gray-200 rounded-lg flex-shrink-0`}></div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              )}
            </div>
          </div>
          <div className={`${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'} space-y-3`}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`${isCollapsed ? 'h-12' : 'h-16'} bg-gray-200 rounded-lg`}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle navigation menu"
      >
        {isMobileOpen ? (
          <XMarkIcon className="h-6 w-6 text-gray-600" />
        ) : (
          <Bars3Icon className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          ${isCollapsed ? 'w-16' : 'w-64'} 
          h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          fixed lg:static z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col overflow-hidden
          ${className}
        `}
      >
        {/* Header */}
        <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-b border-gray-200 transition-all duration-300`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="relative">
                <div className={`${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm transition-all duration-300`}>
                  <ShieldCheckIcon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} text-white transition-all duration-300`} />
                </div>
                <div className={`absolute -top-1 -right-1 ${isCollapsed ? 'w-3.5 h-3.5' : 'w-3 h-3'} bg-green-500 rounded-full border-2 border-white transition-all duration-300`}></div>
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold text-gray-900 truncate">
                    Vulnerability Portal
                  </h1>
                  <p className="text-xs text-gray-500 truncate">Security Assessment</p>
                </div>
              )}
            </div>
            
            {/* Desktop Collapse Toggle */}
            {!isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Collapse sidebar"
              >
                <Bars3Icon className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
          
          {/* Collapsed state expand button */}
          {isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex w-full mt-3 p-2 rounded-md hover:bg-gray-100 transition-colors justify-center"
              aria-label="Expand sidebar"
            >
              <Bars3Icon className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'} space-y-1 overflow-y-auto overflow-x-hidden transition-all duration-300`}>
          {navigationItems.map((item) => {
            const isActive = isActivePath(item.path)
            const IconComponent = isActive ? item.iconSolid : item.icon
            
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`
                  group relative flex items-center text-sm font-medium rounded-lg transition-all duration-200
                  ${isCollapsed 
                    ? 'px-3 py-3 justify-center' 
                    : 'px-3 py-2.5'
                  }
                  ${isActive
                    ? isCollapsed
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`
                  ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} 
                  flex-shrink-0 transition-all duration-200
                  ${isActive 
                    ? isCollapsed 
                      ? 'text-white' 
                      : 'text-blue-600'
                    : 'text-gray-400 group-hover:text-gray-500'
                  }
                `} />
                
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {item.name}
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}

                {/* Badge indicator for collapsed state */}
                {isCollapsed && item.badge && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-t border-gray-200 transition-all duration-300`}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="font-medium">v2.1.0</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Pro
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">Live</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="group relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                {/* Tooltip for status */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  System Online
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-2 border-transparent border-r-gray-900"></div>
                </div>
              </div>
              <div className="group relative">
                <div className="px-1.5 py-0.5 bg-green-100 rounded text-xs font-medium text-green-700">
                  Pro
                </div>
                {/* Tooltip for version */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Version 2.1.0 Pro
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-2 border-transparent border-r-gray-900"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
