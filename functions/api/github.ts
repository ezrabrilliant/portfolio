// Cloudflare Pages Function for GET /api/github.
// Same response as the /api/github route in server.js; the in-memory cache
// is replaced by the Workers Cache API so it survives across isolates.

const GITHUB_USERNAME = "ezrabrilliant";
const CACHE_TTL = 60 * 60; // 1 jam (detik)

// GitHub rejects requests without a User-Agent, and Workers fetch sends none.
const USER_AGENT = "ezrabrilliant-portfolio";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  // Same as cors() in server.js
  "Access-Control-Allow-Origin": "*",
};

// Workers adds caches.default on top of the standard CacheStorage.
declare const caches: { default: Cache };

interface PagesContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
}

interface Repo {
  stargazers_count: number;
  forks_count: number;
}

interface ContributionsResponse {
  contributions?: { count?: number }[];
  total?: Record<string, number | undefined>;
}

export async function onRequestGet(context: PagesContext) {
  const params = new URL(context.request.url).searchParams;
  // Express reads ?y=a&y=b as ["a", "b"], which becomes "a,b" in a string
  const year = params.getAll("y").join(",") || "last"; // "last", "2024", "2025", etc.

  // Return cache if still fresh (keyed by the full URL, so per year)
  const cache = caches.default;
  const cached = await cache.match(context.request.url);
  if (cached) {
    return new Response(cached.body, { headers: JSON_HEADERS });
  }

  try {
    const [repoResult, contribResult] = await Promise.allSettled([
      fetch(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
        { headers: { "User-Agent": USER_AGENT } }
      ).then((r) => (r.ok ? (r.json() as Promise<Repo[]>) : Promise.reject())),
      fetchContributions(year),
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

    let contributions: number[] = [];
    let totalContributions = 0;
    if (contribResult.status === "fulfilled") {
      contributions = contribResult.value.levels;
      totalContributions = contribResult.value.total;
    }

    const body = JSON.stringify({
      totalRepos,
      totalStars,
      totalForks,
      totalContributions,
      contributions,
    });

    // Update cache for this year
    context.waitUntil(
      cache.put(
        context.request.url,
        new Response(body, {
          headers: { ...JSON_HEADERS, "Cache-Control": `public, max-age=${CACHE_TTL}` },
        })
      )
    );

    console.log(
      `[GitHub Cache] Fresh data (y=${year}) fetched at ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
    );

    return new Response(body, { headers: JSON_HEADERS });
  } catch (err) {
    console.error("[GitHub Cache] Fetch error:", err);

    // server.js falls back to a stale entry here, but the Cache API
    // evicts expired entries, so there is nothing stale to return.
    return new Response(JSON.stringify({ error: "Failed to fetch GitHub data" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

// --- Helper: fetch contributions from GitHub ---
async function fetchContributions(year = "last") {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=${year}`,
      { headers: { "User-Agent": USER_AGENT } }
    );

    if (!res.ok) throw new Error("contributions api failed");
    const data = (await res.json()) as ContributionsResponse;
    const contributions: number[] = [];
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

    // For specific years, use the year key from total object
    const totalCount = year === "last"
      ? (data.total?.lastYear || total)
      : (data.total?.[year] || total);

    return { levels: contributions, total: totalCount };
  } catch {
    return { levels: [], total: 0 };
  }
}
