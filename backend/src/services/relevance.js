import axios from 'axios';
import {
  getSessionById,
  getUserSettings,
  createPageVisit,
  getUserRecentFeedbackStats,
  getActiveBreakForSession,
} from './dbService.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';
const IS_DEMO = process.env.DEMO_MODE === 'true';

// Study & Academic domains eligible for priors boost
const STUDY_DOMAINS = [
  'leetcode.com',
  'geeksforgeeks.org',
  'github.com',
  'stackoverflow.com',
  'developer.mozilla.org',
  'wikipedia.org',
  'coursera.org',
  'arxiv.org',
  'scholar.google.com',
  'w3schools.com',
];

// Entertainment domains that must rely strictly on content semantics
const ENTERTAINMENT_DOMAINS = [
  'youtube.com',
  'instagram.com',
  'reddit.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'twitch.tv',
  'netflix.com',
];

// Distraction keywords for fallback / demo heuristics
const DRIFT_KEYWORDS = [
  'comedy',
  'standup',
  'vlog',
  'gaming',
  'gameplay',
  'memes',
  'meme',
  'shorts',
  'reels',
  'funny',
  'prank',
  'trailer',
  'gossip',
  'cartoon',
  'cartoons',
  'animation',
  'anime',
  'episode',
  'episodes',
  'movie',
  'movies',
  'song',
  'songs',
  'music',
  'entertainment',
  'skit',
  'clip',
  'clips',
];

// Technical / Academic keywords indicative of academic goals
const ACADEMIC_KEYWORDS = [
  'study',
  'dsa',
  'code',
  'coding',
  'graph',
  'tree',
  'algorithm',
  'algorithms',
  'python',
  'javascript',
  'react',
  'node',
  'sql',
  'database',
  'math',
  'calculus',
  'research',
  'physics',
  'exam',
  'revision',
  'course',
  'thesis',
  'lecture',
];

/**
 * Extracts normalized domain from a URL (e.g., "www.youtube.com" -> "youtube.com")
 */
export function extractDomain(url) {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Parses readable keywords from URL path and search params
 */
export function extractUrlKeywords(url) {
  try {
    const parsed = new URL(url);
    const pathWords = parsed.pathname
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const queryWords = parsed.search
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2);

    return [...pathWords, ...queryWords].join(' ');
  } catch {
    return '';
  }
}

/**
 * Heuristic keyword check for fallback & demo resilience
 */
export function checkKeywordFallback(goal, title, description, urlKeywords) {
  const combinedText = `${title} ${description} ${urlKeywords}`.toLowerCase();
  const goalLower = goal.toLowerCase();

  // 1. Check for blatant distraction keywords
  for (const kw of DRIFT_KEYWORDS) {
    if (combinedText.includes(kw)) {
      return {
        matched: true,
        score: 0.08,
        is_drift: true,
        method: 'keyword',
      };
    }
  }

  // 2. Check if goal keywords are found in title
  const goalTokens = goalLower
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 2);

  const matchedTokens = goalTokens.filter(token => combinedText.includes(token));
  if (matchedTokens.length >= 1) {
    const ratio = matchedTokens.length / Math.max(1, goalTokens.length);
    const score = Math.min(0.92, 0.55 + ratio * 0.35);
    return {
      matched: true,
      score: roundScore(score),
      is_drift: false,
      method: 'keyword',
    };
  }

  return { matched: false };
}

