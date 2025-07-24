'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronUpIcon } from '@heroicons/react/24/outline'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

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
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Throttled version for better performance
    const throttledToggleVisibility = throttle(toggleVisibility, 100)

    window.addEventListener('scroll', throttledToggleVisibility)

    return () => {
      window.removeEventListener('scroll', throttledToggleVisibility)
    }
  }, [throttle])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="back-to-top fade-in-up fixed bottom-8 right-8 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
          aria-label="Back to top"
          title="Back to top"
        >
          <ChevronUpIcon className="w-6 h-6 group-hover:animate-bounce" />
        </button>
      )}
    </>
  )
}
