import { useEffect, useState } from 'react'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'

interface AnalyticsProviderProps {
  children: React.ReactNode
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(false)
  const analytics = useGoogleAnalytics()

  useEffect(() => {
    // Check if user has consented to analytics
    const consent = localStorage.getItem('analytics-consent')
    if (consent === 'true') {
      setAnalyticsEnabled(true)
    } else if (consent === null) {
      // Show consent banner or enable by default
      // For now, we'll enable by default but respect user's choice
      setAnalyticsEnabled(true)
      localStorage.setItem('analytics-consent', 'true')
    }
  }, [])

  useEffect(() => {
    if (analyticsEnabled) {
      // Track initial page view
      analytics.trackPageView(document.title, window.location.href)
    }
  }, [analyticsEnabled, analytics])

  return (
    <>
      {children}
      {analyticsEnabled && (
        <div className="hidden">
          {/* Analytics is enabled */}
        </div>
      )}
    </>
  )
}

// Hook for components to track analytics events
export const useAnalyticsTracking = () => {
  const analytics = useGoogleAnalytics()
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(false)

  useEffect(() => {
    const consent = localStorage.getItem('analytics-consent')
    setAnalyticsEnabled(consent === 'true')
  }, [])

  const trackIfEnabled = (trackingFunction: () => void) => {
    if (analyticsEnabled) {
      trackingFunction()
    }
  }

  return {
    ...analytics,
    trackIfEnabled,
    analyticsEnabled,
    enableAnalytics: () => {
      localStorage.setItem('analytics-consent', 'true')
      setAnalyticsEnabled(true)
    },
    disableAnalytics: () => {
      localStorage.setItem('analytics-consent', 'false')
      setAnalyticsEnabled(false)
    }
  }
}
