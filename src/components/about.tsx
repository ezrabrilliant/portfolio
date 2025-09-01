"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Code, Server, Smartphone, Palette, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { portfolioConfig } from "@/config/portfolio"
import { use3DCard } from '@/hooks/use3DCard'

export default function About() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const skills = [
    {
      icon: <Code className="h-8 w-8 text-primary" />,
      title: "Frontend Development",
      description: "Creating responsive and interactive user interfaces",
    },
    {
      icon: <Server className="h-8 w-8 text-primary" />,
      title: "Backend Development", 
      description: "Building robust APIs and server-side applications",
    },
    {
      icon: <Smartphone className="h-8 w-8 text-primary" />,
      title: "Mobile Development",
      description: "Cross-platform mobile app development",
    },
    {
      icon: <Palette className="h-8 w-8 text-primary" />,
      title: "UI/UX Design",
      description: "User-centered design and prototyping",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.8,
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

  const statsVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.5,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 15,
        stiffness: 200,
        duration: 0.8,
      },
    },
  }

  return (
    <section id="about" className="py-20 relative overflow-hidden">
      {/* Background decorations */}
      <motion.div 
        className="absolute top-20 right-20 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl"
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
        className="absolute bottom-20 left-20 w-56 h-56 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-2xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 15,
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
              About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Me</span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: "0%" }}
                animate={inView ? { width: "100%" } : { width: "0%" }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </motion.h2>
            <motion.p 
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Get to know more about my journey, skills, and passion for creating digital experiences
            </motion.p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Profile Image */}
            <motion.div 
              className="flex justify-center lg:justify-start"
              variants={itemVariants}
            >
              <motion.div 
                className="relative group"
                whileHover={{ 
                  scale: 1.05,
                  rotate: 2,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
              >
                {/* Glowing background */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transform -translate-x-4 translate-y-4 group-hover:blur-2xl transition-all duration-300"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                <motion.div 
                  className="relative w-80 h-80 rounded-2xl overflow-hidden border-4 border-border shadow-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm"
                  whileHover={{
                    boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                    <Users className="h-32 w-32 text-muted-foreground/50" />
                  </div>
                  {/* Overlay text */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white font-semibold text-lg">Add Your Photo Here</span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* About Content */}
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <h3 className="text-2xl font-bold mb-4">Who I Am</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                  {portfolioConfig.about.introduction}
                </p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <h4 className="text-xl font-semibold mb-3 text-primary">What I Bring</h4>
                <ul className="space-y-2">
                  {portfolioConfig.about.highlights.map((highlight, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-3 text-muted-foreground"
                      initial={{ opacity: 0, x: -20 }}
                      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {highlight}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg"
                >
                  <a href="#contact" className="flex items-center">
                    Let's Work Together
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Skills Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
          >
            {skills.map((skill, index) => (
              <SkillCard key={index} skill={skill} index={index} />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

interface StatsCardProps {
  stat: { value: string; label: string };
  index: number;
  inView: boolean;
}

function StatsCard({ stat, index, inView }: StatsCardProps) {
  const { cardRef, handleMouseMove, handleMouseLeave } = use3DCard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="holographic-card text-center p-6 rounded-xl bg-gradient-to-br from-background/50 to-muted/20 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-500"
        style={{
          '--mouse-x': '50%',
          '--mouse-y': '50%',
        } as React.CSSProperties}
      >
        {/* Holographic shine overlay */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div 
            className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent"
            style={{
              background: `radial-gradient(circle 200px at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.15) 0%, transparent 50%)`,
            }}
          />
          <div 
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg at var(--mouse-x) var(--mouse-y), 
                rgba(59, 130, 246, 0.1) 0deg, 
                rgba(147, 51, 234, 0.1) 120deg, 
                rgba(236, 72, 153, 0.1) 240deg, 
                rgba(59, 130, 246, 0.1) 360deg)`,
            }}
          />
        </div>

        <div className="relative z-10">
          <motion.div 
            className="text-3xl md:text-4xl font-bold text-primary mb-2"
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : { scale: 0 }}
            transition={{ delay: 0.5 + index * 0.1, type: "spring", stiffness: 200 }}
          >
            {stat.value}
          </motion.div>
          <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
        </div>
      </div>
    </motion.div>
  );
}

interface SkillCardProps {
  skill: { icon: React.ReactNode; title: string; description: string };
  index: number;
}

function SkillCard({ skill, index }: SkillCardProps) {
  const { cardRef, handleMouseMove, handleMouseLeave } = use3DCard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="holographic-card p-6 rounded-xl bg-gradient-to-br from-background/80 to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-500"
        style={{
          '--mouse-x': '50%',
          '--mouse-y': '50%',
        } as React.CSSProperties}
      >
        {/* Holographic shine overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div 
            className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent"
            style={{
              background: `radial-gradient(circle 200px at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.15) 0%, transparent 50%)`,
            }}
          />
          <div 
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg at var(--mouse-x) var(--mouse-y), 
                rgba(59, 130, 246, 0.1) 0deg, 
                rgba(147, 51, 234, 0.1) 120deg, 
                rgba(236, 72, 153, 0.1) 240deg, 
                rgba(59, 130, 246, 0.1) 360deg)`,
            }}
          />
        </div>

        <div className="relative z-10">
          <motion.div 
            className="p-3 rounded-lg bg-primary/10 mb-4 w-fit group-hover:bg-primary/20 transition-colors"
            whileHover={{ 
              scale: 1.1,
              rotate: 5,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {skill.icon}
          </motion.div>
          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {skill.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {skill.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
