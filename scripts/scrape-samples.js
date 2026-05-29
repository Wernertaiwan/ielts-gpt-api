/**
 * IELTS Writing Sample Scraper
 * Run this script LOCALLY (not on the server):
 *
 *   node scripts/scrape-samples.js
 *
 * It crawls https://www.ielts-writing.info/EXAM/academic_writing_samples_task_1/
 * and all linked sample pages, then writes the results to:
 *
 *   knowledge/samples.json
 *
 * After running, restart the server — the writing assessment will automatically
 * use the scraped samples as calibration examples in its prompts.
 */

'use strict';

const https  = require('https');
const http   = require('http');
const cheerio = require('cheerio');
const fs     = require('fs');
const path   = require('path');

const BASE_URL  = 'https://www.ielts-writing.info';
const INDEX_URL = `${BASE_URL}/EXAM/academic_writing_samples_task_1/`;
const OUT_FILE  = path.join(__dirname, '../knowledge/samples.json');
const DELAY_MS  = 800; // polite crawl delay between requests

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
};

/* ── helpers ──────────────────────────────────────────────── */

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: HEADERS }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirect = res.headers.location.startsWith('http')
          ? res.headers.location
          : BASE_URL + res.headers.location;
        return resolve(fetchPage(redirect));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function resolveUrl(href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  if (href.startsWith('/')) return BASE_URL + href;
  return null;
}

/* ── extract sample links from the index page ─────────────── */

function extractSampleLinks(html) {
  const $ = cheerio.load(html);
  const links = new Set();

  // Try common patterns: links inside content/article areas
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    const full = resolveUrl(href);
    if (!full) return;
    // Only follow links on the same site that look like sample pages
    if (
      full.includes('ielts-writing.info') &&
      !full.endsWith('/') &&
      !full.includes('#') &&
      (href.includes('task_1') || href.includes('sample') || href.includes('writing') ||
       /\/\d+/.test(href) || /[a-z0-9-]{10,}/.test(href.split('/').pop()))
    ) {
      links.add(full);
    }
  });

  // Also collect sub-directory links (paginated index pages etc.)
  const subPages = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const full = resolveUrl(href);
    if (!full) return;
    if (
      full.includes('ielts-writing.info') &&
      full.includes('task_1') &&
      full !== INDEX_URL &&
      !full.includes('#')
    ) {
      subPages.add(full);
    }
  });

  return { sampleLinks: [...links], subPages: [...subPages] };
}

/* ── extract question + writing text from a sample page ───── */

function extractSample(html, url) {
  const $ = cheerio.load(html);

  // Remove navigation, headers, footers, scripts, ads
  $('nav, header, footer, script, style, .nav, .header, .footer, .sidebar, .ads, .comment').remove();

  // Candidate selectors for the main content block
  const contentSelectors = [
    'article', '.content', '.post-content', '.entry-content',
    '.sample', '.writing-sample', 'main', '#content', '.page-content',
  ];
  let $content = null;
  for (const sel of contentSelectors) {
    if ($(sel).length) { $content = $(sel).first(); break; }
  }
  if (!$content) $content = $('body');

  const fullText = $content.text().replace(/\s+/g, ' ').trim();

  // Try to split into question and essay
  // Common patterns: "Question:" / "Task:" / "Writing task:" then essay block
  let question = '';
  let essay = '';
  let band = null;

  // Look for band score
  const bandMatch = fullText.match(/[Bb]and\s*[Ss]core[:\s]+([0-9.]+)/);
  if (!bandMatch) {
    const bandMatch2 = fullText.match(/[Ss]core[:\s]+([0-9.]+)\s*\/\s*9/);
    if (bandMatch2) band = parseFloat(bandMatch2[1]);
  } else {
    band = parseFloat(bandMatch[1]);
  }

  // Look for headings that separate question from answer
  let foundQuestion = false;
  let questionParts = [];
  let essayParts = [];

  $content.find('p, h1, h2, h3, h4, blockquote, div').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 10) return;

    const lowerText = text.toLowerCase();
    if (!foundQuestion && (
      lowerText.includes('question') ||
      lowerText.includes('task description') ||
      lowerText.includes('the chart') ||
      lowerText.includes('the graph') ||
      lowerText.includes('the diagram') ||
      lowerText.includes('the table') ||
      lowerText.includes('the map') ||
      lowerText.includes('the process') ||
      lowerText.includes('the bar') ||
      lowerText.includes('the pie') ||
      lowerText.includes('the line') ||
      lowerText.includes('the two') ||
      lowerText.includes('the following')
    )) {
      foundQuestion = true;
      questionParts.push(text);
    } else if (foundQuestion && questionParts.length < 4 && text.length < 400 && questionParts.join(' ').length < 600) {
      questionParts.push(text);
    } else if (foundQuestion) {
      // Once we've collected the question, the rest is the essay
      if (text.length > 50) essayParts.push(text);
    }
  });

  question = questionParts.join(' ').trim();
  essay    = essayParts.join('\n\n').trim();

  // Fallback: if we couldn't split, use heuristics on fullText
  if (!essay || essay.length < 100) {
    const lines = fullText.split(/[.!?]+/).filter(l => l.trim().length > 20);
    // First ~3 sentences = question, rest = essay
    question = question || lines.slice(0, 3).join('. ').trim();
    essay    = lines.slice(3).join('. ').trim();
  }

  if (essay.length < 80) return null; // not a real sample page

  return {
    url,
    taskType: 'task1',
    question: question.slice(0, 800),
    text: essay.slice(0, 2500),
    band,
    wordCount: essay.split(/\s+/).filter(Boolean).length,
    scrapedAt: new Date().toISOString(),
  };
}

