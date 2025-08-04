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
      // Try multiple selectors to find the scrollable container
      let mainElement = document.querySelector('main.overflow-y-auto') as HTMLElement
      if (!mainElement) {
        mainElement = document.querySelector('main') as HTMLElement
      }
      if (!mainElement) {
        // Fallback to document element for window scrolling
        return document.documentElement
      }
      return mainElement
    }

    const toggleVisibility = () => {
      const container = scrollContainerRef.current || findScrollContainer()
      if (container) {
        const scrollTop = container === document.documentElement ? window.pageYOffset : container.scrollTop
        if (scrollTop > 300) {
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
      
      // Add event listener based on container type
      if (container === document.documentElement) {
        window.addEventListener('scroll', throttledToggleVisibility)
      } else {
        container.addEventListener('scroll', throttledToggleVisibility)
      }
      
      // Initial check
      toggleVisibility()

      return () => {
        if (container === document.documentElement) {
          window.removeEventListener('scroll', throttledToggleVisibility)
        } else {
          container.removeEventListener('scroll', throttledToggleVisibility)
        }
      }
    }
  }, [throttle])

  const scrollToTop = () => {
    const container = scrollContainerRef.current
    if (container) {
      if (container === document.documentElement) {
        // Use window.scrollTo for document scrolling
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      } else {
        // Use container.scrollTo for element scrolling
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
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
