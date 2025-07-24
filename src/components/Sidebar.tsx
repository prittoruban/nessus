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
    icon: '●',
    path: '/',
    description: 'Overview & Analytics'
  },
  {
    name: 'Upload Scans',
    icon: '↑',
    path: '/upload',
    description: 'Import vulnerability data'
  },
  {
    name: 'Reports',
    icon: '□',
    path: '/reports',
    description: 'Manage assessments'
  },
  {
    name: 'Risk Insights',
    icon: '⟨⟩',
    path: '/insights',
    description: 'Vulnerability trends'
  },
  {
    name: 'Executive Summary',
    icon: '▲',
    path: '/overview',
    description: 'Leadership dashboard'
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
    <div className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white w-72 h-screen overflow-hidden shadow-2xl border-r border-slate-700/50 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 backdrop-blur-sm bg-slate-800/30">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-lg">VA</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Vulnerability Portal
            </h1>
            <p className="text-slate-400 text-sm font-medium">Assessment Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const isActive = isActivePath(item.path)
          
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`group relative flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-indigo-500/20 text-white shadow-lg border border-blue-500/30 backdrop-blur-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/8 hover:backdrop-blur-sm'
              }`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-blue-400 via-purple-500 to-indigo-500 rounded-r-full shadow-lg shadow-blue-500/50"></div>
              )}
              
              {/* Icon */}
              <div className={`text-lg font-bold transition-all duration-300 ${
                isActive ? 'scale-110 drop-shadow-lg text-blue-400' : 'group-hover:scale-110 text-slate-400'
              }`}>
                {item.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm transition-colors duration-300 ${
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

              {/* Status indicator */}
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-400 to-purple-500 shadow-lg shadow-blue-400/50' 
                  : 'bg-transparent group-hover:bg-slate-400'
              }`}></div>

              {/* Hover glow effect */}
              {!isActive && (
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Version 2.1</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30">Enterprise</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="font-medium">Secure</span>
          </div>
        </div>
      </div>
    </div>
  )
}