/* ── main ─────────────────────────────────────────────────── */

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   IELTS Task 1 Sample Scraper                ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Load existing samples to avoid re-scraping
  let existing = [];
  if (fs.existsSync(OUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      console.log(`ℹ  Loaded ${existing.length} existing samples from ${OUT_FILE}`);
    } catch { /* ignore */ }
  }
  const existingUrls = new Set(existing.map(s => s.url));

  console.log(`\n🔍 Fetching index page: ${INDEX_URL}`);
  let indexHtml;
  try {
    indexHtml = await fetchPage(INDEX_URL);
  } catch (err) {
    console.error(`✗  Could not fetch index page: ${err.message}`);
    console.error('   Make sure you are running this LOCALLY (not on the server).');
    process.exit(1);
  }

  const { sampleLinks, subPages } = extractSampleLinks(indexHtml);
  console.log(`   Found ${sampleLinks.length} direct sample links`);
  console.log(`   Found ${subPages.length} sub-pages to check`);

  // Crawl sub-pages for more sample links
  const allSampleLinks = new Set(sampleLinks);
  for (const subPage of subPages) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(subPage);
      const { sampleLinks: more } = extractSampleLinks(html);
      more.forEach(l => allSampleLinks.add(l));
      console.log(`   Sub-page ${subPage} → ${more.length} more links`);
    } catch (err) {
      console.warn(`   ⚠ Skipped sub-page: ${err.message}`);
    }
  }

  const toScrape = [...allSampleLinks].filter(u => !existingUrls.has(u));
  console.log(`\n📄 Scraping ${toScrape.length} new sample pages (${existing.length} already cached)…\n`);

  const samples = [...existing];
  let success = 0;
  let skipped = 0;

  for (let i = 0; i < toScrape.length; i++) {
    const url = toScrape[i];
    const num = `[${i + 1}/${toScrape.length}]`;
    await sleep(DELAY_MS);

    try {
      const html = await fetchPage(url);
      const sample = extractSample(html, url);
      if (sample) {
        samples.push(sample);
        success++;
        const bandStr = sample.band ? ` Band ${sample.band}` : '';
        console.log(`  ✓ ${num}${bandStr} — ${sample.wordCount} words — ${url.split('/').pop()}`);
      } else {
        skipped++;
        console.log(`  ⊘ ${num} skipped (no essay detected) — ${url}`);
      }
    } catch (err) {
      skipped++;
      console.warn(`  ✗ ${num} error: ${err.message}`);
    }

    // Save incrementally every 10 samples
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(OUT_FILE, JSON.stringify(samples, null, 2));
      console.log(`  💾 Saved ${samples.length} samples so far…`);
    }
  }

  // Final save
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(samples, null, 2));

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  Done!  ${String(success).padEnd(4)} new samples scraped            ║`);
  console.log(`║         ${String(skipped).padEnd(4)} pages skipped                 ║`);
  console.log(`║         ${String(samples.length).padEnd(4)} total samples in knowledge/    ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📁 Saved to: ${OUT_FILE}`);
  console.log('🚀 Restart your server to activate the examples.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
