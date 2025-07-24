'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  className?: string
}

interface NavItem {
  name: string
  icon: string
  path: string
  description: string
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    icon: '🏠',
    path: '/',
    description: 'Overview & Home'
  },
  {
    name: 'Upload Scans',
    icon: '📤',
    path: '/upload',
    description: 'Upload CSV scan results'
  },
  {
    name: 'Reports',
    icon: '📋',
    path: '/reports',
    description: 'View & manage reports'
  },
  {
    name: 'Risk Insights',
    icon: '📊',
    path: '/insights',
    description: 'Vulnerability analytics'
  },
  {
    name: 'Overview',
    icon: '📈',
    path: '/overview',
    description: 'Executive summaries'
  }
]

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActivePath = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  if (!mounted) {
    return (
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white w-72 h-screen ${className}`}>
        <div className="animate-pulse">
          <div className="p-6 border-b border-slate-700">
            <div className="h-6 bg-slate-700 rounded mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white w-72 h-screen overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🛡️</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Nessus Portal
            </h1>
            <p className="text-slate-400 text-sm">Vulnerability Assessment</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const isActive = isActivePath(item.path)
          
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`group relative flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"></div>
              )}
              
              {/* Icon */}
              <div className={`text-2xl transition-transform duration-300 ${
                isActive ? 'scale-110' : 'group-hover:scale-110'
              }`}>
                {item.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                }`}>
                  {item.name}
                </div>
                <div className={`text-xs transition-colors duration-300 ${
                  isActive ? 'text-blue-200' : 'text-slate-400 group-hover:text-slate-300'
                }`}>
                  {item.description}
                </div>
              </div>

              {/* Hover effect */}
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-400 shadow-lg shadow-blue-400/50' 
                  : 'bg-transparent group-hover:bg-slate-400'
              }`}></div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>v2.0.1</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}
