// Portfolio Configuration
const config = {
  // Personal Information
  personal: {
    name: "Ezra",
    fullName: "Ezra Brilliant",
    title: "Business Information Systems Student | Business Intelligence Specialist",
    subtitle: "Specializing in Business Intelligence with Mobile Development expertise from Bangkit Academy",
    description: "I'm specializing in Business Intelligence, with additional expertise as top graduate of Bangkit Academy Mobile Development program. Passionate about leveraging technology and data to drive business solutions.",
    location: "Indonesia",
    email: "ezrakonterliem@gmail.com",
    phone: "+62-8788-456-7890",
    avatar: "/placeholder-user.jpg",
    resume: "/resume.pdf"
  },

  // Social Links
  social: {
    github: "https://github.com/ezrabrilliant",
    linkedin: "https://linkedin.com/in/ezrabrilliant",
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
    introduction: "I'm a Business Information Systems student specializing in Business Intelligence, with additional recognition as top graduate of Bangkit Academy Mobile Development program. I love creating technology solutions that bridge business needs with data-driven insights.",
    highlights: [
      "Business Information Systems student with Business Intelligence specialization",
      "Top graduate of Bangkit Academy Mobile Development program (Google, Gojek, Tokopedia, Traveloka)",
      "Experienced in Discord bot development and payment system integration",
      "Skilled in mobile development, data analytics, and business intelligence tools",
      "Strong focus on bridging business requirements with technical solutions",
      "Passionate about automation, e-commerce solutions, and emerging technologies"
    ],
    stats: [
      { label: "Projects Completed", value: "15+" },
      { label: "Technologies", value: "20+" },
      { label: "Learning Hours", value: "500+" },
      { label: "GitHub Commits", value: "1000+" }
    ]
  },

  // Experience
  experience: [
    {
      id: 1,
      title: "Discord Bot Developer & Payment Integration Specialist",
      company: "Freelance Project",
      type: "Personal Project",
      location: "Remote",
      startDate: "2024-06",
      endDate: null,
      description: "Developed an automated Discord bot system for proxy sales with seamless QRIS payment integration through Midtrans. Created a complete e-commerce solution within Discord ecosystem.",
      technologies: ["Discord.js", "Node.js", "Midtrans API", "QRIS", "JavaScript", "Express.js", "Webhook Integration"],
      achievements: [
        "Built fully automated Discord sales bot for proxy services",
        "Integrated QRIS payment system using Midtrans API",
        "Implemented real-time payment verification and order processing",
        "Created seamless user experience from browsing to payment within Discord",
        "Automated order fulfillment and customer notification system",
        "Handled secure payment processing and transaction management"
      ]
    },
    {
      id: 2,
      title: "Mobile Development Graduate",
      company: "Bangkit Academy by Google, Tokopedia, Gojek & Traveloka",
      type: "Top Graduate",
      location: "Remote",
      startDate: "2024-09",
      endDate: "2025-01",
      description: "Graduated as top student from intensive mobile development program focused on Android development, Flutter, UI/UX design, and mobile app architecture.",
      technologies: ["Android", "Kotlin", "Flutter", "Dart", "Firebase", "UI/UX Design", "Mobile Architecture"],
      achievements: [
        "Graduated as top student in the cohort",
        "Completed comprehensive mobile development curriculum with distinction",
        "Gained expertise in native Android and cross-platform development",
        "Developed and published mobile applications",
        "Led team projects using agile methodologies",
        "Recognized for outstanding mobile app projects"
      ]
    },
    {
      id: 3,
      title: "Freelance Full Stack Developer",
      company: "Independent",
      type: "Freelance",
      location: "Remote",
      startDate: "2023-01",
      endDate: null,
      description: "Developing custom web applications and providing technical solutions for various clients and personal projects.",
      technologies: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "MongoDB"],
      achievements: [
        "Built 15+ web applications from scratch",
        "Maintained 99% client satisfaction rate",
        "Implemented modern development practices and clean architecture",
        "Delivered projects on time and within budget"
      ]
    }
  ],

  // Education
  education: [
    {
      id: 1,
      institution: "Telkom University",
      degree: "Bachelor of Business Information Systems",
      field: "Business Intelligence",
      startDate: "2022-09",
      endDate: "2026-06",
      gpa: "3.6/4.0",
      description: "Focused on business information systems, business intelligence, data analytics, and technology integration for business solutions.",
      achievements: [
        "Maintained GPA of 3.6/4.0",
        "Specializing in Business Intelligence and Data Analytics",
        "Active in business case competitions and tech projects",
        "Completed relevant coursework in Business Intelligence, Data Mining, and System Analysis",
        "Participated in various tech and business communities"
      ]
    },
    {
      id: 2,
      institution: "Bangkit Academy",
      degree: "Mobile Development Learning Path",
      field: "Mobile Development",
      startDate: "2024-09",
      endDate: "2025-01",
      gpa: "Top Graduate",
      description: "Intensive program by Google, Tokopedia, Gojek, and Traveloka focusing on mobile development, Android programming, and modern app architecture. More info: https://grow.google/intl/id_id/bangkit",
      achievements: [
        "Graduated as top student in the program",
        "Mastered Android development with Kotlin",
        "Gained expertise in Flutter and cross-platform development",
        "Completed capstone project with excellent mobile app",
        "Recognized for outstanding performance and leadership"
      ]
    }
  ],

  // Projects
  projects: [
    {
      id: 1,
      title: "Discord Proxy Sales Bot with QRIS Integration",
      description: "Automated Discord bot system for proxy sales with seamless QRIS payment integration through Midtrans API.",
      longDescription: "A comprehensive e-commerce solution built within Discord ecosystem. This bot handles the complete sales process from product browsing, order placement, automated QRIS payment generation via Midtrans, payment verification, and order fulfillment. Perfect integration between Discord.js and payment gateway for seamless user experience.",
      image: "/placeholder.jpg",
      technologies: ["Discord.js", "Node.js", "Midtrans API", "QRIS", "Express.js", "Webhook Integration", "JavaScript"],
      features: [
        "Automated product catalog display in Discord",
        "Real-time QRIS payment generation via Midtrans",
        "Instant payment verification and confirmation",
        "Automated order processing and fulfillment",
        "Customer notification system",
        "Transaction history and receipt generation",
        "Admin dashboard for order management",
        "Secure payment processing with webhook validation"
      ],
      github: "https://github.com/ezrabrilliant/discord-proxy-bot",
      demo: "https://discord-proxy-bot-demo.com",
      status: "completed",
      startDate: "2024-06",
      endDate: "2024-08"
    },
    {
      id: 2,
      title: "ManPro - Project Management System",
      description: "Comprehensive project management platform with advanced collaboration features and real-time tracking capabilities.",
      longDescription: "ManPro is a full-featured project management system designed for teams and organizations. It includes task management, team collaboration, project tracking, and comprehensive reporting tools. Built with modern web technologies for optimal performance and user experience.",
      image: "/placeholder.jpg",
      technologies: ["React", "TypeScript", "Node.js", "Express", "PostgreSQL", "Socket.io", "Tailwind CSS"],
      features: [
        "Project dashboard with real-time updates",
        "Task assignment and tracking",
        "Team collaboration tools",
        "Gantt chart visualization",
        "Time tracking and reporting",
        "File sharing and document management",
        "Real-time notifications",
        "Team performance analytics"
      ],
      github: "https://github.com/ezrabrilliant/manpro",
      demo: "https://manpro.ezrabrilliant.tech",
      status: "completed",
      startDate: "2024-08",
      endDate: "2024-11"
    },
    {
      id: 3,
      title: "CineHub - Movie Discovery Platform",
      description: "Modern movie discovery and review platform with personalized recommendations and social features.",
      longDescription: "CineHub is an innovative movie discovery platform that helps users find new movies, read reviews, and connect with other movie enthusiasts. Features include personalized recommendations, advanced search filters, user reviews, and social interaction capabilities.",
      image: "/placeholder.jpg",
      technologies: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "TMDB API", "NextAuth.js", "Tailwind CSS"],
      features: [
        "Movie search and discovery",
        "Personalized recommendations",
        "User reviews and ratings",
        "Watchlist management",
        "Social features and following",
        "Advanced filtering options",
        "Movie trailers and details",
        "User profile customization"
      ],
      github: "https://github.com/ezrabrilliant/cinehub",
      demo: "https://cinehub.ezrabrilliant.tech",
      status: "completed",
      startDate: "2024-05",
      endDate: "2024-07"
    },
    {
      id: 4,
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
      id: 5,
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
          { name: "React", level: 90, icon: "⚛️" },
          { name: "TypeScript", level: 85, icon: "📘" },
          { name: "Next.js", level: 80, icon: "▲" },
          { name: "Tailwind CSS", level: 88, icon: "🎨" },
          { name: "JavaScript", level: 92, icon: "💛" }
        ]
      },
      {
        category: "Mobile Development",
        skills: [
          { name: "Android", level: 88, icon: "🤖" },
          { name: "Kotlin", level: 85, icon: "🔷" },
          { name: "Flutter", level: 82, icon: "💙" },
          { name: "Dart", level: 80, icon: "🎯" },
          { name: "Firebase", level: 78, icon: "🔥" }
        ]
      },
      {
        category: "Backend",
        skills: [
          { name: "Node.js", level: 85, icon: "🟢" },
          { name: "Discord.js", level: 90, icon: "💬" },
          { name: "Express.js", level: 80, icon: "🚀" },
          { name: "PostgreSQL", level: 75, icon: "🐘" },
          { name: "MongoDB", level: 70, icon: "🍃" },
          { name: "Prisma", level: 78, icon: "🔷" }
        ]
      },
      {
        category: "Payment & API Integration",
        skills: [
          { name: "Midtrans API", level: 88, icon: "💳" },
          { name: "QRIS Integration", level: 85, icon: "📱" },
          { name: "Webhook Processing", level: 82, icon: "🔗" },
          { name: "REST API", level: 85, icon: "🌐" },
          { name: "Payment Gateway", level: 80, icon: "💰" }
        ]
      },
      {
        category: "Business Intelligence",
        skills: [
          { name: "Power BI", level: 80, icon: "📊" },
          { name: "Tableau", level: 75, icon: "📈" },
          { name: "SQL", level: 85, icon: "🗃️" },
          { name: "Excel", level: 90, icon: "📋" },
          { name: "Python", level: 70, icon: "🐍" }
        ]
      },
      {
        category: "Tools & Others",
        skills: [
          { name: "VS Code", level: 95, icon: "💻" },
          { name: "Figma", level: 70, icon: "🎨" },
          { name: "Postman", level: 85, icon: "📮" },
          { name: "Git", level: 90, icon: "📝" },
          { name: "Linux", level: 75, icon: "🐧" }
        ]
      }
    ],
    soft: [
      "Problem Solving",
      "Team Collaboration",
      "Communication",
      "Project Management",
      "Continuous Learning",
      "Agile Methodologies",
      "Critical Thinking",
      "Adaptability",
      "Business Intelligence",
      "Data Analysis"
    ]
  },

  // Certificates
  certificates: [
    {
      id: 1,
      title: "Bangkit Academy Mobile Development Graduate",
      issuer: "Bangkit Academy",
      date: "2025-01",
      credentialId: "BANGKIT-MD-2024",
      image: "/bangkit-cert.png",
      link: "https://grow.google/intl/id_id/bangkit/"
    },
    {
      id: 2,
      title: "Google Cloud Skills Boost",
      issuer: "Google Cloud",
      date: "2024-12",
      credentialId: "GCSB-2024",
      image: "/gcp-skills-cert.png",
      link: "https://www.cloudskillsboost.google/"
    }
  ],

  // Testimonials
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

  // Services
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
      features: ["Android Development", "Flutter", "iOS/Android", "App Store Deployment"]
    },
    {
      id: 3,
      title: "Discord Bot Development",
      description: "Custom Discord bots with advanced features and integrations",
      icon: "🤖",
      features: ["Payment Integration", "E-commerce Bots", "Automation", "API Integration"]
    },
    {
      id: 4,
      title: "Payment Integration",
      description: "Secure payment processing and gateway integration",
      icon: "💳",
      features: ["QRIS Integration", "Midtrans API", "Webhook Processing", "Real-time Verification"]
    },
    {
      id: 5,
      title: "Business Intelligence",
      description: "Data-driven insights and business analytics solutions",
      icon: "📊",
      features: ["Data Analysis", "Dashboard Creation", "Reporting", "Business Intelligence"]
    }
  ]
};

export { config as portfolioConfig };
export default config;
