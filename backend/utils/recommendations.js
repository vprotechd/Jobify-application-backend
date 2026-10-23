/*
|--------------------------------------------------------------------------
| Skills-based job recommendation scoring
|--------------------------------------------------------------------------
| Pure functions (no database access) so the logic can be unit tested.
| The controller loads real candidate + job data and passes it in here.
|
| A job is scored against the candidate's saved skills by looking at the
| job's skills, title, requirements, responsibilities and description.
| Direct skill matches count the most; closely related technologies count
| for a smaller amount so that e.g. a "React" candidate still sees
| "Frontend Developer (Next.js)" roles.
|--------------------------------------------------------------------------
*/

// Spelling variants that should be treated as the same skill.
const ALIASES = {
  "node.js": "node",
  nodejs: "node",
  "node js": "node",
  "react.js": "react",
  reactjs: "react",
  "react js": "react",
  "react native": "react-native",
  reactnative: "react-native",
  "next.js": "nextjs",
  "vue.js": "vue",
  vuejs: "vue",
  "angular.js": "angular",
  angularjs: "angular",
  "express.js": "express",
  expressjs: "express",
  "c++": "cpp",
  "c#": "csharp",
  ".net": "dotnet",
  "asp.net": "dotnet",
  js: "javascript",
  ts: "typescript",
  py: "python",
  golang: "go",
  postgres: "postgresql",
  mongo: "mongodb",
  "mongo db": "mongodb",
  "machine-learning": "machine learning",
  ml: "machine learning",
  "artificial intelligence": "ai",
  "ui/ux": "ui ux",
  "ux/ui": "ui ux",
  "ui design": "ui ux",
  "ux design": "ui ux",
  "user experience": "ui ux",
  "amazon web services": "aws",
  "google cloud": "gcp",
  "front end": "frontend",
  "front-end": "frontend",
  "back end": "backend",
  "back-end": "backend",
  "full stack": "fullstack",
  "full-stack": "fullstack",
  "dev ops": "devops",
  "ci/cd": "cicd",
  "html5": "html",
  "css3": "css",
};

// Groups of closely related technologies / roles. A candidate skill that is
// in a group gets partial credit for jobs that mention another member.
const RELATED_GROUPS = [
  ["react", "react-native", "nextjs", "redux", "frontend", "javascript", "typescript", "html", "css"],
  ["react-native", "react", "expo", "mobile", "android", "ios", "javascript"],
  ["vue", "nuxt", "frontend", "javascript", "typescript"],
  ["angular", "typescript", "frontend", "rxjs"],
  ["node", "express", "nestjs", "javascript", "typescript", "backend", "api", "rest"],
  ["mongodb", "mongoose", "database", "nosql", "backend"],
  ["sql", "mysql", "postgresql", "database", "backend"],
  ["python", "django", "flask", "fastapi", "backend"],
  ["java", "spring", "springboot", "backend", "kotlin"],
  ["csharp", "dotnet", "backend"],
  ["php", "laravel", "backend"],
  ["machine learning", "ai", "deep learning", "data science", "tensorflow", "pytorch", "python"],
  ["data analysis", "data science", "sql", "excel", "powerbi", "tableau", "python", "analytics"],
  ["aws", "azure", "gcp", "cloud", "devops", "docker", "kubernetes", "cicd", "terraform"],
  ["cybersecurity", "security", "penetration testing", "networking", "siem", "soc"],
  ["ui ux", "figma", "design", "prototyping", "wireframing"],
  ["seo", "marketing", "content", "social media", "digital marketing"],
  ["accounting", "finance", "tally", "excel", "gst", "taxation"],
  ["recruitment", "hr", "human resources", "talent acquisition", "payroll"],
  ["sales", "business development", "crm", "lead generation"],
];

