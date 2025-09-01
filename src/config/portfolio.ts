// Portfolio Configuration - Easy to edit!
export const portfolioConfig = {
  // Personal Information
  personal: {
    name: "Ezra",
    fullName: "Ezra Brilliant",
    title: "Full Stack Developer",
    subtitle: "Passionate about creating amazing digital experiences",
    description: "Building modern web applications with cutting-edge technologies and user-centered design.",
    location: "Your Location",
    email: "your.email@example.com",
    phone: "+1234567890",
    avatar: "/placeholder-user.jpg", // Add your photo to public folder
    resume: "/resume.pdf" // Add your resume to public folder
  },

  // Social Links
  social: {
    github: "https://github.com/ezrabrilliant",
    linkedin: "https://linkedin.com/in/ezrabrilliant/",
    instagram: "https://instagram.com/ezrabrilliant"
  },

  // Navigation
  navigation: [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Projects", href: "#projects" },
    { name: "Experience", href: "#experience" },
    { name: "Contact", href: "#contact" }
  ],

  // About Section
  about: {
    introduction: "I'm a passionate full-stack developer with expertise in modern web technologies. I love creating digital solutions that make a real impact.",
    highlights: [
      "3+ years of experience in web development",
      "Specialized in React, TypeScript, and Node.js",
      "Strong focus on user experience and performance",
      "Continuous learner and technology enthusiast"
    ],
    stats: [
      { label: "Projects Completed", value: "50+" },
      { label: "Years Experience", value: "3+" },
      { label: "Happy Clients", value: "25+" },
      { label: "Technologies", value: "15+" }
    ]
  },

  // Experience
  experience: [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "Tech Company Inc.",
      type: "Full-time",
      location: "Remote",
      startDate: "2023-01",
      endDate: null, // null means current
      description: "Leading frontend development for enterprise applications using React and TypeScript.",
      technologies: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      achievements: [
        "Improved application performance by 40%",
        "Led a team of 5 developers",
        "Implemented new design system"
      ]
    },
    {
      id: 2,
      title: "Full Stack Developer",
      company: "Startup Solutions",
      type: "Full-time",
      location: "New York, NY",
      startDate: "2022-06",
      endDate: "2022-12",
      description: "Developed and maintained full-stack applications using MERN stack.",
      technologies: ["React", "Node.js", "MongoDB", "Express"],
      achievements: [
        "Built 3 client projects from scratch",
        "Reduced load times by 60%",
        "Mentored junior developers"
      ]
    }
  ],

  // Education
  education: [
    {
      id: 1,
      institution: "University of Technology",
      degree: "Bachelor of Computer Science",
      field: "Software Engineering",
      startDate: "2019-09",
      endDate: "2023-06",
      gpa: "3.13/4.0",
      description: "Focused on software engineering, algorithms, and data structures.",
      achievements: [
        "Dean's List for 6 semesters",
        "President of Computer Science Club",
        "Led hackathon winning team"
      ]
    }
  ],

  // Projects
  projects: [
    {
      id: 1,
      title: "E-Commerce Platform",
      description: "A modern e-commerce platform with advanced features including real-time inventory, payment processing, and admin dashboard.",
      longDescription: "This comprehensive e-commerce solution features a customer-facing store, admin dashboard, and vendor portal. Built with microservices architecture for scalability.",
      image: "/placeholder.jpg",
      technologies: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Stripe"],
      features: [
        "Real-time inventory management",
        "Multi-vendor support",
        "Advanced search and filtering",
        "Payment processing with Stripe",
        "Admin analytics dashboard"
      ],
      github: "https://github.com/ezrabrilliant/ecommerce",
      demo: "https://ecommerce-demo.com",
      status: "completed",
      startDate: "2024-01",
      endDate: "2024-03"
    },
    {
      id: 2,
      title: "Task Management App",
      description: "A collaborative task management application with real-time updates and team collaboration features.",
      longDescription: "Full-featured project management tool with kanban boards, team collaboration, and real-time notifications.",
      image: "/placeholder.jpg",
      technologies: ["React", "Firebase", "Material-UI", "Node.js"],
      features: [
        "Kanban board interface",
        "Real-time collaboration",
        "File attachments",
        "Due date notifications",
        "Team member management"
      ],
      github: "https://github.com/ezrabrilliant/taskapp",
      demo: "https://taskapp-demo.com",
      status: "in-progress",
      startDate: "2024-04",
      endDate: null
    }
  ],

  // Skills
  skills: {
    technical: [
      {
        category: "Frontend",
        skills: [
          { name: "React", level: 95, icon: "⚛️" },
          { name: "TypeScript", level: 90, icon: "📘" },
          { name: "Next.js", level: 85, icon: "▲" },
          { name: "Tailwind CSS", level: 90, icon: "🎨" },
          { name: "Vue.js", level: 75, icon: "💚" }
        ]
      },
      {
        category: "Backend",
        skills: [
          { name: "Node.js", level: 88, icon: "🟢" },
          { name: "Python", level: 82, icon: "🐍" },
          { name: "PostgreSQL", level: 85, icon: "🐘" },
          { name: "MongoDB", level: 80, icon: "🍃" },
          { name: "Redis", level: 75, icon: "🔴" }
        ]
      },
      {
        category: "DevOps & Tools",
        skills: [
          { name: "Docker", level: 80, icon: "🐳" },
          { name: "AWS", level: 75, icon: "☁️" },
          { name: "Git", level: 95, icon: "📝" },
          { name: "CI/CD", level: 70, icon: "🔄" }
        ]
      }
    ],
    soft: [
      "Problem Solving",
      "Team Leadership",
      "Communication",
      "Project Management",
      "Mentoring",
      "Agile Methodologies"
    ]
  },

  // Certificates
  certificates: [
    {
      id: 1,
      title: "AWS Certified Developer",
      issuer: "Amazon Web Services",
      date: "2024-02",
      credentialId: "AWD-123456",
      image: "/aws-cert.png",
      link: "https://credly.com/badges/certificate-link"
    },
    {
      id: 2,
      title: "React Developer Certification",
      issuer: "Meta",
      date: "2023-11",
      credentialId: "META-789012",
      image: "/react-cert.png",
      link: "https://coursera.org/certificate-link"
    }
  ],

  // Testimonials (new feature!)
  testimonials: [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Product Manager",
      company: "Tech Corp",
      avatar: "/testimonial1.jpg",
      content: "Ezra delivered exceptional work on our project. His attention to detail and technical expertise made a huge difference.",
      rating: 5
    },
    {
      id: 2,
      name: "Mike Chen",
      role: "Senior Developer",
      company: "Innovation Labs",
      avatar: "/testimonial2.jpg",
      content: "Working with Ezra was fantastic. He brings fresh ideas and implements them with precision.",
      rating: 5
    }
  ],

  // Services (new feature!)
  services: [
    {
      id: 1,
      title: "Web Development",
      description: "Custom web applications built with modern technologies",
      icon: "💻",
      features: ["Responsive Design", "Performance Optimization", "SEO Friendly", "Cross-browser Compatible"]
    },
    {
      id: 2,
      title: "Mobile Development",
      description: "Native and cross-platform mobile applications",
      icon: "📱",
      features: ["React Native", "Flutter", "iOS/Android", "App Store Deployment"]
    },
    {
      id: 3,
      title: "UI/UX Design",
      description: "User-centered design that converts and engages",
      icon: "🎨",
      features: ["User Research", "Wireframing", "Prototyping", "Design Systems"]
    }
  ]
}

export type PortfolioConfig = typeof portfolioConfig
