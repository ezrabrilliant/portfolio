import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Mail, Phone } from "lucide-react"
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
        <motion.div 
          className="flex items-center gap-4 group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-3 bg-gradient-to-br from-gray-400/70 to-gray-500/70 rounded-xl text-white/80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse"></div>
            {type === "email" ? (
              <Mail className="h-5 w-5 relative z-10" />
            ) : (
              <Phone className="h-5 w-5 relative z-10" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground mb-1">
              {type === "email" ? "Email" : "Phone"}
            </p>
            <motion.div 
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-3 py-1.5 rounded-lg border border-purple-200/30 dark:border-purple-700/30"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <EyeOff className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </motion.div>
              <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                Contact protected for privacy
              </span>
            </motion.div>
          </div>
        </motion.div>
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
      
      {/* Elegant overlay with gradient and animation */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/10 to-gray-100/20 dark:from-gray-800/20 dark:to-gray-900/30 backdrop-blur-sm rounded-xl opacity-100 group-hover:opacity-0 transition-all duration-300 pointer-events-none border border-border/30"
        initial={{ opacity: 1 }}
        whileHover={{ opacity: 0 }}
      >
        <motion.div 
          className="flex items-center gap-3 text-muted-foreground bg-background/80 px-4 py-2 rounded-lg shadow-sm border border-border/50"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Eye className="h-4 w-4" />
          </motion.div>
          <span className="text-sm font-medium">Hover to reveal</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
