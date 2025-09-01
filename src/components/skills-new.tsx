"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Code2, Database, Cloud, Palette, Users, Zap } from "lucide-react"
import { portfolioConfig } from "@/config/portfolio"
import { use3DCard } from '@/hooks/use3DCard'

export default function Skills() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20 
    },
    visible: {
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        <motion.div
          className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-3xl"
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
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative z-10"
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Technical <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Skills</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A comprehensive overview of my technical expertise and proficiency levels
            </p>
          </motion.div>

          {/* Technical Skills */}
          <motion.div 
            className="mb-16"
            variants={containerVariants}
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {portfolioConfig.skills.technical.map((skillCategory) => (
                <SkillCategoryCard key={skillCategory.category} skillCategory={skillCategory} />
              ))}
            </div>
          </motion.div>

          {/* Soft Skills */}
          <motion.div variants={itemVariants} className="text-center">
            <h3 className="text-2xl font-bold mb-8">Soft Skills</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {portfolioConfig.skills.soft.map((skill, index) => (
                <SoftSkillCard key={skill} skill={skill} index={index} />
              ))}
            </div>
          </motion.div>

          {/* Learning Philosophy */}
          <motion.div variants={itemVariants} className="text-center mt-16">
            <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/20">
              <motion.h4 
                className="text-xl font-semibold mb-4 text-primary"
                whileHover={{ scale: 1.05 }}
              >
                Always Learning
              </motion.h4>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Technology evolves rapidly, and I'm committed to continuous learning. I regularly explore new frameworks, 
                tools, and methodologies to stay current with industry trends and deliver cutting-edge solutions.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

interface SkillCategoryCardProps {
  skillCategory: any;
}

function SkillCategoryCard({ skillCategory }: SkillCategoryCardProps) {
  const { cardRef, handleMouseMove, handleMouseLeave } = use3DCard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="group"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="holographic-card bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg transition-all duration-500 h-full"
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

        {/* Content */}
        <div className="relative z-10">
          {/* Category Header */}
          <div className="flex items-center gap-3 mb-6">
            <motion.div 
              className={`p-3 bg-gradient-to-br ${getCategoryColor(skillCategory.category)} rounded-xl text-white`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {getCategoryIcon(skillCategory.category)}
            </motion.div>
            <h3 className="text-xl font-bold">{skillCategory.category}</h3>
          </div>

          {/* Skills List */}
          <div className="space-y-4">
            {skillCategory.skills.map((skill: any, idx: number) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="text-xs text-muted-foreground">{skill.level}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.level}%` }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 1,
                      delay: 0.5 + idx * 0.1,
                      ease: "easeOut"
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface SoftSkillCardProps {
  skill: string;
  index: number;
}

function SoftSkillCard({ skill, index }: SoftSkillCardProps) {
  const { cardRef, handleMouseMove, handleMouseLeave } = use3DCard();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="holographic-card p-4 rounded-xl bg-gradient-to-br from-background/80 to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-500 text-center group"
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
              background: `radial-gradient(circle 100px at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.15) 0%, transparent 50%)`,
            }}
          />
        </div>

        <div className="relative z-10">
          <motion.div 
            className="p-2 bg-primary/10 rounded-lg mb-3 w-fit mx-auto"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Users className="h-5 w-5 text-primary" />
          </motion.div>
          <h4 className="text-sm font-medium text-foreground">{skill}</h4>
        </div>
      </div>
    </motion.div>
  );
}

// Helper functions
function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case 'frontend':
      return 'from-blue-500 to-purple-500';
    case 'backend':
      return 'from-green-500 to-teal-500';
    case 'database':
      return 'from-orange-500 to-red-500';
    case 'cloud & devops':
      return 'from-purple-500 to-pink-500';
    case 'design':
      return 'from-pink-500 to-rose-500';
    case 'other':
      return 'from-gray-500 to-slate-500';
    default:
      return 'from-blue-500 to-purple-500';
  }
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'frontend':
      return <Code2 className="h-6 w-6" />;
    case 'backend':
      return <Database className="h-6 w-6" />;
    case 'database':
      return <Database className="h-6 w-6" />;
    case 'cloud & devops':
      return <Cloud className="h-6 w-6" />;
    case 'design':
      return <Palette className="h-6 w-6" />;
    case 'other':
      return <Zap className="h-6 w-6" />;
    default:
      return <Code2 className="h-6 w-6" />;
  }
}
