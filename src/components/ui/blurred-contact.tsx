import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { portfolioConfig } from "@/config/portfolio"

interface BlurredContactProps {
  children: ReactNode
  type: "email" | "phone" | "all"
  className?: string
}

export default function BlurredContact({ children, type, className = "" }: BlurredContactProps) {
  const [privacySettings, setPrivacySettings] = useState(portfolioConfig.privacy)

  // Listen for privacy toggle events
  useEffect(() => {
    const handlePrivacyToggle = (event: CustomEvent) => {
      setPrivacySettings({
        ...privacySettings,
        hideContact: event.detail.hideContact,
        showPublicInfoOnly: event.detail.hideContact
      })
    }

    window.addEventListener('privacyToggled', handlePrivacyToggle as EventListener)
    return () => window.removeEventListener('privacyToggled', handlePrivacyToggle as EventListener)
  }, [privacySettings])

  const { hideContact, showPublicInfoOnly, blurIntensity } = privacySettings

  // Don't blur if hideContact is false
  if (!hideContact) {
    return <>{children}</>
  }

  // For showPublicInfoOnly mode, completely hide email and phone
  if (showPublicInfoOnly && (type === "email" || type === "phone")) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <EyeOff className="h-4 w-4" />
          <span className="text-sm">Contact info hidden</span>
        </div>
      </div>
    )
  }

  // Get blur class based on intensity
  const getBlurClass = () => {
    switch (blurIntensity) {
      case "sm":
        return "blur-sm"
      case "md":
        return "blur-md"
      case "lg":
        return "blur-lg"
      default:
        return "blur-md"
    }
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Blurred content */}
      <div className={`${getBlurClass()} transition-all duration-300 group-hover:blur-none`}>
        {children}
      </div>
      
      {/* Overlay with eye icon */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm rounded-lg opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none"
        initial={{ opacity: 1 }}
        whileHover={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-xs">Hover to reveal</span>
        </div>
      </motion.div>
    </div>
  )
}