// Words too generic to be treated as a role signal in a headline.
const GENERIC_WORDS = new Set([
  "a", "an", "and", "or", "the", "of", "for", "in", "at", "to", "with", "on",
  "senior", "junior", "lead", "associate", "intern", "trainee", "manager",
  "developer", "engineer", "executive", "specialist", "analyst", "officer",
  "professional", "expert", "fresher", "experienced", "full", "time", "part",
]);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lowercase + trim + collapse whitespace. */
export const cleanText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Canonical key for a skill (applies the alias table). */
export const canonicalSkill = (skill) => {
  const base = cleanText(skill).replace(/[,;]+$/g, "");
  if (!base) return "";
  return ALIASES[base] || base;
};

/**
 * Prepares free text for phrase matching: applies aliases for known
 * multi-character tokens (c++, c#, .net, node.js ...) and pads with spaces so
 * whole-word matching is a simple `includes`.
 */
export const normalizeForSearch = (value) => {
  let text = ` ${cleanText(value)} `;
  // Replace known aliases with their canonical key (longest first).
  const keys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (!text.includes(key)) continue;
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(key)}(?=$|[^a-z0-9+#])`, "g");
    text = text.replace(pattern, (_match, lead) => `${lead}${ALIASES[key]}`);
  }
  // Anything left that is not a letter/digit becomes a space, but keep our
  // canonical hyphenated token (react-native) intact.
  text = text.replace(/[^a-z0-9\-\s]/g, " ").replace(/\s+/g, " ");
  return ` ${text.trim()} `;
};

const hasTerm = (haystack, term) => {
  if (!term || !haystack) return false;
  return haystack.includes(` ${term} `);
};

const relatedTerms = (skill) => {
  const out = new Set();
  for (const group of RELATED_GROUPS) {
    if (group.includes(skill)) group.forEach((item) => item !== skill && out.add(item));
  }
  return [...out];
};

const FIELD_WEIGHTS = {
  jobSkills: 5,
  title: 4,
  requirements: 3,
  responsibilities: 2,
  description: 1.5,
};
const RELATED_WEIGHT = 1.25;

// Very short / common-word skills only count when they appear in the places
// that name required skills; otherwise "plan C" or "go ahead" would match.
const AMBIGUOUS_SKILLS = new Set(["c", "r", "go"]);
const STRICT_FIELDS = new Set(["jobSkills", "title"]);

const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const buildJobFields = (job) => ({
  jobSkills: normalizeForSearch(asList(job.skills).join(" | ")),
  title: normalizeForSearch(job.title),
  requirements: normalizeForSearch(asList(job.requirements).join(" | ")),
  responsibilities: normalizeForSearch(asList(job.responsibilities).join(" | ")),
  description: normalizeForSearch(job.description),
});

/** Prepares the candidate once so it can be scored against many jobs. */
export const prepareCandidate = (candidate = {}) => {
  const seen = new Set();
  const skills = [];
  for (const raw of asList(candidate.skills)) {
    const display = String(raw ?? "").trim();
    const key = canonicalSkill(display);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    skills.push({ display, key, related: relatedTerms(key) });
  }
  const headlineWords = normalizeForSearch(candidate.headline)
    .split(" ")
    .filter((word) => word.length > 2 && !GENERIC_WORDS.has(word));
  return { skills, headlineWords };
};

/**
 * Scores one job. Returns null when the job has no meaningful signal.
 * result: { score, matchedSkills[], relatedSkills[], level, reason }
 */
