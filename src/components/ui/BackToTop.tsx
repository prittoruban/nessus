"use client";

import { useState, useEffect } from "react";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Check scroll position of the main element
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', toggleVisibility);
      // Check initial state
      toggleVisibility();
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', toggleVisibility);
      }
    };
  }, []);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-300 border-2 border-white hover:scale-105"
      aria-label="Back to top"
      title="Back to top"
      style={{ 
        zIndex: 10000,
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        backgroundColor: '#2563eb',
        color: 'white',
        border: '2px solid white',
        borderRadius: '50%',
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: 'white' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
