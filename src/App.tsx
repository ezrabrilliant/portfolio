import { lazy, Suspense, useState, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { AnimatedBackground } from "@/components/animated-background";
import { ScrollProgress } from "@/components/scroll-progress";
import { IntroAnimation } from "@/components/intro-animation";

const About = lazy(() => import("@/components/about").then(m => ({ default: m.About })));
const Skills = lazy(() => import("@/components/skills").then(m => ({ default: m.Skills })));
const Projects = lazy(() => import("@/components/projects").then(m => ({ default: m.Projects })));
const Experience = lazy(() => import("@/components/experience").then(m => ({ default: m.Experience })));
const Contact = lazy(() => import("@/components/contact").then(m => ({ default: m.Contact })));
const Footer = lazy(() => import("@/components/footer").then(m => ({ default: m.Footer })));

function SectionFallback() {
  return (
    <div className="flex justify-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-glow border-t-transparent" />
    </div>
  );
}

export default function App() {
  const [introComplete, setIntroComplete] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  return (
    <>
      {/* Intro animation */}
      {!introComplete && <IntroAnimation onComplete={handleIntroComplete} />}

      <div className="noise-bg relative min-h-screen">
        {/* Scroll progress bar */}
        <ScrollProgress />

        {/* Animated background effects */}
        <AnimatedBackground />

        {/* Content layer */}
        <div className="relative z-10">
          <Navbar />
          <main>
            <Hero />
            <div className="section-divider mx-auto max-w-5xl" />
            <Suspense fallback={<SectionFallback />}><About /></Suspense>
            <div className="section-divider mx-auto max-w-5xl" />
            <Suspense fallback={<SectionFallback />}><Skills /></Suspense>
            <div className="section-divider mx-auto max-w-5xl" />
            <Suspense fallback={<SectionFallback />}><Projects /></Suspense>
            <div className="section-divider mx-auto max-w-5xl" />
            <Suspense fallback={<SectionFallback />}><Experience /></Suspense>
            <div className="section-divider mx-auto max-w-5xl" />
            <Suspense fallback={<SectionFallback />}><Contact /></Suspense>
          </main>
          <Suspense fallback={null}><Footer /></Suspense>
        </div>
      </div>
    </>
  );
}
