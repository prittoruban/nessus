'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronUpIcon } from '@heroicons/react/24/outline'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const scrollContainerRef = useRef<HTMLElement | null>(null)

  // Throttle function for better performance
  const throttle = useCallback((func: () => void, limit: number) => {
    let inThrottle: boolean
    return function() {
      if (!inThrottle) {
        func()
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }, [])

  // Show button when page is scrolled down
  useEffect(() => {
    // Find the scrollable container (main element with overflow-y-auto)
    const findScrollContainer = () => {
      const mainElement = document.querySelector('main.overflow-y-auto')
      return mainElement as HTMLElement
    }

    const toggleVisibility = () => {
      const container = scrollContainerRef.current || findScrollContainer()
      if (container) {
        if (container.scrollTop > 300) {
          setIsVisible(true)
        } else {
          setIsVisible(false)
        }
      }
    }

    // Throttled version for better performance
    const throttledToggleVisibility = throttle(toggleVisibility, 100)

    const container = findScrollContainer()
    if (container) {
      scrollContainerRef.current = container
      container.addEventListener('scroll', throttledToggleVisibility)
      
      // Initial check
      toggleVisibility()

      return () => {
        container.removeEventListener('scroll', throttledToggleVisibility)
      }
    }
  }, [throttle])

  const scrollToTop = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      // Fallback to window scroll
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="back-to-top fade-in-up fixed bottom-6 right-6 z-[9999] p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group sm:bottom-8 sm:right-8"
          aria-label="Back to top"
          title="Back to top"
        >
          <ChevronUpIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:animate-bounce" />
        </button>
      )}
    </>
  )
}
