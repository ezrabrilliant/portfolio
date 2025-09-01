"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Eye, EyeOff, Shield, X } from "lucide-react"

interface PrivacyControllerProps {
  onPrivacyChange: (settings: {
    hideContact: boolean
    showPublicInfoOnly: boolean
    blurIntensity: "sm" | "md" | "lg"
  }) => void
}

export default function PrivacyController({ onPrivacyChange }: PrivacyControllerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState({
    hideContact: false,
    showPublicInfoOnly: false,
    blurIntensity: "md" as "sm" | "md" | "lg"
  })

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onPrivacyChange(newSettings)
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        title="Privacy Settings"
      >
        <Shield className="h-6 w-6" />
      </motion.button>

      {/* Privacy Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className="relative bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-purple-600" />
                  <h3 className="text-xl font-bold">Privacy Settings</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Settings */}
              <div className="space-y-6">
                {/* Hide Contact Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Hide Contact Info</p>
                      <p className="text-sm text-muted-foreground">Blur email and phone</p>
                    </div>
                  </div>
                  <motion.button
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.hideContact ? 'bg-purple-600' : 'bg-muted'
                    }`}
                    onClick={() => handleSettingChange('hideContact', !settings.hideContact)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{
                        left: settings.hideContact ? '24px' : '2px'
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>

                {/* Public Only Mode */}
                {settings.hideContact && (
                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Public Info Only</p>
                        <p className="text-sm text-muted-foreground">Hide contact completely</p>
                      </div>
                    </div>
                    <motion.button
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.showPublicInfoOnly ? 'bg-purple-600' : 'bg-muted'
                      }`}
                      onClick={() => handleSettingChange('showPublicInfoOnly', !settings.showPublicInfoOnly)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                        animate={{
                          left: settings.showPublicInfoOnly ? '24px' : '2px'
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </motion.div>
                )}

                {/* Blur Intensity */}
                {settings.hideContact && !settings.showPublicInfoOnly && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium">Blur Intensity</p>
                    </div>
                    <div className="flex gap-2">
                      {(['sm', 'md', 'lg'] as const).map((intensity) => (
                        <motion.button
                          key={intensity}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            settings.blurIntensity === intensity
                              ? 'bg-purple-600 text-white'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => handleSettingChange('blurIntensity', intensity)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {intensity.toUpperCase()}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 These settings help protect your privacy when sharing your portfolio publicly.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
