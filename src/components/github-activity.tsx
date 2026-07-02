import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Github, GitCommit, Star, GitFork, Activity } from "lucide-react";

interface GitHubStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalContributions: number;
  contributions: number[];
  loading: boolean;
}

const GITHUB_USERNAME = "ezrabrilliant";

const LEVEL_COLORS = [
  "bg-border-subtle",
  "bg-teal-primary/30",
  "bg-teal-primary/50",
  "bg-teal-glow/60",
  "bg-teal-glow",
];

// Generate year options: current year down to 2024 + "Last Year"
function getYearOptions(): { label: string; value: string }[] {
  const currentYear = new Date().getFullYear();
  const options = [{ label: "Last Year", value: "last" }];
  for (let y = currentYear; y >= 2024; y--) {
    options.push({ label: String(y), value: String(y) });
  }
  return options;
}

export function GitHubActivity() {
  const [stats, setStats] = useState<GitHubStats>({
    totalRepos: 0,
    totalStars: 0,
    totalForks: 0,
    totalContributions: 0,
    contributions: [],
    loading: true,
  });
  const [selectedYear, setSelectedYear] = useState("last");

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const fetchData = useCallback(async (year: string) => {
    setStats((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/github?y=${year}`);
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();

      setStats({
        totalRepos: data.totalRepos,
        totalStars: data.totalStars,
        totalForks: data.totalForks,
        totalContributions: data.totalContributions,
        contributions: data.contributions,
        loading: false,
      });
    } catch {
      setStats((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!isInView) return;
    fetchData(selectedYear);
  }, [isInView, selectedYear, fetchData]);

  // Organize contributions into weeks (7 days per column)
  const weeks: number[][] = [];
  for (let i = 0; i < stats.contributions.length; i += 7) {
    weeks.push(stats.contributions.slice(i, i + 7));
  }

  const hasContributions = weeks.length > 0;
  const yearOptions = getYearOptions();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="glass-card mt-6 overflow-hidden rounded-2xl p-4 sm:mt-8 sm:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-primary/10 sm:h-9 sm:w-9">
            <Github size={14} className="text-teal-glow sm:hidden" />
            <Github size={16} className="hidden text-teal-glow sm:block" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">GitHub Activity</h3>
            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted transition-colors hover:text-teal-glow"
            >
              @{GITHUB_USERNAME}
            </a>
          </div>
        </div>

        {/* Stats pills */}
        {!stats.loading && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <StatPill icon={Activity} label="Contributions" value={stats.totalContributions} />
            <StatPill icon={GitCommit} label="Repos" value={stats.totalRepos} />
            <StatPill icon={Star} label="Stars" value={stats.totalStars} />
            <StatPill icon={GitFork} label="Forks" value={stats.totalForks} />
          </div>
        )}
      </div>

      {/* Year Selector */}
      <div className="mb-3 flex gap-1 sm:mb-4 sm:gap-1.5">
        {yearOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelectedYear(opt.value)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all sm:text-xs ${
              selectedYear === opt.value
                ? "bg-teal-primary/20 text-teal-glow ring-1 ring-teal-primary/40"
                : "text-text-muted hover:bg-surface/60 hover:text-text-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Contribution Graph */}
      {stats.loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-glow border-t-transparent" />
        </div>
      ) : hasContributions ? (
        <div>
          <div className="flex gap-[2px] sm:gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-1 flex-col gap-[2px] sm:gap-[3px]">
                {week.map((level, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={`aspect-square w-full rounded-[1px] sm:rounded-[2px] ${LEVEL_COLORS[level]}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center justify-end gap-1 sm:mt-3 sm:gap-1.5">
            <span className="text-[9px] text-text-muted sm:text-[10px]">Less</span>
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className={`h-[8px] w-[8px] rounded-[1px] sm:h-[10px] sm:w-[10px] sm:rounded-[2px] ${color}`}
              />
            ))}
            <span className="text-[9px] text-text-muted sm:text-[10px]">More</span>
          </div>
        </div>
      ) : (
        /* Fallback: show stats only without graph */
        <p className="text-center text-xs text-text-muted">
          No contributions found for this period. Visit my{" "}
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-glow hover:underline"
          >
            GitHub profile
          </a>
          {" "}for full activity.
        </p>
      )}
    </motion.div>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: typeof Github; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle/50 bg-surface/40 px-2.5 py-1">
      <Icon size={12} className="text-text-muted" />
      <span className="text-xs font-semibold text-text-secondary">{value}</span>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
