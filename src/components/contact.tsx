"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { useState } from "react"
import { 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  Github, 
  Linkedin, 
  Instagram,
  CheckCircle,
  Loader2 
} from "lucide-react"
import { portfolioConfig } from "@/config/portfolio"
import BlurredContact from "@/components/ui/blurred-contact"

export default function Contact() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 300,
        duration: 0.6,
      },
    },
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    setFormData({ name: "", email: "", message: "" })
    
    // Reset success state after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github':
        return <Github className="h-5 w-5" />
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />
      case 'instagram':
        return <Instagram className="h-5 w-5" />
      default:
        return <Mail className="h-5 w-5" />
    }
  }

  const getSocialColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github':
        return 'from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
      case 'linkedin':
        return 'from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700'
      case 'instagram':
        return 'from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500'
      default:
        return 'from-primary to-primary/80 hover:from-primary/80 hover:to-primary/60'
    }
  }

  return (
    <section id="contact" className="py-20 relative overflow-hidden">
      {/* Background decorations */}
      <motion.div 
        className="absolute top-32 right-20 w-96 h-96 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div 
        className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl"
        animate={{
          scale: [1.1, 1, 1.1],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="container mx-auto px-4">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="max-w-6xl mx-auto"
        >
          {/* Section Header */}
          <motion.div 
            className="text-center mb-16"
            variants={itemVariants}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-4 relative inline-block"
              whileHover={{ 
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              }}
            >
              Get in <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Touch</span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                initial={{ width: "0%" }}
                animate={inView ? { width: "100%" } : { width: "0%" }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </motion.h2>
            <motion.p 
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Let's collaborate and create something amazing together
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Contact Info */}
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
            >
              {/* Contact Information Card */}
              <motion.div 
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg"
                variants={itemVariants}
                whileHover={{ 
                  y: -5,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
              >
                <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                <div className="space-y-6">
                  {/* Email */}
                  <BlurredContact type="email">
                    <motion.div 
                      className="flex items-center gap-4 group cursor-pointer"
                      whileHover={{ x: 5 }}
                      onClick={() => window.open(`mailto:${portfolioConfig.personal.email}`)}
                    >
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground group-hover:text-primary transition-colors">
                          {portfolioConfig.personal.email}
                        </p>
                      </div>
                    </motion.div>
                  </BlurredContact>

                  {/* Phone */}
                  <BlurredContact type="phone">
                    <motion.div 
                      className="flex items-center gap-4 group cursor-pointer"
                      whileHover={{ x: 5 }}
                      onClick={() => window.open(`tel:${portfolioConfig.personal.phone}`)}
                    >
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground group-hover:text-primary transition-colors">
                          {portfolioConfig.personal.phone}
                        </p>
                      </div>
                    </motion.div>
                  </BlurredContact>

                  {/* Location */}
                  <motion.div 
                    className="flex items-center gap-4 group"
                    whileHover={{ x: 5 }}
                  >
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">
                        {portfolioConfig.personal.location}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Social Links Card */}
              <motion.div 
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg"
                variants={itemVariants}
                whileHover={{ 
                  y: -5,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
              >
                <h3 className="text-2xl font-bold mb-6">Follow Me</h3>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(portfolioConfig.social).map(([platform, url]) => (
                    <motion.a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${getSocialColor(platform)} text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl`}
                      whileHover={{ 
                        scale: 1.05,
                        y: -2,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {getSocialIcon(platform)}
                      <span className="capitalize">{platform}</span>
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {/* Call to Action Card */}
              <motion.div 
                className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-border/50 rounded-2xl p-8 shadow-lg text-center"
                variants={itemVariants}
                whileHover={{ 
                  y: -5,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
              >
                <h4 className="text-xl font-bold mb-3">Ready to Start?</h4>
                <p className="text-muted-foreground mb-6">
                  Let's discuss your project and turn your ideas into reality
                </p>
                <motion.button
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const messageForm = document.getElementById('message');
                    messageForm?.focus();
                  }}
                >
                  Let's Get Started →
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg h-full flex flex-col"
              variants={itemVariants}
              whileHover={{ 
                y: -5,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              }}
            >
              <h3 className="text-2xl font-bold mb-2">Send me a message</h3>
              <p className="text-muted-foreground mb-8">
                Have a project in mind? Let's discuss how we can work together to bring your ideas to life.
              </p>
              
              {isSubmitted ? (
                <motion.div 
                  className="text-center py-12 flex-1 flex flex-col justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 0.6 }}
                  >
                    <CheckCircle className="h-10 w-10 text-white" />
                  </motion.div>
                  <h4 className="text-xl font-bold text-green-600 mb-2">Message Sent!</h4>
                  <p className="text-muted-foreground">Thank you for reaching out. I'll get back to you soon!</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Full Name
                      </label>
                      <motion.input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300"
                        placeholder="Enter your full name"
                        whileFocus={{ scale: 1.02 }}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <motion.input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300"
                        placeholder="Enter your email address"
                        whileFocus={{ scale: 1.02 }}
                      />
                    </div>

                    <div className="flex-1">
                      <label htmlFor="message" className="block text-sm font-medium mb-2">
                        Message
                      </label>
                      <motion.textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={8}
                        className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 resize-none h-32 min-h-[8rem]"
                        placeholder="Tell me about your project or just say hi!"
                        whileFocus={{ scale: 1.02 }}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
