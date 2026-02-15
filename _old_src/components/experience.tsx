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
    <section id="experience" className="py-8 md:py-12 lg:py-16 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/5 to-background" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 -right-24 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"
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
          className="absolute -bottom-24 -left-24 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"
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
          className="text-center mb-6 md:mb-8"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 relative inline-block">
            Experience &{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Education
            </span>
            <motion.div
              className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
            />
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            My professional journey and academic achievements that shaped my expertise in technology and innovation.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mb-6 md:mb-8 px-4"
        >
          <div className="relative bg-muted/50 p-1 rounded-2xl backdrop-blur-sm border border-border/50">
            <div className="relative z-10 flex flex-col sm:flex-row">
              <motion.button
                onClick={() => setActiveTab('work')}
                className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all duration-300 relative text-sm md:text-base ${
                  activeTab === 'work'
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === 'work' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg"
                    layoutId="activeBackground"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Building2 className="w-4 md:w-5 h-4 md:h-5 relative z-10" />
                <span className="relative z-10">Work Experience</span>
              </motion.button>
              
              <motion.button
                onClick={() => setActiveTab('education')}
                className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all duration-300 relative text-sm md:text-base ${
                  activeTab === 'education'
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === 'education' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg"
                    layoutId="activeBackground"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <GraduationCap className="w-4 md:w-5 h-4 md:h-5 relative z-10" />
                <span className="relative z-10">Education</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Experience Timeline */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto px-4"
        >
          {/* Simple card layout without timeline */}
          <div className="space-y-3 md:space-y-4">
            {experiences.map((item: ExperienceItem, index: number) => (
              <ExperienceCard
                key={`${activeTab}-${item.id}-${index}`}
                item={item}
                index={index}
                type={activeTab}
                isLast={index === experiences.length - 1}
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
          className="text-center mt-4 md:mt-6 px-4"
        >
          <motion.a
            href={portfolioConfig.personal.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm md:text-base"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-4 md:w-5 h-4 md:h-5" />
            Download Full Resume
            <ChevronRight className="w-3 md:w-4 h-3 md:h-4 group-hover:translate-x-1 transition-transform" />
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
  isLast?: boolean;
}

function ExperienceCard({ item, index, type, isLast = false }: ExperienceCardProps) {
  // Format date range
  const formatDateRange = (startDate: string, endDate: string | null) => {
    // Handle YYYY-MM format from portfolio.ts
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      
      // Split YYYY-MM format
      const parts = dateStr.split('-');
      if (parts.length !== 2) return dateStr; // fallback to original if not in expected format
      
      const year = parts[0];
      const monthNum = parseInt(parts[1]) - 1; // Convert to 0-based month
      
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      return `${monthNames[monthNum]} ${year}`;
    };

    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return `${start} - ${end}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative mb-4"
    >
      {/* Content Card */}
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
          <div className="group relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 lg:p-6 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden max-w-3xl mx-auto">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-2 md:mb-3">
              <div className="flex items-start gap-3 md:gap-4 mb-2 lg:mb-0 flex-1">
                <div className={`p-2 md:p-3 rounded-xl shadow-lg flex-shrink-0 ${
                  type === 'work' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                }`}>
                  {type === 'work' ? (
                    <Building2 className="w-4 md:w-5 lg:w-6 h-4 md:h-5 lg:h-6 text-white" />
                  ) : (
                    <GraduationCap className="w-4 md:w-5 lg:w-6 h-4 md:h-5 lg:h-6 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base md:text-lg lg:text-xl font-bold text-foreground mb-1 leading-tight">
                    {item.title || item.degree}
                  </h3>
                  <h4 className="text-sm md:text-base lg:text-lg font-semibold text-primary mb-1 leading-tight">
                    {item.company || item.institution}
                  </h4>
                </div>
              </div>
              
              {/* Move meta information to the right on larger screens */}
              <div className="lg:text-right lg:ml-4 flex-shrink-0">
                <div className="flex flex-col lg:items-end gap-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
                    <MapPin className="w-3 md:w-4 h-3 md:h-4 flex-shrink-0" />
                    <span>{item.location || 'Location not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
                    <Calendar className="w-3 md:w-4 h-3 md:h-4 flex-shrink-0" />
                    <span className="font-medium">{formatDateRange(item.startDate, item.endDate)}</span>
                  </div>
                  {item.gpa && (
                    <div className="inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs md:text-sm font-medium mt-1">
                      GPA: {item.gpa}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remove duplicate meta information section since it's now in header */}

            {/* Description */}
            {item.description && (
              <p className="text-muted-foreground leading-relaxed mb-2 md:mb-3 text-xs md:text-sm">
                {item.description}
              </p>
            )}

            {/* Technologies */}
            {item.technologies && item.technologies.length > 0 && (
              <div className="mb-2 md:mb-3">
                <h5 className="text-xs md:text-sm font-semibold text-foreground mb-1.5">
                  Technologies Used:
                </h5>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {item.technologies.map((tech: string, techIndex: number) => (
                    <motion.span
                      key={techIndex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: techIndex * 0.1 }}
                      className="px-2 md:px-3 py-1 md:py-1.5 bg-primary/10 text-primary text-xs md:text-sm rounded-full font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
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
                <ul className="space-y-1 md:space-y-1.5">
                  {item.achievements.map((achievement: string, achievementIndex: number) => (
                    <motion.li 
                      key={achievementIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: achievementIndex * 0.1 }}
                      className="flex items-start gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground"
                    >
                      <span className="text-primary font-bold mt-0.5 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{achievement}</span>
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