export const scoreJob = (preparedCandidate, job) => {
  const { skills, headlineWords } = preparedCandidate;
  if (!skills.length) return null;

  const fields = buildJobFields(job);
  const strongMatched = []; // found in skills / title / requirements / responsibilities
  const descriptionOnly = []; // found only in the free-text description
  const related = [];
  let score = 0;

  for (const skill of skills) {
    const direct = normalizeForSearch(skill.key).trim();
    const hits = Object.entries(FIELD_WEIGHTS).filter(
      ([field]) =>
        (!AMBIGUOUS_SKILLS.has(skill.key) || STRICT_FIELDS.has(field)) &&
        hasTerm(fields[field], direct)
    );

    if (hits.length) {
      const best = Math.max(...hits.map(([, weight]) => weight));
      // Small bonus when the skill shows up in more than one place.
      score += best + (hits.length - 1) * 0.25;
      if (hits.some(([field]) => field !== "description")) strongMatched.push(skill.display);
      else descriptionOnly.push(skill.display);
      continue;
    }

    // No direct match: look for closely related technologies in the places
    // that describe what the job actually needs.
    const relatedHit = skill.related.find(
      (term) =>
        hasTerm(fields.jobSkills, term) ||
        hasTerm(fields.title, term) ||
        hasTerm(fields.requirements, term)
    );
    if (relatedHit) {
      score += RELATED_WEIGHT;
      related.push(skill.display);
    }
  }

  // A skill that is only mentioned in passing in the description (for example
  // "react quickly to leads") is weak evidence. Accept it only when backed by
  // another description match or by a related technology/title signal.
  const descriptionBacked =
    descriptionOnly.length >= 2 || (descriptionOnly.length >= 1 && related.length >= 1);
  if (!strongMatched.length && !descriptionBacked && !related.length) return null;

  const matched = strongMatched.length || descriptionBacked ? [...strongMatched, ...descriptionOnly] : [];

  // Reward covering more of the candidate's skills.
  score += (matched.length / skills.length) * 3;

  // Reward covering more of what the job lists.
  const jobSkillCount = asList(job.skills).filter(Boolean).length;
  if (jobSkillCount) score += Math.min(1, matched.length / jobSkillCount) * 2;

  // Headline (e.g. "Frontend Developer") that lines up with the job title.
  if (headlineWords.length && headlineWords.some((word) => hasTerm(fields.title, word))) {
    score += 1.5;
  }

  // Only related technologies (no direct hit) must clear a higher bar so we
  // do not present weak guesses as recommendations.
  if (!matched.length && score < 2) return null;

  const level = matched.length >= 3 ? "strong" : matched.length === 2 ? "good" : "fair";
  const reason = matched.length
    ? `Matches your skills: ${matched.slice(0, 4).join(", ")}${matched.length > 4 ? ` +${matched.length - 4} more` : ""}`
    : `Related to your skills: ${related.slice(0, 3).join(", ")}`;

  return {
    score: Math.round(score * 100) / 100,
    matchedSkills: matched,
    relatedSkills: related,
    level,
    reason,
  };
};

const jobSignature = (job) => {
  const company = job.company?._id || job.company || "";
  return [
    String(job.recruiter?._id || job.recruiter || ""),
    String(company),
    cleanText(job.title),
    cleanText(job.location),
  ].join("|");
};

/**
 * Ranks jobs for a candidate. Removes duplicates (same id, or the same
 * recruiter/company/title/location posted twice) keeping the best-scoring copy.
 */
export const rankJobs = (candidate, jobs, { limit = 10 } = {}) => {
  const prepared = prepareCandidate(candidate);
  if (!prepared.skills.length) return [];

  const scored = [];
  for (const job of jobs || []) {
    const result = scoreJob(prepared, job);
    if (!result) continue;
    scored.push({ job, ...result });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.matchedSkills.length !== a.matchedSkills.length) {
      return b.matchedSkills.length - a.matchedSkills.length;
    }
    return new Date(b.job.createdAt || 0) - new Date(a.job.createdAt || 0);
  });

  const seenIds = new Set();
  const seenSignatures = new Set();
  const ranked = [];
  for (const entry of scored) {
    const id = String(entry.job._id || entry.job.id || "");
    const signature = jobSignature(entry.job);
    if ((id && seenIds.has(id)) || seenSignatures.has(signature)) continue;
    if (id) seenIds.add(id);
    seenSignatures.add(signature);
    ranked.push(entry);
    if (ranked.length >= limit) break;
  }
  return ranked;
};
