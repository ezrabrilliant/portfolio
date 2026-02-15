import { useEffect } from 'react'

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: {
        page_title?: string
        page_location?: string
        custom_map?: Record<string, string>
        [key: string]: any
      }
    ) => void
    dataLayer: any[]
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'

export const useGoogleAnalytics = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize Google Analytics script
    const script1 = document.createElement('script')
    script1.async = true
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script1)

    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || []
    window.gtag = function() {
      window.dataLayer.push(arguments)
    }

    // Configure Google Analytics
    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    })

    return () => {
      // Cleanup script when component unmounts
      const scripts = document.querySelectorAll(`script[src*="googletagmanager.com/gtag/js"]`)
      scripts.forEach(script => script.remove())
    }
  }, [])

  // Track page views
  const trackPageView = (page_title: string, page_location: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_title,
        page_location,
      })
    }
  }

  // Track custom events
  const trackEvent = (eventName: string, parameters: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        event_category: parameters.category || 'engagement',
        event_label: parameters.label,
        value: parameters.value,
        ...parameters,
      })
    }
  }

  // Track section views
  const trackSectionView = (sectionName: string) => {
    trackEvent('section_view', {
      category: 'navigation',
      label: sectionName,
    })
  }

  // Track button clicks
  const trackButtonClick = (buttonName: string, location: string) => {
    trackEvent('button_click', {
      category: 'interaction',
      label: `${buttonName} - ${location}`,
    })
  }

  // Track project views
  const trackProjectView = (projectName: string) => {
    trackEvent('project_view', {
      category: 'portfolio',
      label: projectName,
    })
  }

  // Track contact form interactions
  const trackContactInteraction = (action: string) => {
    trackEvent('contact_interaction', {
      category: 'contact',
      label: action,
    })
  }

  // Track download events
  const trackDownload = (fileName: string) => {
    trackEvent('file_download', {
      category: 'download',
      label: fileName,
    })
  }

  return {
    trackPageView,
    trackEvent,
    trackSectionView,
    trackButtonClick,
    trackProjectView,
    trackContactInteraction,
    trackDownload,
  }
}