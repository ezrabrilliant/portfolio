"use client"

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Calendar, MapPin, Building2, GraduationCap, FileText, ChevronRight, Briefcase } from 'lucide-react';
import { portfolioConfig } from '@/config/portfolio';

interface ExperienceItem {
  id: number;
  title?: string;
  company?: string;
  institution?: string;
  degree?: string;
  field?: string;
  type?: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  gpa?: string;
  description?: string;
  technologies?: string[];
  achievements?: string[];
}

export default function Experience() {
  const [activeTab, setActiveTab] = useState<'work' | 'education'>('work');

  const experiences = activeTab === 'work' ? portfolioConfig.experience : portfolioConfig.education;

  return (
    <section id="experience" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/5 to-background" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4"
          >
            <Briefcase className="w-4 h-4" />
            My Journey
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Experience &{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Education
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            My professional journey and academic achievements that shaped my expertise in technology and innovation.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mb-16"
        >
          <div className="relative bg-muted/50 p-1 rounded-2xl backdrop-blur-sm border border-border/50">
            <motion.div
              className="absolute inset-1 bg-background rounded-xl shadow-lg"
              layoutId="activeTab"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                left: activeTab === 'work' ? '4px' : '50%',
                right: activeTab === 'education' ? '4px' : '50%',
              }}
            />
            <div className="relative z-10 flex">
              <button
                onClick={() => setActiveTab('work')}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'work'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="w-5 h-5" />
                Work Experience
              </button>
              <button
                onClick={() => setActiveTab('education')}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'education'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                Education
              </button>
            </div>
          </div>
        </motion.div>

        {/* Experience Timeline */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Timeline Line */}
          <div className="absolute left-6 md:left-1/2 transform md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 opacity-30"></div>
          
          <div className="space-y-8">
            {experiences.map((item: ExperienceItem, index: number) => (
              <ExperienceCard
                key={`${activeTab}-${item.id}-${index}`}
                item={item}
                index={index}
                type={activeTab}
              />
            ))}
          </div>
        </motion.div>

        {/* Resume Download */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-20"
        >
          <motion.a
            href={portfolioConfig.personal.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-5 h-5" />
            Download Full Resume
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

interface ExperienceCardProps {
  item: ExperienceItem;
  index: number;
  type: 'work' | 'education';
}

function ExperienceCard({ item, index, type }: ExperienceCardProps) {
  // Format date range
  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    const end = endDate 
      ? new Date(endDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
      : 'Present';
    return `${start} - ${end}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative flex flex-col md:flex-row items-start gap-6 ${
        index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
    >
      {/* Timeline Node */}
      <div className="absolute left-6 md:left-1/2 transform md:-translate-x-1/2 w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-4 border-background shadow-lg z-20"></div>
      
      {/* Content Card */}
      <motion.div
        className={`w-full md:w-5/12 ml-16 md:ml-0 ${
          index % 2 === 0 ? 'md:mr-8' : 'md:ml-8'
        }`}
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="group relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shadow-lg ${
                  type === 'work' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                }`}>
                  {type === 'work' ? (
                    <Building2 className="w-6 h-6 text-white" />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {item.title || item.degree}
                  </h3>
                  <h4 className="text-lg font-semibold text-primary">
                    {item.company || item.institution}
                  </h4>
                </div>
              </div>
            </div>

            {/* Meta Information */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{formatDateRange(item.startDate, item.endDate)}</span>
              </div>
              {item.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{item.location}</span>
                </div>
              )}
              {item.gpa && (
                <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  GPA: {item.gpa}
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-muted-foreground leading-relaxed mb-6">
                {item.description}
              </p>
            )}

            {/* Technologies */}
            {item.technologies && item.technologies.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-foreground mb-3">
                  Technologies Used:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {item.technologies.map((tech: string, techIndex: number) => (
                    <motion.span
                      key={techIndex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: techIndex * 0.1 }}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      {tech}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {item.achievements && item.achievements.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-foreground mb-3">
                  Key Achievements:
                </h5>
                <ul className="space-y-2">
                  {item.achievements.map((achievement: string, achievementIndex: number) => (
                    <motion.li 
                      key={achievementIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: achievementIndex * 0.1 }}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      {achievement}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
