import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const GITHUB_USERNAME = "ezrabrilliant";
const CACHE_TTL = 60 * 60 * 1000; // 1 jam

// In-memory cache
let cache = {
  data: null,
  timestamp: 0,
};

// CORS for dev mode
app.use(cors());

// API endpoint - GitHub data with server-side cache
app.get("/api/github", async (_req, res) => {
  // Return cache if still fresh
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.json(cache.data);
  }

  try {
    const [repoResult, contribResult] = await Promise.allSettled([
      fetch(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`
      ).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetchContributions(),
    ]);

    let totalRepos = 0,
      totalStars = 0,
      totalForks = 0;
    if (repoResult.status === "fulfilled") {
      const repos = repoResult.value;
      totalRepos = repos.length;
      totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);
      totalForks = repos.reduce((acc, r) => acc + r.forks_count, 0);
    }

    let contributions = [];
    let totalContributions = 0;
    if (contribResult.status === "fulfilled") {
      contributions = contribResult.value.levels;
      totalContributions = contribResult.value.total;
    }

    const data = {
      totalRepos,
      totalStars,
      totalForks,
      totalContributions,
      contributions,
    };

    // Update cache
    cache = { data, timestamp: Date.now() };

    console.log(
      `[GitHub Cache] Fresh data fetched at ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
    );

    res.json(data);
  } catch (err) {
    console.error("[GitHub Cache] Fetch error:", err);

    // Return stale cache if available
    if (cache.data) {
      return res.json(cache.data);
    }

    res.status(500).json({ error: "Failed to fetch GitHub data" });
  }
});

// Serve static files from Vite build
app.use(express.static(join(__dirname, "dist")));

// SPA fallback - serve index.html for all non-API routes
app.get("/{*path}", (_req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`GitHub cache TTL: ${CACHE_TTL / 1000 / 60} minutes`);
});

// --- Helper: fetch contributions from GitHub ---
async function fetchContributions() {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`
    );

    if (!res.ok) throw new Error("contributions api failed");
    const data = await res.json();
    const contributions = [];
    let total = 0;

    if (data.contributions && Array.isArray(data.contributions)) {
      for (const day of data.contributions) {
        const count = day.count || 0;
        total += count;
        let level = 0;
        if (count >= 10) level = 4;
        else if (count >= 6) level = 3;
        else if (count >= 3) level = 2;
        else if (count >= 1) level = 1;
        contributions.push(level);
      }
    }

    return { levels: contributions, total: data.total?.lastYear || total };
  } catch {
    return { levels: [], total: 0 };
  }
}
