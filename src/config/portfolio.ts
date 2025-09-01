// Portfolio Configuration
export const portfolioConfig = {
  // Privacy S    
  privacy: {
    hideContact: true, // Set to true to blur/hide contact information
    showPublicInfoOnly: true, // Set to true to show only public info (GitHub, LinkedIn)
    blurIntensity: "md", // "sm", "md", "lg" - blur intensity when hideContact is true
  },

  // Personal Information
  personal: {
    name: "Ezra",
    lastName: "Brilliant",
    fullName: "Ezra Brilliant",
    title: "Business Information Systems Student | Business Intelligence Specialist",
    subtitle: "Mobile Development & Business Intelligence Expert",
    description: "Bridging **technology** and **business** through **data-driven solutions** and **intelligent systems**",
    location: "Indonesia",
    email: "ezrakonterliem@gmail.com",
    phone: "+62-8788-456-7890",
    avatar: "https://avatars.githubusercontent.com/u/64943463?v=4",
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
    introduction: "**Business Information Systems** student at Petra Christian University specializing in **Business Intelligence** and **Mobile Development**. Experienced with data analytics, business process optimization, and modern development technologies.",
    highlights: [
      "Enhanced analytical and technical skills through the **Bangkit Academy 2024 Mobile Development Path**, completing industry-aligned training and certifications.",
      "Seeking to drive digital transformation through **business intelligence solutions** and **data-driven mobile applications**."
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
      title: "E-commerce Bot Developer & Payment Integration Specialist",
      company: "FlowOrbit - Commercial Discord Bot Platform",
      type: "Entrepreneurial Project",
      location: "Remote",
      startDate: "2024-07",
      endDate: "2025-04",
      description: "Developed and deployed a production-ready Discord e-commerce bot with real QRIS payment integration serving hundreds of active customers. Successfully processed thousands of monetary transactions through Midtrans API, creating a fully automated sales platform within Discord ecosystem.",
      technologies: ["Discord.js", "Node.js", "Midtrans API", "QRIS", "JavaScript", "Express.js", "MongoDB", "Webhook Integration"],
      achievements: [
        "Built commercial Discord bot processing real monetary transactions with hundreds of active users",
        "Integrated enterprise-level QRIS payment system with Midtrans API for seamless transactions",
        "Achieved thousands of successful transactions in live production environment",
        "Developed scalable architecture handling multiple concurrent transactions and high user traffic",
        "Implemented secure webhook validation and real-time payment verification system",
        "Created automated order fulfillment system with customer base management and transaction history"
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
      description: "Graduated as top cohort from intensive mobile development program focused on Android development, Flutter, UI/UX design, and mobile app architecture.",
      technologies: ["Android", "Kotlin", "Flutter", "Dart", "Firebase", "UI/UX Design", "Mobile Architecture"],
      achievements: [
        "Graduated as top student in the cohort",
        "Completed comprehensive mobile development curriculum with distinction",
        "Gained expertise in native Android and cross-platform development",
        "Developed and published mobile applications",
        "Led team projects using agile methodologies",
        "Recognized for outstanding mobile app projects"
      ]
    }
  ],

  // Education
  education: [
    {
      id: 1,
      institution: "Petra Christian University",
      degree: "Bachelor of Business Information Systems",
      field: "Business Intelligence",
      startDate: "2022-09",
      endDate: "2026-06",
      gpa: "3.14/4.0",
      description: "Focused on business information systems, business intelligence, data analytics, and digital business transformation for modern enterprise solutions.",
      achievements: [
        "Maintained GPA of 3.14/4.0",
        "Specializing in Business Intelligence and Information Systems",
        "Active in business case competitions and technology innovation projects",
        "Completed coursework in Business Analytics, Enterprise Systems, and Data Warehousing",
        "Participated in various business intelligence and technology communities"
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
      title: "Bee Furniture - Customer Relationship Management (CRM)",
      description: "A comprehensive web-based CRM application specifically developed for a wooden furniture manufacturing company to manage customers, wood products, transactions, and business operations efficiently.",
      longDescription: "Bee Furniture is a specialized Customer Relationship Management (CRM) system designed for wooden furniture companies. Built to handle the unique needs of furniture manufacturing, it manages customer relationships, wood product inventory, custom furniture orders, supplier relationships, and business analytics specifically tailored for the furniture industry.",
      image: "/projects/Bee.png",
      technologies: ["React", "TypeScript", "Node.js", "Express.js", "PostgreSQL", "Supabase", "Recharts", "JWT", "Docker"],
      features: [
        "Customer Management - Complete customer profiles and furniture order history",
        "Wood Product Management - Inventory system for various wood types and furniture products",
        "Custom Order Processing - Handle bespoke furniture orders and specifications",
        "Supplier Relationship Management - Track wood suppliers and material costs",
        "Production Workflow - Monitor furniture manufacturing process and timelines",
        "Quality Control Tracking - Ensure furniture quality standards and inspections",
        "Business Analytics Dashboard - Furniture sales insights and production KPIs",
        "Inventory Management - Real-time wood stock levels and material requirements"
      ],
      github: "https://github.com/ezrabrilliant/manpro",
      demo: "https://manpro.ezrabrilliant.tech",
      status: "completed",
      startDate: "2025-02",
      endDate: "2025-05"
    },
    {
      id: 2,
      title: "CineHub - Netflix Recommendation Hub",
      description: "An intelligent movie and TV show discovery platform featuring advanced AI recommendation algorithms, comprehensive data analytics, and modern streaming-inspired user experience for content exploration.",
      longDescription: "CineHub is a sophisticated entertainment discovery platform that revolutionizes how users find movies and TV shows. Built with cutting-edge machine learning algorithms utilizing cosine similarity for personalized recommendations, the platform features a dual database architecture combining PostgreSQL and MongoDB for optimal performance. The system includes comprehensive data analytics dashboards, Netflix-inspired modern UI design, and advanced filtering capabilities to enhance content discovery experience.",
      image: "/projects/cinehub.png",
      technologies: ["React", "TypeScript", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "Supabase", "Tailwind CSS", "Recharts"],
      features: [
        "Smart Recommendations - AI-powered content suggestions using cosine similarity",
        "Advanced Search & Filtering - Find content by genre, rating, year, and more",
        "Data Analytics Dashboard - Insights into content trends and patterns",
        "Dual Database Architecture - PostgreSQL + MongoDB for optimal performance",
        "Modern UI - Netflix-inspired design with responsive layout",
        "Machine Learning - ml-matrix for recommendation computations",
        "Real-time Data Visualization - Interactive charts with Recharts",
        "Content Management - Comprehensive movie and TV show database"
      ],
      github: "https://github.com/ezrabrilliant/cinehub",
      demo: "https://pdds.ezrabrilliant.tech",
      status: "completed",
      startDate: "2025-02",
      endDate: "2025-05"
    },

    {
      id: 3,
      title: "PeduliPasal - AI-Powered Legal Awareness App",
      description: "An intelligent Android application designed to assist lawyers and law students in navigating complex Indonesian legal statutes by quickly identifying relevant articles and legal provisions for specific cases.",
      longDescription: "PeduliPasal is a comprehensive legal assistance platform developed as part of Bangkit 2024 Capstone Project by Team C242-PS139. The application addresses the challenge faced by legal professionals in navigating complex legal statutes and identifying relevant articles for various cases. By utilizing advanced AI technology including TensorFlow and Gemini API, users can input case descriptions and receive accurate legal provisions. For example, inputting 'pelanggaran UU ITE terkait pornografi' returns specific violations like 'melanggar Pasal 45 Ayat 1. Pasal 27 Ayat 1 UU RI No. 1 Tahun 2024' with detailed penalty information. The app serves dual purposes: helping legal professionals develop effective strategies and educating law students about practical legal applications.",
      image: "/projects/PeduliPasal.png",
      technologies: ["Android", "Kotlin", "TensorFlow", "Gemini API", "Firebase", "XML", "Gradle", "Node.js", "Express.js", "Flask"],
      features: [
        "Case Analysis - Input case descriptions to receive relevant legal provisions and articles",
        "Legal Statute Navigation - Quick identification of applicable Indonesian laws and regulations",
        "Penalty Information - Detailed punishment and fine details for legal violations",
        "Professional Legal Aid - Assists lawyers in developing effective legal strategies",
        "Educational Resource - Helps law students understand practical legal applications",
        "Comprehensive Database - Access to extensive Indonesian legal statute collection",
        "AI-Powered Search - Advanced TensorFlow and Gemini API integration for accurate results",
        "User-Friendly Interface - Intuitive design for seamless legal research experience"
      ],
      github: "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal",
      demo: "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3",
      status: "completed",
      startDate: "2024-09",
      endDate: "2025-01"
    },
    {
      id: 4,
      title: "Orbit Store - Discord E-commerce Bot with Real QRIS Payment Integration",
      description: "A fully functional Discord-based e-commerce platform with real payment processing using QRIS integration through Midtrans API. Successfully deployed and actively used by hundreds of customers for automated proxy sales with seamless payment verification.",
      longDescription: "FlowOrbit is a comprehensive e-commerce automation system built entirely within Discord ecosystem using JavaScript and Node.js. This production-ready bot successfully processes real monetary transactions through Midtrans QRIS integration, serving hundreds of active customers in the proxy services market. The system handles the complete sales funnel from product browsing, automated order placement, real-time QRIS payment generation, instant payment verification via webhooks, to automatic order fulfillment. Built with enterprise-level security and reliability, this bot demonstrates advanced payment gateway integration, real-world transaction processing, and scalable Discord bot architecture. The platform has processed thousands of successful transactions, proving its commercial viability and technical robustness in a live production environment.",
      image: "/projects/QRIS.png",
      technologies: ["Discord.js", "MongoDB", "Midtrans API", "QRIS", "Webhook Integration", "Node.js", "Express.js", "JavaScript"],
      features: [
        "Real Payment Processing - Live QRIS integration with actual money transactions through Midtrans",
        "Production-Ready System - Successfully serving hundreds of active customers daily",
        "Automated E-commerce Flow - Complete sales process from browsing to fulfillment",
        "Enterprise Payment Security - Secure webhook validation and transaction verification",
        "Real-time Order Management - Instant payment confirmation and automated order processing",
        "Customer Base Management - Active user database with transaction history tracking",
        "Scalable Architecture - Handles multiple concurrent transactions and high user traffic",
        "Commercial Success - Thousands of successful transactions processed in production environment"
      ],
      github: "",
      demo: "/projects/flowOrbit.pdf",
      status: "completed",
      startDate: "2024-07",
      endDate: "2025-04"
    },
    {
      id: 5,
      title: "Diamond Lock Price Scraper - Growtopia Market Analytics",
      description: "An automated Python bot that scrapes Diamond Lock price data from the Growtopia Indonesia Discord community, processes fluctuating market data, and generates visual price charts and candlestick analysis.",
      longDescription: "Diamond Lock Price Scraper is a sophisticated data collection and analysis system designed to track the highly volatile Diamond Lock prices in the Growtopia gaming community. The project utilizes Python automation to scrape price data from the Growtopia Indonesia (GTID) Discord server, processes the collected information, and stores it in MongoDB for historical analysis. The bot generates comprehensive price visualizations including trend charts and candlestick patterns, providing valuable market insights for the gaming community. This project demonstrates expertise in web scraping, data processing, database management, and financial data visualization.",
      image: "/projects/DL.png",
      technologies: ["Python", "Discord.py", "MongoDB", "PyMongo", "Pandas", "Matplotlib", "BeautifulSoup4", "Requests", "mplfinance"],
      features: [
        "Automated Data Scraping - Real-time price collection from GTID Discord community",
        "Price Trend Analysis - Historical price tracking and fluctuation monitoring",
        "Candlestick Chart Generation - Financial-style market analysis with customizable timeframes",
        "MongoDB Integration - Efficient data storage and retrieval for historical analysis",
        "Discord Bot Commands - Interactive !hargadl and !candle commands for price queries",
        "Visual Data Export - Automated generation of hargadl.png and candle.png charts",
        "Market Volatility Tracking - Real-time monitoring of Diamond Lock price fluctuations",
        "Community Integration - Seamless integration with Growtopia gaming community"
      ],
      github: "https://github.com/ezrabrilliant/collect-price-dl",
      demo: "",
      status: "completed",
      startDate: "2024-05",
      endDate: "2024-05"
    },
    {
      id: 6,
      title: "PawCare - Pet Shop Management System",
      description: "A comprehensive pet shop management system built with Laravel, featuring service ordering, delivery tracking, and employee dashboards. Developed through complete SDLC from system analysis to deployment.",
      longDescription: "PawCare is an advanced pet shop management system developed during the Analysis and Design of Information Systems (ADSI) course. This project showcases the complete Software Development Life Cycle (SDLC) from initial system analysis, flowchart design, use case diagrams, to full implementation and deployment. Built with Laravel framework, the system streamlines pet shop operations by managing grooming services, day care, delivery services with Google Maps integration, and comprehensive order tracking. The platform includes multiple user roles with dedicated dashboards for customers, employees, and delivery personnel.",
      image: "/projects/PawCare.png",
      technologies: ["Laravel", "PHP", "JavaScript", "CSS", "MySQL", "Google Maps API", "Composer", "Node.js", "NPM"],
      features: [
        "Complete SDLC Implementation - From system analysis and design to deployment",
        "Service Management - Grooming, day care, and delivery service ordering",
        "Google Maps Integration - Distance calculation and delivery tracking via Distance Matrix API",
        "Multi-Role Dashboard - Customer, employee, and delivery personnel interfaces",
        "Order Tracking System - Real-time status updates for all services",
        "User Authentication - Secure login and registration system",
        "Order History - Complete transaction and service history tracking",
        "Responsive Design - Mobile-friendly interface for all user types"
      ],
      github: "https://github.com/ezrabrilliant/pawcare-laravel",
      demo: "https://pawcare.ezrabrilliant.tech",
      status: "completed",
      startDate: "2024-02",
      endDate: "2024-05"
    },

    {
      id: 7,
      title: "Pay2Win - Game Top-Up Website",
      description: "A comprehensive game top-up website featuring user authentication, balance management, and payment processing for game item purchases, built as a foundational web development project.",
      longDescription: "Pay2Win is a game top-up website developed as a final project for the Web Technology course in 3rd semester. The platform provides essential e-commerce functionalities including user login system, balance top-up mechanisms, and secure payment processing for game item purchases. Built using fundamental web technologies without frameworks, this project demonstrates core web development skills and database integration challenges. The development process involved managing complex PHP file structures and implementing AJAX-based data transfer between JavaScript and PHP for seamless database operations.",
      image: "/projects/Pay2Win.png",
      technologies: ["PHP", "JavaScript", "CSS", "Bootstrap", "MySQL", "AJAX", "HTML"],
      features: [
        "User Authentication - Secure login and registration system",
        "Balance Management - Top-up and balance tracking functionality",
        "Payment Processing - Secure payment system for game item purchases",
        "Game Item Catalog - Comprehensive listing of available game items",
        "Transaction History - Complete purchase and payment records",
        "AJAX Integration - Seamless data transfer between frontend and backend",
        "Database Operations - MySQL integration for data persistence",
        "Responsive Design - Bootstrap-based responsive user interface"
      ],
      github: "https://github.com/ezrabrilliant/project-tekweb",
      demo: "https://pay2win.ezrabrilliant.tech",
      status: "completed",
      startDate: "2023-10",
      endDate: "2023-12"
    },

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

export type PortfolioConfig = typeof portfolioConfig;
