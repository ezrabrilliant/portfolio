export const config = {
  personal: {
    name: "Ezra",
    lastName: "Brilliant",
    fullName: "Ezra Brilliant",
    title: "Business Information Systems Student",
    subtitle: "Mobile App Developer",
    description:
      "Building innovative digital solutions that bridge technology and business through mobile apps and data-driven systems.",
    location: "Surabaya, Indonesia",
    email: "ezrakonterliem@gmail.com",
    phone: "+62-8788-456-7890",
    avatar: "/avatar.jpg",
    resume: "/resume.pdf",
  },

  social: {
    github: "https://github.com/ezrabrilliant",
    linkedin: "https://linkedin.com/in/ezrabrilliant",
    instagram: "https://instagram.com/ezrabrilliant",
  },

  navigation: [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Skills", href: "#skills" },
    { name: "Projects", href: "#projects" },
    { name: "Experience", href: "#experience" },
    { name: "Contact", href: "#contact" },
  ],

  about: {
    introduction:
      "Business Information Systems student at Petra Christian University specializing in Business Intelligence and Mobile Development. Experienced with data analytics, business process optimization, and modern development technologies.",
    highlights: [
      "Enhanced analytical and technical skills through the Bangkit Academy 2024 Mobile Development Path, completing industry-aligned training and certifications.",
      "Seeking to drive digital transformation through business intelligence solutions and data-driven mobile applications.",
    ],
    stats: [
      { label: "Projects", value: "15+" },
      { label: "Technologies", value: "20+" },
      { label: "Learning Hours", value: "500+" },
      { label: "GitHub Commits", value: "1000+" },
    ],
  },

  experience: [
    {
      id: 1,
      title: "E-commerce Bot Developer & Payment Integration Specialist",
      company: "Orbit Store - Auto Store Discord Bot",
      type: "Entrepreneurial Project",
      location: "Remote",
      startDate: "2024-07",
      endDate: "2025-04",
      description:
        "Developed and deployed a production-ready Discord e-commerce bot with real QRIS payment integration serving hundreds of active customers.",
      technologies: [
        "Discord.js",
        "Node.js",
        "Midtrans API",
        "QRIS",
        "Express.js",
        "MongoDB",
      ],
      achievements: [
        "Built commercial Discord bot processing real monetary transactions with hundreds of active users",
        "Integrated enterprise-level QRIS payment system with Midtrans API",
        "Achieved thousands of successful transactions in live production environment",
        "Implemented secure webhook validation and real-time payment verification",
      ],
    },
    {
      id: 2,
      title: "Mobile Development Graduate",
      company: "Bangkit Academy by Google, Tokopedia, Gojek & Traveloka",
      type: "Top Graduate",
      location: "Remote",
      startDate: "2024-09",
      endDate: "2025-01",
      description:
        "Graduated as top cohort from intensive mobile development program focused on Android development, Flutter, UI/UX design, and mobile app architecture.",
      technologies: [
        "Android",
        "Kotlin",
        "Flutter",
        "Firebase",
        "UI/UX Design",
      ],
      achievements: [
        "Graduated as top student in the cohort",
        "Completed comprehensive mobile development curriculum with distinction",
        "Led team projects using agile methodologies",
      ],
    },
  ],

  education: [
    {
      id: 1,
      institution: "Bangkit Academy",
      degree: "Mobile Development Learning Path",
      field: "Mobile Development",
      startDate: "2024-09",
      endDate: "2025-01",
      location: "Remote",
      gpa: "Top Graduate",
      description:
        "Intensive program by Google, Tokopedia, Gojek, and Traveloka focusing on mobile development and modern app architecture.",
    },
    {
      id: 2,
      institution: "Petra Christian University",
      degree: "Bachelor of Business Information Systems",
      field: "Business Intelligence",
      startDate: "2022-09",
      endDate: "2026-06",
      gpa: "3.14/4.0",
      location: "Surabaya, Indonesia",
      description:
        "Focused on business information systems, business intelligence, data analytics, and digital business transformation.",
    },
  ],

  projects: [
    {
      id: 1,
      title: "Bee Furniture CRM",
      description:
        "Comprehensive web-based CRM for a wooden furniture company — managing customers, products, transactions, and business analytics.",
      image: "/projects/Bee.png",
      technologies: [
        "React",
        "TypeScript",
        "Node.js",
        "Express.js",
        "PostgreSQL",
        "Supabase",
        "Docker",
      ],
      github: "https://github.com/ezrabrilliant/manpro",
      demo: "https://manpro.ezrabrilliant.tech",
      status: "completed" as const,
      date: "2025",
    },
    {
      id: 2,
      title: "CineHub",
      description:
        "Intelligent movie and TV show discovery platform with AI recommendation algorithms using cosine similarity and dual database architecture.",
      image: "/projects/cinehub.png",
      technologies: [
        "React",
        "TypeScript",
        "Node.js",
        "PostgreSQL",
        "MongoDB",
        "Supabase",
        "Tailwind CSS",
      ],
      github: "https://github.com/ezrabrilliant/cinehub",
      demo: "https://pdds.ezrabrilliant.tech",
      status: "completed" as const,
      date: "2025",
    },
    {
      id: 3,
      title: "PeduliPasal",
      description:
        "AI-powered Android app to assist lawyers and law students in navigating Indonesian legal statutes using TensorFlow and Gemini API.",
      image: "/projects/PeduliPasal.png",
      technologies: [
        "Android",
        "Kotlin",
        "TensorFlow",
        "Gemini API",
        "Firebase",
        "Flask",
      ],
      github:
        "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal",
      demo: "https://github.com/aliefauzan/Bangkit-Project-PeduliPasal/releases/tag/1.5.3",
      status: "completed" as const,
      date: "2024",
    },
    {
      id: 4,
      title: "Orbit Store",
      description:
        "Discord-based e-commerce platform with real QRIS payment processing through Midtrans API, serving hundreds of customers.",
      image: "/projects/QRIS.png",
      technologies: [
        "Discord.js",
        "MongoDB",
        "Midtrans API",
        "QRIS",
        "Node.js",
        "Express.js",
      ],
      github: "",
      demo: "",
      status: "completed" as const,
      date: "2024",
    },
    {
      id: 5,
      title: "DL Price Scraper",
      description:
        "Automated Python bot scraping Diamond Lock prices from Growtopia community, generating candlestick charts and market analytics.",
      image: "/projects/DL.png",
      technologies: [
        "Python",
        "Discord.py",
        "MongoDB",
        "Pandas",
        "Matplotlib",
      ],
      github: "https://github.com/ezrabrilliant/collect-price-dl",
      demo: "",
      status: "completed" as const,
      date: "2024",
    },
    {
      id: 6,
      title: "PawCare",
      description:
        "Pet shop management system with service ordering, delivery tracking via Google Maps, and multi-role dashboards.",
      image: "/projects/PawCare.png",
      technologies: [
        "Laravel",
        "PHP",
        "MySQL",
        "Google Maps API",
        "JavaScript",
      ],
      github: "https://github.com/ezrabrilliant/pawcare-laravel",
      demo: "https://pawcare.ezrabrilliant.tech",
      status: "completed" as const,
      date: "2024",
    },
    {
      id: 7,
      title: "Pay2Win",
      description:
        "Game top-up website with user authentication, balance management, and payment processing built with vanilla PHP.",
      image: "/projects/Pay2Win.png",
      technologies: ["PHP", "JavaScript", "MySQL", "Bootstrap", "AJAX"],
      github: "https://github.com/ezrabrilliant/project-tekweb",
      demo: "https://pay2win.ezrabrilliant.tech",
      status: "completed" as const,
      date: "2023",
    },
  ],

  skills: [
    {
      category: "Frontend",
      items: [
        "React",
        "TypeScript",
        "Next.js",
        "Tailwind CSS",
        "JavaScript",
      ],
    },
    {
      category: "Mobile",
      items: ["Android", "Kotlin", "Flutter", "Dart", "Firebase"],
    },
    {
      category: "Backend",
      items: [
        "Node.js",
        "Express.js",
        "Discord.js",
        "PostgreSQL",
        "MongoDB",
        "Prisma",
      ],
    },
    {
      category: "Payment & APIs",
      items: [
        "Midtrans API",
        "QRIS",
        "Webhooks",
        "REST API",
        "Payment Gateway",
      ],
    },
    {
      category: "Data & BI",
      items: ["Power BI", "Tableau", "SQL", "Excel", "Python"],
    },
    {
      category: "Tools",
      items: ["Git", "VS Code", "Figma", "Postman", "Linux", "Docker"],
    },
  ],
} as const;

export type Config = typeof config;