function roundScore(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Central Relevance Analysis Pipeline
 */
export async function evaluateRelevance({ session_id, url, title = '', description = '' }) {
  const session = await getSessionById(session_id);
  if (!session) {
    throw new Error('Session not found');
  }

  const userSettings = await getUserSettings(session.user_id);
  const domain = extractDomain(url);
  const urlKeywords = extractUrlKeywords(url);
  const pageText = `${title} ${description} ${urlKeywords}`.trim();

  // -------------------------------------------------------------
  // Step 1: Inactive / Paused session, Tracking Disabled, or Active Break
  // -------------------------------------------------------------
  const activeBreak = await getActiveBreakForSession(session.id);
  if (
    session.status !== 'active' ||
    userSettings.tracking_enabled === false ||
    activeBreak
  ) {
    const visit = await createPageVisit({
      sessionId: session.id,
      url,
      domain,
      title,
      description,
      relevanceScore: 1.0,
      isDrift: false,
      method: activeBreak ? 'allowed' : 'rule',
    });

    return {
      score: 1.0,
      is_drift: false,
      threshold: 0.3,
      method: activeBreak ? 'allowed' : 'rule',
      page_visit_id: visit.id,
      reason: activeBreak
        ? 'break_active'
        : session.status !== 'active'
        ? 'session_not_active'
        : 'tracking_disabled',
    };
  }

  // -------------------------------------------------------------
  // Step 2: Allowed Domains Bypass
  // -------------------------------------------------------------
  const allowedList = userSettings.allowed_domains || [];
  if (
    allowedList.some(
      allowed => domain === allowed.toLowerCase() || domain.endsWith(`.${allowed.toLowerCase()}`)
    )
  ) {
    const visit = await createPageVisit({
      sessionId: session.id,
      url,
      domain,
      title,
      description,
      relevanceScore: 1.0,
      isDrift: false,
      method: 'allowed',
    });

    return {
      score: 1.0,
      is_drift: false,
      threshold: 0.3,
      method: 'allowed',
      page_visit_id: visit.id,
    };
  }

  // -------------------------------------------------------------
  // Step 5 Baseline Threshold from Sensitivity
  // -------------------------------------------------------------
  let threshold = 0.30;
  if (userSettings.sensitivity === 'low') threshold = 0.20;
  else if (userSettings.sensitivity === 'high') threshold = 0.40;

  // -------------------------------------------------------------
  // Step 6 Personalization Calibration:
  // If > 30% of user's recent drift feedback was marked 'relevant',
  // lower effective threshold by 0.05
  // -------------------------------------------------------------
  try {
    const feedbackStats = await getUserRecentFeedbackStats(session.user_id, 20);
    if (feedbackStats.total >= 3) {
      const relevantRatio = feedbackStats.relevantCount / feedbackStats.total;
      if (relevantRatio > 0.30) {
        threshold = Math.max(0.15, threshold - 0.05);
      }
    }
  } catch (err) {
    console.warn('Feedback stats calculation skipped:', err.message);
  }

  // -------------------------------------------------------------
  // Step 3 & 7: Call ML Service with Keyword Fallback
  // -------------------------------------------------------------
  let rawScore = 0.0;
  let method = 'model';

  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/score`,
      {
        goal: session.goal,
        text: pageText || domain,
      },
      { timeout: 2000 } // 2 second timeout
    );

    if (response.data && typeof response.data.score === 'number') {
      rawScore = response.data.score;
      method = response.data.model === 'keyword-fallback' ? 'keyword' : 'model';
    } else {
      throw new Error('Invalid response from ML service');
    }
  } catch (mlErr) {
    console.warn(`ML Service unavailable or timed out (${mlErr.message}). Applying fallback heuristic.`);
    const fallback = checkKeywordFallback(session.goal, title, description, urlKeywords);
    if (fallback.matched) {
      rawScore = fallback.score;
      method = 'keyword';
    } else {
      // Conservative default if no keywords matched
      rawScore = 0.25;
      method = 'keyword';
    }
  }

  // -------------------------------------------------------------
  // Step 7 Extra: If DEMO_MODE, apply keyword fallback to catch obvious cases
  // -------------------------------------------------------------
  if (IS_DEMO) {
    const fallbackCheck = checkKeywordFallback(session.goal, title, description, urlKeywords);
    if (fallbackCheck.matched) {
      if (fallbackCheck.is_drift) {
        rawScore = Math.min(rawScore, fallbackCheck.score);
        method = 'keyword';
      } else if (rawScore < threshold) {
        // If keyword strongly matches goal, override model false-alarm
        rawScore = Math.max(rawScore, fallbackCheck.score);
        method = 'keyword';
      }
    }
  }

  // -------------------------------------------------------------
  // Step 4: Domain Priors
  // -------------------------------------------------------------
  let finalScore = rawScore;
  const isEntertainment = ENTERTAINMENT_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`));

  if (!isEntertainment) {
    const isStudy = STUDY_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`));
    const goalHasAcademic = ACADEMIC_KEYWORDS.some(kw => session.goal.toLowerCase().includes(kw));

    if (isStudy && goalHasAcademic) {
      // Add boost of +0.15 for trusted study domains when goal is academic
      finalScore = Math.min(1.0, finalScore + 0.15);
    }
  } else {
    // Entertainment domain (e.g. YouTube, Twitch, Netflix, TikTok)
    const goalHasAcademic = ACADEMIC_KEYWORDS.some(kw => session.goal.toLowerCase().includes(kw));
    const goalTokens = session.goal
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(w => w.length > 2);
    const pageHasGoalTokens = goalTokens.some(token => pageText.toLowerCase().includes(token));

    // When pursuing an academic goal, entertainment media without goal keywords is clear drift
    if (goalHasAcademic && !pageHasGoalTokens) {
      finalScore = Math.min(finalScore, 0.10);
      method = method === 'model' ? 'model' : 'rule';
    }
  }

  finalScore = roundScore(finalScore);
  const isDrift = finalScore < threshold;

  // -------------------------------------------------------------
  // Log check as page_visits row
  // -------------------------------------------------------------
  const visit = await createPageVisit({
    sessionId: session.id,
    url,
    domain,
    title,
    description,
    relevanceScore: finalScore,
    isDrift,
    method,
  });

  return {
    score: finalScore,
    is_drift: isDrift,
    threshold,
    method,
    page_visit_id: visit.id,
  };
}
