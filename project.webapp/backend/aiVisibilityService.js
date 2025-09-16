const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LLMService } = require('./llmService');
const cheerio = require('cheerio');

// API Keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Tunable timeouts (ms) for fast-mode calls
const PERPLEXITY_TIMEOUT_MS = parseInt(process.env.PERPLEXITY_TIMEOUT_MS || '25000', 10);
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '20000', 10);

// Shared LLM service instance
const sharedLLM = new LLMService();

// AI-specific prompts for each model
function getChatGPTPrompts(company, industry) {
  return [
    `Which companies are leading in ${industry}?`,
    `What are the top companies offering ${industry} solutions in ${industry}?`,
    `Compare ${company} with other companies in the ${industry}.`,
    `How does ${company} leverage AI in ${industry}?`
  ];
}

function getGeminiPrompts(company, industry) {
  return [
    `Which companies are leading in ${industry}?`,
    `What are the top companies offering ${industry} solutions in ${industry}?`,
    `Compare ${company} with other companies in the ${industry}.`,
    `How does ${company} leverage AI in ${industry}?`
  ];
}

function getPerplexityPrompts(company, industry) {
  return [
    `Which companies are leading in ${industry}?`,
    `What are the top companies offering ${industry} solutions in ${industry}?`,
    `Compare ${company} with other companies in the ${industry}.`,
    `How does ${company} leverage AI in ${industry}?`
  ];
}

function getClaudePrompts(company, industry) {
  return [
    `Which companies are leading in ${industry}?`,
    `What are the top companies offering ${industry} solutions in ${industry}?`,
    `Compare ${company} with other companies in the ${industry}.`,
    `How does ${company} leverage AI in ${industry}?`
  ];
}

// --- Per-model visibility scoring (CSE-driven) ---
const MODEL_KEYWORDS = {
  chatgpt: ['chatgpt'],
  gemini: ['gemini ai'],
  claude: ['claude ai'],
  perplexity: ['perplexity ai']
};

// Only use providers that are configured to avoid zeros from missing API keys
function getConfiguredModelKeys() {
  const keys = [];
  
  // Check if API key exists and is not a placeholder value
  const isValidApiKey = (key) => {
    return key && 
           !key.includes('your_') && 
           !key.includes('_here') &&
           key !== 'your_openai_api_key_here' &&
           key !== 'your_gemini_api_key_here' &&
           key !== 'your_anthropic_api_key_here' &&
           key !== 'your_perplexity_api_key_here';
  };
  
  if (isValidApiKey(OPENAI_API_KEY)) keys.push('chatgpt');
  if (isValidApiKey(GEMINI_API_KEY)) keys.push('gemini');
  if (isValidApiKey(ANTHROPIC_API_KEY)) keys.push('claude');
  if (isValidApiKey(PERPLEXITY_API_KEY)) keys.push('perplexity');
  
  console.log(`🔧 Configured model keys: [${keys.join(', ')}]`);
  return keys;
}

function getHost(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function computeSourceWeight(url) {
  const host = getHost(url);
  if (!host) return 1.0;
  if (/forbes|bloomberg|wsj|nytimes|wired|techcrunch|theverge|reuters|guardian|bbc|cnbc|financialtimes|ft\.com|news/i.test(host)) return 1.5;
  if (/medium|substack|blog|dev\.to|hashnode/i.test(host)) return 1.0;
  if (/reddit|twitter|x\.com|quora|stackoverflow|hackernews|ycombinator/i.test(host)) return 0.5;
  return 1.0;
}

function quickSentimentScore(text) {
  // Heuristic fallback: positive words increase, negative decrease
  const t = String(text || '').toLowerCase();
  const pos = (t.match(/best|leading|top|innovative|recommended|trusted|popular|positive|strong|leader|growing/g) || []).length;
  const neg = (t.match(/problem|issue|concern|negative|bad|poor|not\s+recommended|decline|weak/g) || []).length;
  const total = Math.max(1, pos + neg);
  const raw = (pos - neg) / total; // -1..1
  return Math.max(-1, Math.min(1, raw));
}

async function fetchModelSnippetsFast(competitorName, modelKey) {
  try {
    const kw = MODEL_KEYWORDS[modelKey]?.[0] || modelKey;
    const q = `${competitorName} ${kw}`;
    const results = await withTimeout(queryCustomSearchAPI(q), 7000, []);
    return results.slice(0, 10); // cap
  } catch { return []; }
}

async function fetchModelSnippetsFull(competitorName, modelKey) {
  try {
    const kws = MODEL_KEYWORDS[modelKey] || [modelKey];
    const queries = kws.map(k => `${competitorName} ${k}`);
    const results = await Promise.all(queries.map(q => withTimeout(queryCustomSearchAPI(q), 9000, []).catch(() => [])));
    const flat = results.flat();
    // de-duplicate by link
    const seen = new Set();
    const unique = [];
    for (const r of flat) {
      if (!r?.link) continue;
      if (seen.has(r.link)) continue;
      seen.add(r.link);
      unique.push(r);
      if (unique.length >= 15) break;
    }
    return unique;
  } catch { return []; }
}

async function computePerModelRawMetrics(competitorName, isFast) {
  const modelKeys = Object.keys(MODEL_KEYWORDS);
  const byModel = {};
  await Promise.all(modelKeys.map(async (m) => {
    const results = await (isFast ? fetchModelSnippetsFast(competitorName, m) : fetchModelSnippetsFull(competitorName, m));
    let mentions = 0;
    let prominenceSum = 0;
    let posCount = 0;
    let negCount = 0;
    let totalCount = 0;
    results.forEach((item, idx) => {
      const snippet = `${item?.name || ''}. ${item?.snippet || ''}`;
      const weight = computeSourceWeight(item?.link || '');
      const rankPos = idx + 1;
      // Mentions: count snippet presence (treat each result as one mention)
      mentions += 1;
      // Prominence contribution
      prominenceSum += (1 / rankPos) * weight;
      // Sentiment
      const s = quickSentimentScore(snippet);
      if (s > 0.1) posCount++; else if (s < -0.1) negCount++;
      totalCount++;
    });
    const sentiment = totalCount > 0 ? (posCount - negCount) / totalCount : 0; // -1..1
    const brandMentions = mentions; // co-mentions proxy
    byModel[m] = { mentions, prominence: prominenceSum, sentiment, brandMentions };
  }));
  return byModel;
}

function normalizeAndScoreModels(rawMetricsByCompetitor) {
  // Collect maxima for normalization per model
  const modelKeys = Object.keys(MODEL_KEYWORDS);
  const maxes = {};
  modelKeys.forEach(m => { maxes[m] = { mentions: 1, prominence: 1, brand: 1 }; });
  for (const comp of rawMetricsByCompetitor) {
    for (const m of modelKeys) {
      const mm = comp.rawModels[m] || { mentions: 0, prominence: 0, brandMentions: 0 };
      maxes[m].mentions = Math.max(maxes[m].mentions, mm.mentions || 0);
      maxes[m].prominence = Math.max(maxes[m].prominence, mm.prominence || 0);
      maxes[m].brand = Math.max(maxes[m].brand, mm.brandMentions || 0);
    }
  }
  // Compute normalized 0..100 and score
  for (const comp of rawMetricsByCompetitor) {
    const aiScores = {};
    for (const m of modelKeys) {
      const mm = comp.rawModels[m] || { mentions: 0, prominence: 0, sentiment: 0, brandMentions: 0 };
      const normMentions = (mm.mentions / Math.max(1, maxes[m].mentions)) * 100;
      const normProminence = (mm.prominence / Math.max(1, maxes[m].prominence)) * 100;
      const normSentiment = ((Math.max(-1, Math.min(1, mm.sentiment)) + 1) / 2) * 100; // -1..1 to 0..100
      const normBrand = (mm.brandMentions / Math.max(1, maxes[m].brand)) * 100;
      const score = (normMentions * 0.35) + (normProminence * 0.30) + (normSentiment * 0.20) + (normBrand * 0.15);
      // Scale back to 0..10 for table parity
      aiScores[m] = Number((score / 10).toFixed(4));
    }
    comp.aiScores = aiScores;
  }
  return rawMetricsByCompetitor;
}

// --- AI Traffic Share (query-pool → model responses) ---
function getDefaultQueryPool(industry = '', geo = null, companyName = '', product = '') {
  const base = [
    'top companies in [INDUSTRY]',
    'best tools in [INDUSTRY]',
    'leading vendors in [INDUSTRY]',
    'alternatives and competitors in [INDUSTRY]',
    'who are the leaders in [INDUSTRY]',
    'recommended solutions in [INDUSTRY]'
  ];
  const ind = industry && industry.trim().length > 0 ? industry : 'this category';

  // Geo/product aware prompt bank (30) merged with base prompts
  const geoBank = getGeoCompetitorPromptBank({
    product: product || '[product]',
    category: ind || '[product category]',
    city: geo?.city || '',
    country: geo?.country || '',
    region: geo?.region || '',
    competitorA: geo?.competitorA || (companyName || '[competitor name]'),
    competitorB: geo?.competitorB || 'Amazon'
  });

  const merged = [
    ...base.map(q => q.replace('[INDUSTRY]', ind)),
    ...geoBank
  ];

  // De-duplicate while preserving order
  const seen = new Set();
  const unique = [];
  for (const q of merged) {
    const key = q.trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(q); }
  }

  return unique;
}

// Prompt bank: 30 geo-intent e-commerce discovery questions
function getGeoCompetitorPromptBank({ product, category, city, country, region, competitorA, competitorB }) {
  const geo = [city, region, country].filter(Boolean).join('/');
  const locIn = geo ? ` in ${geo}` : '';
  const locFor = geo ? ` for ${geo}` : '';
  const safeProduct = product || '[product]';
  const safeCategory = category || '[product category]';
  const compA = competitorA || '[competitor A]';
  const compB = competitorB || '[competitor B]';

  return [
    `Best website to buy ${safeProduct} online${locIn}`,
    `Top ${safeCategory} ecommerce stores${locIn}`,
    `Trusted online stores for ${safeProduct}${locIn}`,
    `Affordable ${safeProduct} retailers online${locIn}`,
    `Where can I buy high-quality ${safeProduct} with warranty${locIn}?`,
    `Most reliable ecommerce websites for ${safeCategory}${locIn}`,
    `Which online store has the best reviews for ${safeProduct}${locIn}?`,
    `Is ${compA} a trusted site for ${safeProduct}${locIn}?`,
    `Best-rated ecommerce platforms for ${safeProduct}${locFor}`,
    `Where do experts recommend buying ${safeProduct}${locIn}?`,
    `Cheapest place to buy ${safeProduct} online${locIn}`,
    `Best deals on ${safeCategory} ecommerce websites${locIn}`,
    `${safeProduct} price comparison: Amazon vs ${compA} vs others${locIn}`,
    `Does ${compA} offer discounts on ${safeProduct}${locIn}?`,
    `Best value-for-money online store for ${safeProduct}${locIn}`,
    `Fastest delivery for ${safeProduct}${locIn}`,
    `Ecommerce websites with free shipping for ${safeProduct}${locIn}`,
    `Best return policies for ${safeProduct} online${locIn}`,
    `Where can I get same-day delivery for ${safeProduct}${locIn}?`,
    `Which online store has the best customer service for ${safeProduct}${locIn}?`,
    `Compare ${compA} vs ${compB} for ${safeProduct}${locIn}`,
    `Is ${compA} better than Amazon for ${safeProduct}${locIn}?`,
    `Which online store is more reliable: ${compA} or ${compB} for ${safeProduct}${locIn}?`,
    `Best alternatives to ${compA} for ${safeProduct}${locIn}`,
    `Which ecommerce site has the most product variety for ${safeProduct}${locIn}?`,
    `Best local online store for ${safeProduct}${locIn}`,
    `Where can I buy ${safeProduct} from local sellers${locIn}?`,
    `${safeProduct} ecommerce websites that deliver to ${geo || '[city/country]'}`,
    `Most popular ecommerce site for ${safeProduct}${locIn}`,
    `Which online store near me sells ${safeProduct} with delivery${locIn}?`
  ];
}

async function callModelSimple(modelKey, prompt) {
  console.log(`\n🤖 [callModelSimple] Calling ${modelKey} with prompt: "${prompt.substring(0, 100)}..."`);
  
  try {
    // Check if API key exists and is not a placeholder value
    const isValidApiKey = (key) => {
      return key && 
             !key.includes('your_') && 
             !key.includes('_here') &&
             key !== 'your_openai_api_key_here' &&
             key !== 'your_gemini_api_key_here' &&
             key !== 'your_anthropic_api_key_here' &&
             key !== 'your_perplexity_api_key_here';
    };
    
    if (modelKey === 'gemini') {
      if (!isValidApiKey(GEMINI_API_KEY)) {
        console.log(`   ❌ [callModelSimple] Invalid Gemini API key`);
        return '';
      }
      console.log(`   📞 [callModelSimple] Calling Gemini API...`);
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const res = await model.generateContent(prompt);
      const response = res?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`   ✅ [callModelSimple] Gemini response: ${response.length} characters`);
      return response;
    }
    if (modelKey === 'chatgpt') {
      if (!isValidApiKey(OPENAI_API_KEY)) {
        console.log(`   ❌ [callModelSimple] Invalid ChatGPT API key`);
        return '';
      }
      console.log(`   📞 [callModelSimple] Calling ChatGPT API...`);
      const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful market analyst.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400
      }, { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` } });
      const response = res?.data?.choices?.[0]?.message?.content || '';
      console.log(`   ✅ [callModelSimple] ChatGPT response: ${response.length} characters`);
      return response;
    }
    if (modelKey === 'claude') {
      if (!isValidApiKey(ANTHROPIC_API_KEY)) {
        console.log(`   ❌ [callModelSimple] Invalid Claude API key`);
        return '';
      }
      console.log(`   📞 [callModelSimple] Calling Claude API...`);
      const res = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3.5-sonnet-20241022',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      }, { headers: { 'Authorization': `Bearer ${ANTHROPIC_API_KEY}`, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' } });
      const response = res?.data?.content?.[0]?.text || '';
      console.log(`   ✅ [callModelSimple] Claude response: ${response.length} characters`);
      return response;
    }
    if (modelKey === 'perplexity') {
      if (!isValidApiKey(PERPLEXITY_API_KEY)) {
        console.log(`   ❌ [callModelSimple] Invalid Perplexity API key`);
        return '';
      }
      console.log(`   📞 [callModelSimple] Calling Perplexity API...`);
      try {
        const resp = await sharedLLM.callPerplexityAPI(prompt, 'sonar', false);
        const response = resp?.text || '';
        console.log(`   ✅ [callModelSimple] Perplexity response: ${response.length} characters`);
        return response;
      } catch (error) {
        console.log(`   ❌ [callModelSimple] Perplexity API error: ${error.message}`);
        return '';
      }
    }
    console.log(`   ❌ [callModelSimple] Unknown model key: ${modelKey}`);
    return '';
  } catch (error) {
    console.log(`   ❌ [callModelSimple] Error calling ${modelKey}: ${error.message}`);
    return '';
  }
}

async function computeAiTrafficShares(competitorNames, industry, isFast, opts = {}) {
  console.log('\n🚦 [computeAiTrafficShares] Starting AI Traffic Share calculation...');
  console.log(`   Competitors: ${competitorNames.join(', ')}`);
  console.log(`   Industry: ${industry}`);
  console.log(`   Fast mode: ${isFast}`);
  
  const queries = getDefaultQueryPool(industry, opts.geo || null, opts.companyName || '', opts.product || '').slice(0, isFast ? 6 : 12);
  console.log(`   Queries to process: ${queries.length} (${queries.join(', ')})`);
  
  const modelKeys = getConfiguredModelKeys();
  console.log(`   Configured models: ${modelKeys.join(', ')}`);
  
  if (modelKeys.length === 0) {
    console.log('❌ [computeAiTrafficShares] No models configured - returning empty result');
    return { sharesByCompetitor: {}, totals: {}, counts: {}, queries: [] };
  }
  
  const counts = {};
  const totals = {};
  modelKeys.forEach(m => { counts[m] = Object.fromEntries(competitorNames.map(n => [n, 0])); totals[m] = 0; });

  // Precompute alias lists per competitor for robust detection
  const aliasMap = Object.fromEntries(competitorNames.map(n => [n, buildAliases(n)]));
  const listVendors = competitorNames.join(', ');

  const promptFor = (q) => `For the topic: "${q}", consider these vendors: ${listVendors}. Briefly discuss which of these are most relevant/recommended today. Mention vendor names directly.`;

  // Create all LLM calls in parallel
  console.log('\n🚀 [computeAiTrafficShares] Creating parallel LLM calls...');
  const allCalls = [];
  
  modelKeys.forEach(m => {
    queries.forEach((q, i) => {
      allCalls.push({
        model: m,
        query: q,
        queryIndex: i,
        prompt: promptFor(q)
      });
    });
  });
  
  console.log(`   Total parallel calls: ${allCalls.length} (${modelKeys.length} models × ${queries.length} queries)`);
  
  // Execute all calls in parallel
  const responses = await Promise.all(allCalls.map(async (call) => {
    try {
      console.log(`   📞 [${call.model}] Query ${call.queryIndex + 1}: "${call.query}"`);
      const text = await withTimeout(callModelSimple(call.model, call.prompt), isFast ? 8000 : 12000, '').catch(() => '');
      console.log(`   ✅ [${call.model}] Response: ${text ? text.length : 0} characters`);
      return {
        model: call.model,
        query: call.query,
        queryIndex: call.queryIndex,
        text: text || '',
        success: !!(text && String(text).trim())
      };
    } catch (error) {
      console.log(`   ❌ [${call.model}] Error: ${error.message}`);
      return {
        model: call.model,
        query: call.query,
        queryIndex: call.queryIndex,
        text: '',
        success: false
      };
    }
  }));
  
  console.log(`\n📊 [computeAiTrafficShares] Processing ${responses.length} responses...`);
  
  // Process all responses in parallel
  const processingPromises = responses.map(async (response) => {
    if (!response.success) {
      console.log(`   ⚠️ Skipping failed response from ${response.model} for "${response.query}"`);
      return { model: response.model, queryIndex: response.queryIndex, mentions: [] };
    }
    
    const lower = String(response.text).toLowerCase();
    const mentions = [];
    
    competitorNames.forEach(name => {
      if (!name) return;
      const aliases = aliasMap[name] || [name];
      const matched = aliases.some(a => wordBoundaryRegex(a).test(lower));
      if (matched) {
        mentions.push(name);
        console.log(`     ✅ [${response.model}] Found mention of "${name}"`);
      }
    });
    
    return { model: response.model, queryIndex: response.queryIndex, mentions };
  });
  
  const processedResults = await Promise.all(processingPromises);
  
  // Aggregate results
  console.log('\n📈 [computeAiTrafficShares] Aggregating results...');
  processedResults.forEach(result => {
    const m = result.model;
    const queryIndex = result.queryIndex;
    
    // Count successful queries for this model
    totals[m] += 1;
    
    // Process mentions
    result.mentions.forEach(name => {
      counts[m][name] += 1;
    });
    
    console.log(`   [${m}] Query ${queryIndex + 1}: ${result.mentions.length} mentions found`);
  });

  // Convert to shares per formula
  console.log('\n📊 [computeAiTrafficShares] Finalizing metrics...');
  const sharesByCompetitor = {};
  competitorNames.forEach(name => {
    console.log(`\n   Processing competitor: ${name}`);
    const byModel = {};
    const usableModels = modelKeys.filter(m => (totals[m] || 0) > 0);
    console.log(`     Usable models: ${usableModels.join(', ')}`);
    
    usableModels.forEach(m => {
      const totalQ = totals[m];
      const mentions = counts[m][name] || 0;
      const share = totalQ > 0 ? (mentions / totalQ) * 100 : undefined;
      byModel[m] = share;
      console.log(`     ${m}: Mentions=${mentions}, Total=${totalQ}, Share=${share ? share.toFixed(1) + '%' : 'undefined'}`);
    });
    
    const globalNum = usableModels.reduce((s, m) => s + (counts[m][name] || 0), 0);
    const globalDen = usableModels.reduce((s, m) => s + (totals[m] || 0), 0);
    const global = globalDen > 0 ? (globalNum / globalDen) * 100 : 0;
    const weightedEqual = usableModels.length > 0
      ? usableModels.reduce((s, m) => s + (((counts[m][name] || 0) / (totals[m] || 1)) * 100), 0) / usableModels.length
      : 0;
    
    console.log(`     Global: Mentions=${globalNum}, Total=${globalDen}, Share=${global.toFixed(1)}%`);
    console.log(`     Weighted Equal: ${weightedEqual.toFixed(1)}%`);
    
    sharesByCompetitor[name] = { byModel, global, weightedGlobal: weightedEqual };
  });
  
  console.log('\n✅ [computeAiTrafficShares] Calculation completed successfully');
  return { sharesByCompetitor, totals, counts, queries };
}

// --- AI Citation Metrics (mention + sentiment + prominence) ---
function buildAliases(name) {
  const canonRaw = String(name || '').trim();
  const canon = canonRaw.toLowerCase();
  const noSpace = canon.replace(/\s+/g, '');
  const hyphen = canon.replace(/\s+/g, '-');
  // Strip common suffixes
  const stripped = canon.replace(/\b(corp(oration)?|inc\.?|ltd\.?|llc\.?|co\.?|technologies|technology|systems|solutions)\b/gi, '').trim();
  const strippedNoSpace = stripped.replace(/\s+/g, '');
  const strippedHyphen = stripped.replace(/\s+/g, '-');
  // Domain-style variants
  const domainCom = noSpace + '.com';
  const domainAi = noSpace + '.ai';
  const words = canon.split(/\s+/).filter(Boolean);
  const swapped = words.length === 2 ? `${words[1]} ${words[0]}` : '';
  const aliases = new Set([
    canonRaw,
    canon,
    noSpace,
    hyphen,
    stripped,
    strippedNoSpace,
    strippedHyphen,
    domainCom,
    domainAi,
    swapped,
    swapped ? swapped.replace(/\s+/g, '') : '',
    swapped ? swapped.replace(/\s+/g, '-'): ''
  ].filter(Boolean));
  return Array.from(aliases);
}

// --- Relative AI Visibility Index (RAVI) ---
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function clamp100(x) { return Math.max(0, Math.min(100, x)); }
function normalizeTo100(x, max = 100, min = 0) {
  const denom = Math.max(1e-9, max - min);
  const v = ((x - min) / denom) * 100;
  return clamp100(v);
}

function computeModelCoveragePercent(aiScores, threshold = 0) {
  const keys = ['chatgpt','gemini','perplexity','claude'];
  const available = keys.filter(k => aiScores && typeof aiScores[k] === 'number');
  const denom = Math.max(1, available.length);
  const covered = available.filter(k => (Number(aiScores[k]) || 0) > threshold).length;
  return (covered / denom) * 100;
}

function computeAvgModelScore100(aiScores) {
  const keys = ['chatgpt','gemini','perplexity','claude'];
  const vals = keys.map(k => Number(aiScores?.[k] || 0)).filter(v => v >= 0);
  if (vals.length === 0) return 0;
  // aiScores are on 0..10 in this pipeline; convert to 0..100
  const avg0to10 = vals.reduce((a,b)=>a+b,0) / vals.length;
  return avg0to10 * 10;
}

function computeRaviForCompetitor(entry) {
  const avgModelScore = computeAvgModelScore100(entry.aiScores);
  const trafficShare = Number(entry.aiTraffic?.global || 0); // already 0..100
  const citationScorePct = Number(entry.citations?.global?.citationScore || 0) * 100; // 0..1 -> 0..100
  const modelCoverage = computeModelCoveragePercent(entry.aiScores, 0);

  const avgModelN = normalizeTo100(avgModelScore, 100, 0);
  const trafficN = normalizeTo100(trafficShare, 100, 0);
  const citationN = normalizeTo100(citationScorePct, 100, 0);
  const coverageN = normalizeTo100(modelCoverage, 100, 0);

  const raviRaw = (avgModelN * 0.40) + (trafficN * 0.25) + (citationN * 0.20) + (coverageN * 0.15);
  const ravi = clamp100(raviRaw);
  return {
    raw: Number(raviRaw.toFixed(3)),
    rounded: Number((Math.round(ravi * 10) / 10).toFixed(1)),
    components: {
      avgModel: Number(avgModelN.toFixed(2)),
      traffic: Number(trafficN.toFixed(2)),
      citation: Number(citationN.toFixed(2)),
      coverage: Number(coverageN.toFixed(2))
    }
  };
}

function wordBoundaryRegex(term) {
  const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Allow optional punctuation or separators between tokens (spaces, hyphens, dots)
  // Example: "cloud fuze" should match "cloud-fuze" or "cloudfuze"
  const flexible = escaped.replace(/\\\s\+/g, '[\\s._-]*');
  return new RegExp(`(?:^|[^A-Za-z0-9])${flexible}(?:[^A-Za-z0-9]|$)`, 'i');
}

function sentimentWeightFromScore(s) {
  // Map [-1,1] to bins as specified
  if (s >= 0.6) return 1.0;
  if (s >= 0.2) return 0.8;
  if (s >= -0.2) return 0.6;
  if (s >= -0.6) return 0.4;
  return 0.2;
}

function computeProminenceFactorFromText(text, name) {
  try {
    const t = String(text || '');
    const lower = t.toLowerCase();
    const idx = lower.indexOf(String(name || '').toLowerCase());
    let factor = 1.0;
    if (idx >= 0 && idx < 200) factor += 0.15; // early appearance
    if (/recommend|we\s+recommend|top\s+pick|best\s+choice/i.test(t)) factor += 0.1;
    // list rank heuristic
    const lines = t.split(/\n+/);
    let rankBoost = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i];
      const m = line.match(/^\s*(\d+)[\)\.]?\s+(.+)$/);
      if (m && wordBoundaryRegex(name).test(line)) {
        const rank = parseInt(m[1], 10) || 99;
        const rankDiscount = 1 / Math.log2(1 + Math.max(1, rank));
        rankBoost = Math.max(rankBoost, rankDiscount - 1); // normalize ~ [0,1]
      }
    }
    factor += Math.min(0.3, Math.max(0, rankBoost));
    // Clamp to [0.5, 1.5]
    return Math.max(0.5, Math.min(1.5, factor));
  } catch { return 1.0; }
}

function detectMentionRobust(text, name, domainKeywords = []) {
  const t = String(text || '');
  const aliases = buildAliases(name);
  const hasAlias = aliases.some(a => wordBoundaryRegex(a).test(t));
  if (!hasAlias) return { detected: false, count: 0 };
  // Ambiguity guard for short/common names
  const common = /^(box|meta|apple|oracle|data|cloud|drive)$/i;
  if (common.test(name)) {
    const windowOk = domainKeywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(t));
    if (!windowOk) return { detected: false, count: 0 };
  }
  // Count occurrences (capped later)
  let count = 0;
  aliases.forEach(a => { const m = t.match(new RegExp(a.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig')); count += (m ? m.length : 0); });
  return { detected: true, count: Math.max(1, Math.min(3, count)) };
}

async function computeCitationMetrics(competitorNames, industry, isFast, opts = {}) {
  console.log('\n🔍 [computeCitationMetrics] Starting citation metrics calculation...');
  console.log(`   Competitors: ${competitorNames.join(', ')}`);
  console.log(`   Industry: ${industry}`);
  console.log(`   Fast mode: ${isFast}`);
  
  const queries = getDefaultQueryPool(industry, opts.geo || null, opts.companyName || '', opts.product || '').slice(0, isFast ? 6 : 12);
  console.log(`   Queries to process: ${queries.length} (${queries.join(', ')})`);
  
  const modelKeys = getConfiguredModelKeys();
  console.log(`   Configured models: ${modelKeys.join(', ')}`);
  
  if (modelKeys.length === 0) {
    console.log('❌ [computeCitationMetrics] No models configured - returning empty result');
    return {};
  }
  
  // Initialize aggregates
  const agg = {};
  competitorNames.forEach(c => {
    agg[c] = { perModel: {}, globalRaw: 0, globalMentions: 0 };
    modelKeys.forEach(m => { agg[c].perModel[m] = { raw: 0, mentions: 0, total: 0 }; });
  });

  const domainKeywords = ['cloud', 'migration', 'file', 'sharing', 'security', 'saas', 'platform', 'software', 'ai', 'storage'];
  console.log(`   Domain keywords: ${domainKeywords.join(', ')}`);

  // Create all LLM calls in parallel
  console.log('\n🚀 [computeCitationMetrics] Creating parallel LLM calls...');
  const allCalls = [];
  
  modelKeys.forEach(m => {
    queries.forEach((q, i) => {
      allCalls.push({
        model: m,
        query: q,
        queryIndex: i,
        prompt: `Answer briefly: ${q}`
      });
    });
  });
  
  console.log(`   Total parallel calls: ${allCalls.length} (${modelKeys.length} models × ${queries.length} queries)`);
  
  // Execute all calls in parallel
  const responses = await Promise.all(allCalls.map(async (call) => {
    try {
      console.log(`   📞 [${call.model}] Query ${call.queryIndex + 1}: "${call.query}"`);
      const text = await withTimeout(callModelSimple(call.model, call.prompt), isFast ? 8000 : 12000, '').catch(() => '');
      console.log(`   ✅ [${call.model}] Response: ${text ? text.length : 0} characters`);
      return {
        model: call.model,
        query: call.query,
        queryIndex: call.queryIndex,
        text: text || '',
        success: !!(text && String(text).trim())
      };
    } catch (error) {
      console.log(`   ❌ [${call.model}] Error: ${error.message}`);
      return {
        model: call.model,
        query: call.query,
        queryIndex: call.queryIndex,
        text: '',
        success: false
      };
    }
  }));
  
  console.log(`\n📊 [computeCitationMetrics] Processing ${responses.length} responses...`);
  
  // Process all responses in parallel
  const processingPromises = responses.map(async (response) => {
    if (!response.success) {
      console.log(`   ⚠️ Skipping failed response from ${response.model} for "${response.query}"`);
      return { model: response.model, queryIndex: response.queryIndex, mentions: [] };
    }
    
    const lower = String(response.text).toLowerCase();
    const mentions = [];
    
    for (const c of competitorNames) {
      try {
        const det = detectMentionRobust(lower, c, domainKeywords);
        if (!det.detected) { 
          continue; 
        }
        
        console.log(`     ✅ [${response.model}] Found mention of "${c}" (count: ${det.count})`);
        
        const s = quickSentimentScore(response.text);
        const sw = sentimentWeightFromScore(s);
        const pf = computeProminenceFactorFromText(response.text, c);
        const contrib = Math.min(1, det.count) * sw * pf;
        
        console.log(`       [${response.model}] Sentiment: ${s}, Weight: ${sw}, Prominence: ${pf}, Contribution: ${contrib}`);
        
        mentions.push({
          competitor: c,
          contribution: contrib,
          sentiment: s,
          weight: sw,
          prominence: pf
        });
      } catch (error) {
        console.log(`     ❌ [${response.model}] Error processing competitor "${c}": ${error.message}`);
      }
    }
    
    return { model: response.model, queryIndex: response.queryIndex, mentions };
  });
  
  const processedResults = await Promise.all(processingPromises);
  
  // Aggregate results
  console.log('\n📈 [computeCitationMetrics] Aggregating results...');
  processedResults.forEach(result => {
    const m = result.model;
    const queryIndex = result.queryIndex;
    
    // Count total queries for this model
    competitorNames.forEach(c => {
      agg[c].perModel[m].total += 1;
    });
    
    // Process mentions
    result.mentions.forEach(mention => {
      const c = mention.competitor;
      agg[c].perModel[m].raw += Math.min(1.0, mention.contribution);
      agg[c].perModel[m].mentions += 1;
      agg[c].globalRaw += Math.min(1.0, mention.contribution);
      agg[c].globalMentions += 1;
    });
    
    console.log(`   [${m}] Query ${queryIndex + 1}: ${result.mentions.length} mentions found`);
  });

  // Finalize metrics
  console.log('\n📊 [computeCitationMetrics] Finalizing metrics...');
  const result = {};
  competitorNames.forEach(c => {
    console.log(`\n   Processing competitor: ${c}`);
    const perModel = {};
    let sumTotals = 0;
    let sumRaw = 0;
    let sumMentions = 0;
    const usedModels = modelKeys.filter(m => (agg[c].perModel[m].total || 0) > 0);
    console.log(`     Used models: ${usedModels.join(', ')}`);
    
    usedModels.forEach(m => {
      const pm = agg[c].perModel[m];
      const total = pm.total;
      const citationScore = total > 0 ? (pm.raw / total) : 0;
      const citationRate = total > 0 ? (pm.mentions / total) : 0;
      
      console.log(`     ${m}: Total=${total}, Mentions=${pm.mentions}, Raw=${pm.raw.toFixed(3)}, Score=${citationScore.toFixed(3)}, Rate=${citationRate.toFixed(3)}`);
      
      perModel[m] = {
        citationCount: pm.mentions,
        totalQueries: pm.total,
        citationRate,
        rawCitationScore: pm.raw,
        citationScore
      };
      sumTotals += pm.total;
      sumRaw += pm.raw;
      sumMentions += pm.mentions;
    });
    
    // Equal-weighted per-model average (S^(eq))
    const equalWeighted = usedModels.length > 0
      ? usedModels.reduce((s, m) => s + (perModel[m].citationScore || 0), 0) / usedModels.length
      : 0;

    // Volume-weighted global score (S^(global))
    const globalCitationScore = sumTotals > 0 ? (sumRaw / sumTotals) : 0;
    const globalCitationRate = sumTotals > 0 ? (sumMentions / sumTotals) : 0;

    // Laplace-smoothed citation rate per global counts (alpha = 1)
    const alpha = 1;
    const smoothedRate = (sumMentions + alpha) / (sumTotals + 2 * alpha);

    // Display scores on 0–100 scale
    const displayScore_volume = Math.max(0, Math.min(100, globalCitationScore * 100));
    const displayScore_equal = Math.max(0, Math.min(100, equalWeighted * 100));

    // Confidence proxy based on mentions count vs threshold
    const minQueriesThreshold = 50;
    const confidence = Math.min(1, (sumMentions || 0) / minQueriesThreshold);

    console.log(`     Global totals: Total=${sumTotals}, Mentions=${sumMentions}, Raw=${sumRaw.toFixed(3)}`);
    console.log(`     Global scores: S_volume=${globalCitationScore.toFixed(3)}, S_equal=${equalWeighted.toFixed(3)}, Rate=${globalCitationRate.toFixed(3)} (smoothed ${smoothedRate.toFixed(3)})`);
    
    result[c] = {
      perModel,
      global: {
        citationCount: sumMentions,
        totalQueries: sumTotals,
        citationRate: globalCitationRate,
        citationRate_smoothed: smoothedRate,
        rawCitationScore: sumRaw,
        citationScore: globalCitationScore,
        equalWeightedGlobal: equalWeighted,
        score_volume_weighted: globalCitationScore,
        score_equal_weighted: equalWeighted,
        displayScore_volume: displayScore_volume,
        displayScore_equal: displayScore_equal,
        mentions_total: sumMentions,
        queries_total: sumTotals,
        confidence,
        models_available: usedModels
      }
    };
  });
  
  console.log('\n✅ [computeCitationMetrics] Final result summary:');
  Object.keys(result).forEach(competitor => {
    const data = result[competitor];
    console.log(`   ${competitor}: Global Citation Score = ${(data.global.citationScore * 100).toFixed(1)}%`);
  });
  
  return result;
}

// --- Audience & Demographics Helpers (GEO) ---
// Collect relevant text snippets for a competitor using Google CSE
async function collectAudienceSnippets(competitorName) {
  try {
    const queries = [
      `${competitorName} about us`,
      `${competitorName} solutions`,
      `${competitorName} platform`,
      `${competitorName} customers`,
      `${competitorName} press`,
      `${competitorName} who we serve`,
      `${competitorName} target audience`
    ];
    const results = await Promise.all(
      queries.map(q => queryCustomSearchAPI(q).catch(() => []))
    );
    const flattened = results.flat();
    const snippets = flattened
      .map(item => String(item?.snippet || ''))
      .filter(s => s && s.trim().length > 0)
      .slice(0, 25); // cap
    return snippets;
  } catch {
    return [];
  }
}

function normalizeRegion(labelRaw = '') {
  const l = String(labelRaw).toLowerCase();
  if (/(north\s*america|usa|u\.s\.|united\s*states|canada|us\b)/i.test(l)) return 'North America';
  if (/(europe|eu\b|uk\b|united\s*kingdom|germany|france|italy|spain|netherlands|nordics)/i.test(l)) return 'Europe';
  if (/(apac|asia\s*pacific|asia|australia|new\s*zealand|india|japan|singapore|korea)/i.test(l)) return 'APAC';
  if (/(latin\s*america|latam|brazil|mexico|argentina|chile|colombia)/i.test(l)) return 'LATAM';
  if (/(middle\s*east|mena|saudi|uae|qatar|egypt)/i.test(l)) return 'Middle East';
  if (/(africa|south\s*africa|nigeria|kenya)/i.test(l)) return 'Africa';
  if (/(global|worldwide|international)/i.test(l)) return 'Global';
  return labelRaw || '';
}

function normalizeCompanySize(labelRaw = '') {
  const l = String(labelRaw).toLowerCase();
  if (/(smb|small\s*business|startups?|small\s*&?\s*medium|mid\s*-?market)/i.test(l)) return 'SMB';
  if (/(enterprise|large\s*enterprise|fortune\s*500|global\s*enterprise|large\s*organizations?)/i.test(l)) return 'Enterprise';
  if (/(mid\s*-?market|midsize|medium\s*business)/i.test(l)) return 'Mid-Market';
  return labelRaw || '';
}

function normalizeIndustryFocus(labelRaw = '') {
  const l = String(labelRaw).toLowerCase();
  if (/health|medic|pharma|biotech|care/.test(l)) return 'Healthcare';
  if (/fintech|bank|finance|payment|insur/.test(l)) return 'Financial Services';
  if (/retail|e-?commerce|commerce|marketplace/.test(l)) return 'Retail & E-commerce';
  if (/cloud|devops|kubernetes|saas|platform|api/.test(l)) return 'Cloud & SaaS';
  if (/security|cyber|threat|protections?/.test(l)) return 'Cybersecurity';
  if (/education|edtech|university|school|learning/.test(l)) return 'Education';
  if (/manufactur|industrial|logistics|supply/.test(l)) return 'Manufacturing & Logistics';
  return labelRaw || '';
}

function normalizeAudienceLabels(labels = []) {
  const norm = [];
  const pushUnique = (label) => {
    if (!label) return;
    if (!norm.includes(label)) norm.push(label);
  };
  (labels || []).forEach(raw => {
    const l = String(raw || '').toLowerCase();
    if (/developer|devops|engineer/.test(l)) return pushUnique('Developers');
    if (/it\s*(teams?|managers?|leaders?)/.test(l)) return pushUnique('Enterprise IT');
    if (/security|secops|ciso/.test(l)) return pushUnique('Security Teams');
    if (/data|analytics|ml|ai\s*teams?/.test(l)) return pushUnique('Data & AI Teams');
    if (/marketing|growth|demand/.test(l)) return pushUnique('Marketing Teams');
    if (/sales|revops|revenue/.test(l)) return pushUnique('Sales Teams');
    if (/end-?users?|consumers?/.test(l)) return pushUnique('End Users');
    if (/smb|small\s*business|startups?/.test(l)) return pushUnique('SMB Buyers');
    if (/enterprise/.test(l)) return pushUnique('Enterprise Buyers');
    // fallback: Title Case
    pushUnique(String(raw || '').replace(/\s+/g, ' ').trim());
  });
  return norm;
}

function computeConfidenceForLabel(label, snippets, synonyms = []) {
  const total = Math.max(1, snippets.length);
  const needles = [String(label || '').toLowerCase(), ...synonyms.map(s => String(s).toLowerCase())].filter(Boolean);
  let supporting = 0;
  const lowers = snippets.map(s => String(s || '').toLowerCase());
  lowers.forEach(s => {
    if (needles.some(n => n && s.includes(n))) supporting++;
  });
  return Number((supporting / total).toFixed(2));
}

async function extractAudienceProfileWithGemini(competitorName, snippets) {
  if (!GEMINI_API_KEY) return null;
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `From the following text snippets about ${competitorName}, extract the target audience (roles, industries, B2B/B2C) and demographics (region, company size, industry focus).\nReturn ONLY JSON with keys: audience[], demographics { region, companySize, industryFocus }.\nSnippets:\n${snippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nExample JSON:\n{\n  "audience": ["Enterprise IT", "Developers"],\n  "demographics": {"region": "North America", "companySize": "SMB", "industryFocus": "Healthcare"}\n}`;
    const result = await model.generateContent(prompt);
    let text = result.response.candidates[0]?.content?.parts?.[0]?.text || '';
    text = text.trim().replace(/```json\s*|```/g, '');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return null;
  }
}

async function getAudienceProfile(competitorName) {
  try {
    const snippets = await collectAudienceSnippets(competitorName);
    const extracted = await extractAudienceProfileWithGemini(competitorName, snippets);
    if (!extracted) return null;

    // Normalize fields
    const normAudience = normalizeAudienceLabels(extracted.audience || []);
    const regionLabel = normalizeRegion(extracted?.demographics?.region || '');
    const companySizeLabel = normalizeCompanySize(extracted?.demographics?.companySize || '');
    const industryFocusLabel = normalizeIndustryFocus(extracted?.demographics?.industryFocus || '');

    // Confidence scoring
    const audienceWithConfidence = normAudience.map(label => ({
      label,
      confidence: computeConfidenceForLabel(label, snippets)
    }));

    const regionConfidence = computeConfidenceForLabel(regionLabel, snippets, [
      regionLabel,
      ...(regionLabel === 'North America' ? ['usa', 'united states', 'canada', 'north america'] : []),
      ...(regionLabel === 'Europe' ? ['europe', 'eu', 'uk', 'united kingdom'] : []),
      ...(regionLabel === 'APAC' ? ['apac', 'asia pacific', 'asia', 'australia', 'india', 'japan'] : []),
      ...(regionLabel === 'LATAM' ? ['latam', 'latin america', 'brazil', 'mexico'] : []),
      ...(regionLabel === 'Middle East' ? ['middle east', 'mena', 'uae', 'saudi'] : []),
      ...(regionLabel === 'Africa' ? ['africa', 'south africa', 'nigeria', 'kenya'] : []),
      ...(regionLabel === 'Global' ? ['global', 'worldwide', 'international'] : [])
    ]);

    const sizeConfidence = computeConfidenceForLabel(companySizeLabel, snippets, [
      companySizeLabel,
      ...(companySizeLabel === 'SMB' ? ['smb', 'small business', 'startup', 'mid-market'] : []),
      ...(companySizeLabel === 'Enterprise' ? ['enterprise', 'large enterprise', 'fortune 500'] : []),
      ...(companySizeLabel === 'Mid-Market' ? ['mid-market', 'midsize', 'medium business'] : [])
    ]);

    const industryConfidence = computeConfidenceForLabel(industryFocusLabel, snippets, [industryFocusLabel]);

    return {
      audience: audienceWithConfidence,
      demographics: {
        region: { label: regionLabel, confidence: regionConfidence },
        companySize: { label: companySizeLabel, confidence: sizeConfidence },
        industryFocus: { label: industryFocusLabel, confidence: industryConfidence }
      }
    };
  } catch {
    return null;
  }
}

// Automatic industry and product detection functions
async function detectIndustryAndProduct(companyName) {
  console.log(`🔍 Detecting industry and product for: ${companyName}`);
  
  try {
    // Use Google search to find company information
    const searchQueries = [
      `${companyName} company profile`,
      `${companyName} what do they do`,
      `${companyName} industry sector`,
      `${companyName} products services`
    ];
    
    let allSearchResults = [];
    
    for (const query of searchQueries) {
      try {
        const results = await queryCustomSearchAPI(query);
        allSearchResults = allSearchResults.concat(results);
      } catch (error) {
        console.log(`   ⚠️ Search failed for: ${query}`);
      }
    }
    
    if (allSearchResults.length === 0) {
      console.log(`   ⚠️ No search results found for ${companyName}`);
      return { industry: '', product: '' };
    }
    
    // Use AI to analyze search results and extract industry/product
    const analysisPrompt = `Analyze these search results about "${companyName}" and determine:
1. The primary industry/sector this company operates in
2. The main products/services they offer

Search results:
${allSearchResults.map(item => `${item.name}: ${item.snippet}`).join('\n\n')}

Return ONLY a JSON object with this format:
{
  "industry": "the primary industry",
  "product": "the main product or service"
}`;
    
    if (GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent(analysisPrompt);
      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';
      
      try {
        // Clean the response to remove markdown formatting
        let cleanedResponse = response.trim();
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
        
        const jsonMatch = cleanedResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        const analysis = JSON.parse(cleanedResponse);
        console.log(`   ✅ Detected industry: ${analysis.industry}`);
        console.log(`   ✅ Detected product: ${analysis.product}`);
        return analysis;
      } catch (error) {
        console.error('   ❌ Failed to parse AI analysis:', error.message);
        return { industry: '', product: '' };
      }
    } else {
      console.log(`   ⚠️ No Gemini API key, using fallback detection`);
      return { industry: '', product: '' };
    }
    
  } catch (error) {
    console.error(`❌ Industry/product detection error:`, error.message);
    return { industry: '', product: '' };
  }
}

// Enhanced prompt generation with automatic detection
function getEnhancedPrompts(company, industry = '', product = '') {
  const industryContext = industry || '[industry]';
  const productContext = product || '[product/service]';
  
  return {
    chatgpt: [
      `Which companies are leading in ${industryContext}?`,
      `What are the top companies offering ${productContext} in ${industryContext}?`,
      `Compare ${company} with other companies in the ${industryContext}.`,
      `How does ${company} leverage AI in ${industryContext}?`
    ],
    gemini: [
      `Which companies are leading in ${industryContext}?`,
      `What are the top companies offering ${productContext} in ${industryContext}?`,
      `Compare ${company} with other companies in the ${industryContext}.`,
      `How does ${company} leverage AI in ${industryContext}?`
    ],
    perplexity: [
      `Analyze the brand and market visibility of "${company}" in ${industryContext}. Write a narrative analysis that repeatedly references the exact company name "${company}" throughout the text. Include its position versus competitors, sentiment indicators, and notable strengths or gaps. Ensure the company name "${company}" appears naturally multiple times (at least 6) in the explanation.`,
      `Provide a competitor visibility comparison centered on "${company}" in ${industryContext}. Explicitly mention "${company}" many times while discussing mentions, positioning, and notable references in the market. Keep the tone analytical and informative.`,
      `Summarize how "${company}" is perceived in ${industryContext}, including brand mentions, relative positioning, and sentiment cues. Make sure to include the exact string "${company}" frequently across the response so the narrative clearly ties every point back to "${company}".`
    ],
    claude: [
      `Which companies are leading in ${industryContext}?`,
      `What are the top companies offering ${productContext} in ${industryContext}?`,
      `Compare ${company} with other companies in the ${industryContext}.`,
      `How does ${company} leverage AI in ${industryContext}?`
    ]
  };
}

// Google Custom Search API with retry logic
async function queryCustomSearchAPI(query) {
  const maxRetries = 3;
  const baseDelay = 2000;
  
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API credentials not configured');
  }
  
  console.log(`   🔍 Google Search: "${query}"`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   📡 Google Search attempt ${attempt}/${maxRetries}...`);
      const response = await axios.get(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}`
      );
      
      // Check if response has items
      if (!response.data || !response.data.items) {
        console.log(`   ⚠️ Google Search returned no results for: "${query}"`);
        return [];
      }
      
      const results = response.data.items.map(item => ({
        name: item.title,
        link: item.link,
        snippet: item.snippet
      }));
      console.log(`   ✅ Google Search successful: ${results.length} results`);
      return results;
    } catch (error) {
      if (error?.response?.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`   ⏳ Rate limited, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (attempt === maxRetries) {
        console.error(`   ❌ Google Search failed after ${maxRetries} attempts:`, error.message);
        // Return empty array instead of throwing error
        console.log(`   ⚠️ Returning empty results for: "${query}"`);
        return [];
      }
      console.log(`   ⏳ Google Search attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, baseDelay));
    }
  }
  
  // If we get here, return empty array
  console.log(`   ⚠️ Returning empty results for: "${query}"`);
  return [];
}

// Industry news search method with parallel queries
async function searchIndustryNewsCompetitors(companyName) {
  try {
    console.log(`   📰 Method 1: Industry news search for "${companyName}"`);
    
    // Multiple industry news search queries
    const searchQueries = [
      `${companyName} vs competitors`,
      `${companyName} market analysis`,
      `${companyName} industry report`,
      `top companies like ${companyName}`,
      `${companyName} competitive landscape`
    ];
    
    console.log(`   🚀 Running ${searchQueries.length} industry news queries in parallel...`);
    
    // Run all queries truly in parallel without delays
    const queryPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`   🔍 Industry news query ${index + 1}: "${query}"`);
        
        const searchResults = await queryCustomSearchAPI(query);
        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);
        return searchResults;
      } catch (error) {
        console.error(`   ❌ Industry news query ${index + 1} failed:`, error.message);
        return [];
      }
    });
    
    // Wait for all queries to complete
    const allSearchResults = await Promise.all(queryPromises);
    
    // Flatten results
    const flattenedResults = allSearchResults.flat();
    console.log(`   📊 Total industry news results: ${flattenedResults.length}`);
    
    const competitors = await extractCompetitorNames(companyName, flattenedResults);
    console.log(`   🎯 Extracted ${competitors.length} competitors from industry news:`, competitors);
    return competitors;
  } catch (error) {
    console.error('❌ Industry news search error:', error.message);
    return [];
  }
}

// Public company database search method with parallel queries
async function searchPublicCompanyDatabase(companyName) {
  try {
    console.log(`   🏢 Method 2: Public company database search for "${companyName}"`);
    
    // Multiple public database search queries
    const searchQueries = [
      `${companyName} company profile`,
      `${companyName} competitors list`,
      `${companyName} industry competitors`,
      `${companyName} market competitors`
    ];
    
    console.log(`   🚀 Running ${searchQueries.length} public database queries in parallel...`);
    
    // Run all queries truly in parallel without delays
    const queryPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`   🔍 Public database query ${index + 1}: "${query}"`);
        
        const searchResults = await queryCustomSearchAPI(query);
        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);
        return searchResults;
      } catch (error) {
        console.error(`   ❌ Public database query ${index + 1} failed:`, error.message);
        return [];
      }
    });
    
    // Wait for all queries to complete
    const allSearchResults = await Promise.all(queryPromises);
    
    // Flatten results
    const flattenedResults = allSearchResults.flat();
    console.log(`   📊 Total public database results: ${flattenedResults.length}`);
    
    const competitors = await extractCompetitorNames(companyName, flattenedResults);
    console.log(`   🎯 Extracted ${competitors.length} competitors from public database:`, competitors);
    return competitors;
  } catch (error) {
    console.error('❌ Public database search error:', error.message);
    return [];
  }
}

// Web search with relaxed filtering
async function extractCompetitorsWithRelaxedFiltering(searchResults, companyName) {
  try {
    console.log(`   🔍 Extracting competitors from ${searchResults.length} search results`);
    const competitors = await extractCompetitorNames(companyName, searchResults);
    console.log(`   🎯 Extracted ${competitors.length} competitors from web search`);
    const filtered = competitors.filter(name => 
      name.toLowerCase() !== companyName.toLowerCase() &&
      name.length > 2
    );
    console.log(`   ✅ Filtered to ${filtered.length} valid competitors`);
    return filtered;
  } catch (error) {
    console.error('❌ Relaxed filtering error:', error.message);
    return [];
  }
}

// Wikipedia-based search with parallel queries
async function searchWikipediaCompetitors(companyName) {
  try {
    console.log(`   📚 Method 4: Wikipedia-based search for "${companyName}"`);
    
    // Multiple Wikipedia search queries
    const searchQueries = [
      `${companyName} company profile`,
      `${companyName} competitors list`,
      `${companyName} industry competitors`,
      `${companyName} market competitors`
    ];
    
    console.log(`   🚀 Running ${searchQueries.length} Wikipedia queries in parallel...`);
    
    // Run all queries truly in parallel without delays
    const queryPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`   🔍 Wikipedia query ${index + 1}: "${query}"`);
        
        const searchResults = await queryCustomSearchAPI(query);
        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);
        return searchResults;
      } catch (error) {
        console.error(`   ❌ Wikipedia query ${index + 1} failed:`, error.message);
        return [];
      }
    });
    
    // Wait for all queries to complete
    const allSearchResults = await Promise.all(queryPromises);
    
    // Flatten results
    const flattenedResults = allSearchResults.flat();
    console.log(`   📊 Total Wikipedia results: ${flattenedResults.length}`);
    
    const competitors = await extractCompetitorNames(companyName, flattenedResults);
    console.log(`   🎯 Extracted ${competitors.length} competitors from Wikipedia:`, competitors);
    return competitors;
  } catch (error) {
    console.error('❌ Wikipedia search error:', error.message);
    return [];
  }
}

// Normalize brand key (dedupe variants like "pharmeasy" vs "pharmeasy.com" vs URL)
function normalizeBrandKey(raw) {
  try {
    if (!raw) return '';
    let s = String(raw).trim().toLowerCase();
    // Remove markdown/url wrappers
    s = s.replace(/^["'\[]+|["'\]]+$/g, '');
    // If looks like a URL or domain, extract registrable label
    if (s.includes('http://') || s.includes('https://')) {
      try { const u = new URL(s); s = u.hostname; } catch {}
    }
    // Strip protocol remnants and paths
    s = s.replace(/^www\./, '').split('/')[0];
    // If domain, take first label (brand) before first dot
    if (s.includes('.')) {
      s = s.split('.')[0];
    }
    // Remove non-alphanumeric characters
    s = s.replace(/[^a-z0-9]/g, '');
    // Strip common trailing noise tokens (handle domain-like and commerce suffixes)
    const trailingTokens = [
      'com','in','co','io','ai',
      'official','store','shop','app','inc','ltd','limited',
      'mart','online','healthservices','healthservice','healthcare'
    ];
    let changed = true;
    while (changed) {
      changed = false;
      for (const tok of trailingTokens) {
        if (s.endsWith(tok) && s.length > tok.length + 2) { // keep some brand core
          s = s.slice(0, -tok.length);
          changed = true;
          break;
        }
      }
    }
    return s;
  } catch { return String(raw || '').toLowerCase().trim(); }
}

function prettifyBrandNameFromKey(key) {
  if (!key) return '';
  // Simple title case; keeps brand readable when we dedupe domains
  return key.replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

// Clean competitor names and dedupe by normalized brand key
function cleanCompetitorNames(names) {
  const seen = new Set();
  const out = [];
  (names || [])
    .filter(name => name && typeof name === 'string')
    .map(name => String(name).trim())
    .filter(name => 
      name.length > 0 && 
      !name.toLowerCase().includes('wikipedia') &&
      !name.toLowerCase().includes('linkedin') &&
      !name.toLowerCase().includes('news') &&
      !name.toLowerCase().includes('article')
    )
    .forEach((name) => {
      const key = normalizeBrandKey(name);
      if (!key) return;
      if (seen.has(key)) return;
      seen.add(key);
      // Prefer original readable name if it already looks like a brand (no domain), else prettify
      const looksLikeDomain = /\.|\//.test(name);
      const display = looksLikeDomain ? prettifyBrandNameFromKey(key) : name;
      out.push(display);
    });
  // Extra pass: merge visually-similar variants (case-insensitive)
  const finalSeen = new Set();
  const final = [];
  out.forEach(name => {
    const key = normalizeBrandKey(name);
    if (finalSeen.has(key)) return;
    finalSeen.add(key);
    final.push(name);
  });
  console.log('   🧹 [cleanCompetitorNames] Unique brands:', final);
  return final;
}

// Extract competitor names from search results using AI
async function extractCompetitorNames(companyName, searchResults) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const searchText = searchResults.map(item => item.name).join('\n');
  
  // Enhanced prompt for better competitor extraction
  const prompt = `Analyze these search results and extract ONLY the competitor company names for "${companyName}".

Instructions:
1. Focus on companies that compete directly with ${companyName}
2. Exclude ${companyName} itself from the results
3. Exclude generic terms like "competitors", "companies", "businesses"
4. Return ONLY a JSON array of company names
5. No explanations, no markdown formatting

Search results:
${searchText}

Return format: ["Company1", "Company2", "Company3"]`;

  console.log(`   🤖 Extracting competitors using AI for "${companyName}"`);
  console.log(`   📄 Analyzing ${searchResults.length} search results`);
  
  const result = await model.generateContent(prompt);
  const response = result.response.candidates[0]?.content?.parts[0]?.text || '';
  
  try {
    // Clean the response to remove markdown formatting
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    
    // Try to extract JSON array
    const jsonMatch = cleanedResponse.match(/\[.*\]/s);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }
    
    let competitors = JSON.parse(cleanedResponse);
    // Normalize and dedupe immediately
    competitors = cleanCompetitorNames(competitors);
    const validCompetitors = Array.isArray(competitors) ? competitors : [];
    
    console.log(`   ✅ AI extracted ${validCompetitors.length} competitors`);
    return validCompetitors;
  } catch (error) {
    console.error('❌ Failed to parse competitor names:', error.message);
    console.error('Raw response:', response);
    return [];
  }
}

// Validate competitors using AI with parallel processing
async function validateCompetitors(companyName, competitorNames, searchResults) {
  if (!GEMINI_API_KEY) {
    console.log(`   ⚠️ No Gemini API key, returning top 10 competitors without validation`);
    return competitorNames.slice(0, 10);
  }
  
  console.log(`   🤖 Validating ${competitorNames.length} competitors for "${companyName}" in parallel...`);
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Process all competitors truly in parallel without delays
  const validationPromises = competitorNames.map(async (competitor, index) => {
    try {
      console.log(`   [DEBUG] Starting validation for competitor ${index + 1}/${competitorNames.length}: ${competitor}`);
      
      const scoringPrompt = `You are a business analyst. Rate how likely it is that ${competitor} is a direct competitor to ${companyName} on a scale of 0-100. Consider factors like:
- Same industry/market
- Similar products/services
- Target customers
- Business model

Return only a number between 0-100.`;
      
      const result = await model.generateContent(scoringPrompt);
      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';
      
      // Extract numeric score from response
      const scoreMatch = response.match(/(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      
      console.log(`   [DEBUG] ${competitor} scored ${score}/100 - ${score >= 50 ? 'VALID' : 'REJECTED'}`);
      
      return {
        competitor,
        score,
        isValid: score >= 50,
        error: null
      };
      
    } catch (error) {
      console.error(`   ❌ Error validating ${competitor}:`, error.message);
      return {
        competitor,
        score: 0,
        isValid: true, // Include as fallback if validation fails
        error: error.message
      };
    }
  });
  
  // Wait for all validations to complete
  console.log(`   ⏳ Running ${validationPromises.length} parallel validations...`);
  const validationResults = await Promise.all(validationPromises);
  
  // Filter valid competitors
  const validatedCompetitors = validationResults
    .filter(result => result.isValid)
    .map(result => result.competitor);
  
  console.log(`   ✅ Parallel validation complete: ${validatedCompetitors.length} valid competitors out of ${competitorNames.length}`);
  
  // Log validation summary
  validationResults.forEach(result => {
    if (result.isValid) {
      console.log(`   ✅ ${result.competitor}: Score ${result.score}/100`);
    } else {
      console.log(`   ❌ ${result.competitor}: Score ${result.score}/100 (rejected)`);
    }
  });
  
  return validatedCompetitors;
}

// Multi-method competitor detection with parallel processing
async function detectCompetitors(companyName, searchResults) {
  console.log('\n🔍 Starting parallel competitor detection...');
  const allCompetitors = new Map();
  const methodResults = {};
  
  // Run all 4 detection methods in parallel for maximum speed
  console.log('🚀 Launching all detection methods simultaneously...');
  
  const detectionPromises = [
    // Method 1: Industry news search
    (async () => {
      console.log('📰 Method 1: Industry news search...');
      try {
        const competitors = await searchIndustryNewsCompetitors(companyName);
        const cleaned = cleanCompetitorNames(competitors);
        methodResults.industryNews = cleaned;
        console.log(`   ✅ Found ${cleaned.length} competitors via industry news:`, cleaned);
        return { method: 'industryNews', competitors: cleaned };
      } catch (error) {
        console.error(`   ❌ Industry news search failed:`, error.message);
        return { method: 'industryNews', competitors: [] };
      }
    })(),
    
    // Method 2: Public company database search
    (async () => {
      console.log('🏢 Method 2: Public company database search...');
      try {
        const competitors = await searchPublicCompanyDatabase(companyName);
        const cleaned = cleanCompetitorNames(competitors);
        methodResults.publicDatabase = cleaned;
        console.log(`   ✅ Found ${cleaned.length} competitors via public database:`, cleaned);
        return { method: 'publicDatabase', competitors: cleaned };
      } catch (error) {
        console.error(`   ❌ Public database search failed:`, error.message);
        return { method: 'publicDatabase', competitors: [] };
      }
    })(),
    
    // Method 3: Web search with relaxed filtering
    (async () => {
      console.log('🌐 Method 3: Web search with relaxed filtering...');
      try {
        const competitors = await extractCompetitorsWithRelaxedFiltering(searchResults, companyName);
        const cleaned = cleanCompetitorNames(competitors);
        methodResults.webSearch = cleaned;
        console.log(`   ✅ Found ${cleaned.length} competitors via web search:`, cleaned);
        return { method: 'webSearch', competitors: cleaned };
      } catch (error) {
        console.error(`   ❌ Web search failed:`, error.message);
        return { method: 'webSearch', competitors: [] };
      }
    })(),
    
    // Method 4: Wikipedia-based search
    (async () => {
      console.log('📚 Method 4: Wikipedia-based search...');
      try {
        const competitors = await searchWikipediaCompetitors(companyName);
        const cleaned = cleanCompetitorNames(competitors);
        methodResults.wikipedia = cleaned;
        console.log(`   ✅ Found ${cleaned.length} competitors via Wikipedia:`, cleaned);
        return { method: 'wikipedia', competitors: cleaned };
      } catch (error) {
        console.error(`   ❌ Wikipedia search failed:`, error.message);
        return { method: 'wikipedia', competitors: [] };
      }
    })(),
    
    // Method 5: Geo-intent prompt bank search
    (async () => {
      console.log('🌍 Method 5: Geo-intent prompt bank search...');
      try {
        const prompts = getGeoCompetitorPromptBank({
          product: '',
          category: '',
          city: '',
          country: '',
          region: '',
          competitorA: companyName,
          competitorB: 'Amazon'
        });
        console.log(`   📝 Geo prompt bank size: ${prompts.length}`);
        // Run all searches in parallel with tight timeouts
        const searchPromises = prompts.map((q, i) => {
          console.log(`   🔎 Geo query ${i + 1}/${prompts.length}: "${q}"`);
          return withTimeout(queryCustomSearchAPI(q), 6000, []).catch(() => []);
        });
        const resultsNested = await Promise.all(searchPromises);
        const flattened = resultsNested.flat();
        console.log(`   📄 Geo prompt bank total results: ${flattened.length}`);
        const extracted = await withTimeout(extractCompetitorNames(companyName, flattened), 6000, []).catch(() => []);
        const cleaned = cleanCompetitorNames(extracted);
        console.log(`   ✅ Geo prompt bank extracted ${cleaned.length} competitors`);
        methodResults.geoPromptBank = cleaned;
        return { method: 'geoPromptBank', competitors: cleaned };
      } catch (error) {
        console.error(`   ❌ Geo-intent prompt bank search failed:`, error.message);
        return { method: 'geoPromptBank', competitors: [] };
      }
    })()
  ];
  
  // Wait for all detection methods to complete
  console.log('⏳ Waiting for all detection methods to complete...');
  const detectionResults = await Promise.all(detectionPromises);
  
  // Consolidate results from all methods
  console.log('\n📊 Consolidating results from all detection methods...');
  detectionResults.forEach(result => {
    if (result.competitors && result.competitors.length > 0) {
      result.competitors.forEach(rawComp => {
        const key = normalizeBrandKey(rawComp);
        const prev = allCompetitors.get(key) || 0;
        allCompetitors.set(key, prev + 1);
        console.log(`   [DEDUP] Add '${rawComp}' -> key='${key}', freq=${prev + 1}`);
      });
    }
  });
  
  // Rank competitors by frequency
  console.log('\n📊 Ranking competitors by frequency...');
  const rankedCompetitors = Array.from(allCompetitors.entries())
    .map(([key, frequency]) => ({ name: prettifyBrandNameFromKey(key) || key, frequency, key }))
    .sort((a, b) => b.frequency - a.frequency);
  
  console.log('📈 Competitor frequency ranking:');
  rankedCompetitors.forEach((comp, index) => {
    console.log(`   ${index + 1}. ${comp.name} (found ${comp.frequency} times)`);
  });
  
  const competitorNames = rankedCompetitors.map(c => c.name);
  console.log('   [DEDUP] Final ranked (name,key,freq):', rankedCompetitors);
  
  // Validate competitors with parallel processing
  console.log('\n✅ Validating competitors with AI in parallel...');
  const validatedCompetitors = await validateCompetitors(companyName, competitorNames, searchResults);
  console.log(`🎯 Final validated competitors:`, validatedCompetitors);
  
  return validatedCompetitors;
}

// Web scraping functionality
async function scrapeWebsite(url) {
  console.log(`   🌐 Scraping website: ${url}`);
  
  try {
    console.log(`   📄 Loading page...`);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const companyData = {
      name: $('title').text() || 'No title available',
      description: $('meta[name="description"]').attr('content') || 'No description available'
      };
    
    console.log(`   ✅ Scraping successful: "${companyData.name}"`);
    return companyData;
  } catch (error) {
    console.error(`   ❌ Scraping failed:`, error.message);
    return { error: 'Scraping failed', details: error.message };
  }
}

// Analyze visibility from AI response
// Enhanced visibility analysis with detailed scoring
function analyzeVisibility(responseText, company) {
  const name = company.name || company;
  
  // A. Mentions Count (35% weight)
  const mentions = (responseText.match(new RegExp(name, 'gi')) || []);
  const mentionsCount = mentions.length;
  
  // B. Prominence (30% weight) - how early the first mention appears (normalized 0..1)
  const lower = responseText.toLowerCase();
  const idx = lower.indexOf(String(name || '').toLowerCase());
  const textLen = Math.max(1, lower.length);
  const prominence = idx >= 0 ? Math.max(0, Math.min(1, 1 - (idx / textLen))) : 0;
  
  // C. Sentiment Score (20% weight)
  let sentiment = 0.5; // Default neutral
  const positiveWords = responseText.match(/best|leading|top|innovative|recommended|trusted|popular/gi) || [];
  const negativeWords = responseText.match(/problem|issue|concern|negative|bad|poor|not recommended/gi) || [];
  
  if (positiveWords.length > 0) {
    sentiment = 1; // Positive
  } else if (negativeWords.length > 0) {
    sentiment = 0; // Negative
  }
  
  // D. Brand Mentions (10% weight) - Same as mentions count but with different weight
  const brandMentions = mentionsCount;
  
  console.log(`   [DEBUG] Raw values for ${name}:`);
  console.log(`   [DEBUG] Mentions count: ${mentionsCount}`);
  console.log(`   [DEBUG] Prominence: ${prominence.toFixed(4)}`);
  console.log(`   [DEBUG] Sentiment: ${sentiment}`);
  console.log(`   [DEBUG] Brand mentions: ${brandMentions}`);
  
  return { 
    mentions, 
    position: idx >= 0 ? 1 : 0, // kept for backward compatibility
    prominence,
    sentiment, 
    brandMentions,
    mentionsCount,
    positiveWords: positiveWords.length,
    negativeWords: negativeWords.length
  };
}

// Calculate weighted visibility score
function calculateVisibilityScore(response, companyName = '') {
  if (response && typeof response === 'string') {
    const analysis = analyzeVisibility(response, companyName);
    
    // Weighted scoring formula
    const mentionsScore = analysis.mentionsCount * 0.35; // 35% weight
    const prominenceScore = analysis.prominence * 0.30; // 30% weight
    const sentimentScore = analysis.sentiment * 0.20; // 20% weight
    const brandMentionsScore = analysis.brandMentions * 0.15; // 15% weight
    
    const totalScore = mentionsScore + prominenceScore + sentimentScore + brandMentionsScore;
    
    console.log(`   [DEBUG] Weighted scores for ${companyName}:`);
    console.log(`   [DEBUG] Mentions score (35%): ${analysis.mentionsCount} x 0.35 = ${mentionsScore.toFixed(2)}`);
    console.log(`   [DEBUG] Prominence score (30%): ${analysis.prominence.toFixed(4)} x 0.30 = ${prominenceScore.toFixed(2)}`);
    console.log(`   [DEBUG] Sentiment score (20%): ${analysis.sentiment} x 0.20 = ${sentimentScore.toFixed(2)}`);
    console.log(`   [DEBUG] Brand mentions score (15%): ${analysis.brandMentions} x 0.15 = ${brandMentionsScore.toFixed(2)}`);
    console.log(`   [DEBUG] Total visibility score: ${totalScore.toFixed(4)}`);
    
    return {
      totalScore: totalScore,
      breakdown: {
        mentionsScore,
        prominenceScore,
        sentimentScore,
        brandMentionsScore
      },
      analysis
    };
  }
  
  if (response && typeof response === 'object') {
    const score = response.visibilityScore || response.score || response.rating || 5;
    return {
      totalScore: Math.min(Math.max(parseFloat(score) || 5, 1), 10),
      breakdown: {
        mentionsScore: 0,
        positionScore: 0,
        sentimentScore: 0,
        brandMentionsScore: 0
      },
      analysis: {}
    };
  }
  
  return {
    totalScore: 5,
    breakdown: {
      mentionsScore: 0,
      positionScore: 0,
      sentimentScore: 0,
      brandMentionsScore: 0
    },
    analysis: {}
  };
}

// Quick competitor detection within ~10 seconds from company/name/url/domain
async function quickDetectCompetitors(input) {
  try {
    let company = String(input || '').trim();
    // Normalize URL/domain to a company hint
    try {
      if (company.includes('.') || company.startsWith('http')) {
        const url = company.startsWith('http') ? company : `https://${company}`;
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        // use first label as company hint
        company = host.split('.')[0];
      }
    } catch {}

    const query = `${company} competitors`;
    const searchResults = await withTimeout(queryCustomSearchAPI(query), 6000, []);
    const extracted = await withTimeout(extractCompetitorNames(company, searchResults), 6000, []);
    const cleaned = cleanCompetitorNames(extracted).slice(0, 10);
    return { company, competitors: cleaned };
  } catch (e) {
    return { company: String(input || ''), competitors: [] };
  }
}

// Query Gemini for visibility analysis
async function queryGeminiVisibility(competitorName, industry = '', customPrompts = null) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompts = customPrompts || getGeminiPrompts(competitorName, industry);
  let allResponsesText = '';
  
  console.log(`   🤖 Gemini: Analyzing ${competitorName} with ${prompts.length} prompts`);
  console.log(`   📝 Gemini prompts to be used:`);
  prompts.forEach((prompt, i) => {
    console.log(`   ${i + 1}. ${prompt}`);
  });
  
  // Retry mechanism for service overload
  const retryWithBackoff = async (fn, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('429')) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`   ⏳ Gemini service overloaded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error;
      }
    }
  };
  
  // Run prompts in small concurrent batches to speed up while avoiding throttling
  const geminiConcurrency = 2;
  for (let i = 0; i < prompts.length; i += geminiConcurrency) {
    const batch = prompts.slice(i, i + geminiConcurrency);
    const batchResponses = await Promise.all(batch.map(async (prompt, idx) => {
      const promptIndex = i + idx;
      try {
        console.log(`   📝 Gemini prompt ${promptIndex + 1}: ${prompt.substring(0, 50)}...`);
        const response = await retryWithBackoff(async () => {
          const result = await model.generateContent(prompt);
          return result.response.candidates[0]?.content?.parts[0]?.text || '';
        });
        console.log(`   ✅ Gemini prompt ${promptIndex + 1} completed (${response.length} chars)`);
        return response;
      } catch (error) {
        console.error(`   ❌ Gemini prompt ${promptIndex + 1} error after retries:`, error.message);
        return '';
      }
    }));
    allResponsesText += batchResponses.join(' ') + ' ';
    if (i + geminiConcurrency < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
    }
  }
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);
  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);
  
  console.log(`   📊 Gemini analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);
  
  return { 
    analysis: allResponsesText || 'No analysis available', 
    visibilityScore: scoreResult.totalScore,
    keyMetrics: scoreResult.analysis,
    breakdown: scoreResult.breakdown
  };
}

// Query Perplexity for visibility analysis
async function queryPerplexity(competitorName, industry = '', customPrompts = null) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not set');
  }
  
  const prompts = customPrompts || getPerplexityPrompts(competitorName, industry);
  let allResponsesText = '';
  
  console.log(`   🤖 Perplexity: Analyzing ${competitorName} with ${prompts.length} prompts`);
  console.log(`   📝 Perplexity prompts to be used:`);
  prompts.forEach((prompt, i) => {
    console.log(`   ${i + 1}. ${prompt}`);
  });
  
  // Retry mechanism for service overload
  const retryWithBackoff = async (fn, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('429') || error.response?.status === 503 || error.response?.status === 429) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`   ⏳ Perplexity service overloaded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error;
      }
    }
  };
  
  for (let i = 0; i < prompts.length; i += 3) {
    const batch = prompts.slice(i, i + 3);
    console.log(`   [DEBUG] Processing Perplexity batch ${Math.floor(i/3) + 1}/${Math.ceil(prompts.length/3)}...`);
    
    const batchPromises = batch.map(async (prompt, index) => {
      try {
        console.log(`   📝 Perplexity prompt ${i + index + 1}: ${prompt.substring(0, 50)}...`);
        
        const responseObj = await retryWithBackoff(async () => {
          return sharedLLM.callPerplexityAPI(prompt, 'sonar', false);
        });
        const responseText = responseObj?.text || '';
        
        console.log(`   ✅ Perplexity prompt ${i + index + 1} completed (${responseText.length} chars)`);
        return responseText;
      } catch (error) {
        console.error(`   ❌ Perplexity prompt ${i + index + 1} error after retries:`, error.message);
        return '';
      }
    });
    
    const batchResponses = await Promise.all(batchPromises);
    allResponsesText += batchResponses.join(' ');
    
    if (i + 3 < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 600)); // Reduced delay
    }
  }
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);
  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);
  
  console.log(`   📊 Perplexity analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);
  
  return { 
    analysis: allResponsesText, 
    visibilityScore: scoreResult.totalScore,
    keyMetrics: scoreResult.analysis,
    breakdown: scoreResult.breakdown
  };
}

// Query Claude for visibility analysis
async function queryClaude(competitorName, industry = '', customPrompts = null) {
  if (!ANTHROPIC_API_KEY) {
    console.log(`   ⚠️ Claude: ANTHROPIC_API_KEY not set, returning fallback response`);
    return { 
      analysis: 'Claude analysis unavailable - API key not configured', 
      visibilityScore: 0, 
      keyMetrics: {},
      breakdown: {},
      error: 'api_key_not_set'
    };
  }
  
  const prompts = customPrompts || getClaudePrompts(competitorName, industry);
  let allResponsesText = '';
  
  console.log(`   🤖 Claude: Analyzing ${competitorName} with ${prompts.length} prompts`);
  console.log(`   📝 Claude prompts to be used:`);
  prompts.forEach((prompt, i) => {
    console.log(`   ${i + 1}. ${prompt}`);
  });
  
  // Run Claude prompts in small concurrent batches
  const claudeConcurrency = 2;
  for (let i = 0; i < prompts.length; i += claudeConcurrency) {
    const batch = prompts.slice(i, i + claudeConcurrency);
    const batchResponses = await Promise.all(batch.map(async (prompt, idx) => {
      const promptIndex = i + idx;
      try {
        console.log(`   📝 Claude prompt ${promptIndex + 1}: ${prompt.substring(0, 50)}...`);
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: [
              { role: 'user', content: prompt }
            ]
          },
          {
            headers: { 
              'Authorization': `Bearer ${ANTHROPIC_API_KEY}`, 
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            }
          }
        );
        const content = response.data?.content?.[0]?.text || '';
        console.log(`   ✅ Claude prompt ${promptIndex + 1} completed (${content.length} chars)`);
        return content;
      } catch (error) {
        console.error(`   ❌ Claude prompt ${promptIndex + 1} error:`, error.message);
        return '';
      }
    }));
    allResponsesText += batchResponses.join(' ') + ' ';
    if (i + claudeConcurrency < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
    }
  }
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);
  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);
  
  console.log(`   📊 Claude analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);
  
  return { 
    analysis: allResponsesText, 
    visibilityScore: scoreResult.totalScore,
    keyMetrics: scoreResult.analysis,
    breakdown: scoreResult.breakdown
  };
}

// Query ChatGPT for visibility analysis
async function queryChatGPT(competitorName, industry = '', customPrompts = null) {
  // Check if API key exists and is not a placeholder value
  const isValidApiKey = (key) => {
    return key && 
           !key.includes('your_') && 
           !key.includes('_here') &&
           key !== 'your_openai_api_key_here' &&
           key !== 'your_gemini_api_key_here' &&
           key !== 'your_anthropic_api_key_here' &&
           key !== 'your_perplexity_api_key_here';
  };
  
  if (!isValidApiKey(OPENAI_API_KEY)) {
    console.log(`   ⚠️ ChatGPT: OPENAI_API_KEY not configured or is placeholder, returning fallback response`);
    return { 
      analysis: 'ChatGPT analysis unavailable - API key not configured', 
      visibilityScore: 0, 
      keyMetrics: {},
      breakdown: {},
      error: 'api_key_not_set'
    };
  }
  
  const prompts = customPrompts || getChatGPTPrompts(competitorName, industry);
  let allResponsesText = '';
  
  console.log(`   🤖 ChatGPT: Analyzing ${competitorName} with ${prompts.length} prompts`);
  console.log(`   📝 ChatGPT prompts to be used:`);
  prompts.forEach((prompt, i) => {
    console.log(`   ${i + 1}. ${prompt}`);
  });
  
  // Run ChatGPT prompts in small concurrent batches
  const openAiConcurrency = 2;
  for (let i = 0; i < prompts.length; i += openAiConcurrency) {
    const batch = prompts.slice(i, i + openAiConcurrency);
    const batchResponses = await Promise.all(batch.map(async (prompt, idx) => {
      const promptIndex = i + idx;
      try {
        console.log(`   📝 ChatGPT prompt ${promptIndex + 1}: ${prompt.substring(0, 50)}...`);
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful business analyst specializing in AI market analysis.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1000
          },
          {
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
          }
        );
        const content = response.data?.choices?.[0]?.message?.content || '';
        console.log(`   ✅ ChatGPT prompt ${promptIndex + 1} completed (${content.length} chars)`);
        return content;
      } catch (error) {
        console.error(`   ❌ ChatGPT prompt ${promptIndex + 1} error:`, error.message);
        return '';
      }
    }));
    allResponsesText += batchResponses.join(' ') + ' ';
    if (i + openAiConcurrency < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
    }
  }
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);
  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);
  
  console.log(`   📊 ChatGPT analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);
  
  return { 
    analysis: allResponsesText, 
    visibilityScore: scoreResult.totalScore,
    keyMetrics: scoreResult.analysis,
    breakdown: scoreResult.breakdown
  };
}

// Utility: timeout wrapper with fallback
async function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

// Main AI visibility analysis function - now optimized by default
// New parallel LLM analysis function
async function analyzeCompanyWithAllModels(companyName, industry, product, prompts, isFast) {
  console.log(`\n🚀 [analyzeCompanyWithAllModels] Starting parallel analysis for ${companyName}`);
  
  const modelKeys = getConfiguredModelKeys();
  console.log(`   Available models: ${modelKeys.join(', ')}`);
  
  if (modelKeys.length === 0) {
    console.log('   ⚠️ No models available, returning fallback data');
    return {
      aiScores: { gemini: 0, perplexity: 0, claude: 0, chatgpt: 0 },
      breakdowns: {
        gemini: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} },
        perplexity: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} },
        claude: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} },
        chatgpt: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} }
      },
      keyMetrics: {
        gemini: { brandMentions: 0, positiveWords: 0, negativeWords: 0 },
        perplexity: { brandMentions: 0, positiveWords: 0, negativeWords: 0 },
        claude: { brandMentions: 0, positiveWords: 0, negativeWords: 0 },
        chatgpt: { brandMentions: 0, positiveWords: 0, negativeWords: 0 }
      },
      analysis: {
        gemini: 'No API key configured',
        perplexity: 'No API key configured',
        claude: 'No API key configured',
        chatgpt: 'No API key configured'
      }
    };
  }
  
  // Create all analysis calls in parallel
  const analysisCalls = [];
  
  if (modelKeys.includes('gemini')) {
    analysisCalls.push({
      model: 'gemini',
      promise: withTimeout(
        queryGeminiVisibility(companyName, industry, [prompts.gemini[0]]),
        isFast ? 12000 : 15000,
        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }
      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))
    });
  }
  
  if (modelKeys.includes('perplexity')) {
    analysisCalls.push({
      model: 'perplexity',
      promise: withTimeout(
        queryPerplexity(companyName, industry, [prompts.perplexity[0]]),
        isFast ? 12000 : 15000,
        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }
      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))
    });
  }
  
  if (modelKeys.includes('claude')) {
    analysisCalls.push({
      model: 'claude',
      promise: withTimeout(
        queryClaude(companyName, industry, [prompts.claude[0]]),
        isFast ? 12000 : 15000,
        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }
      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))
    });
  }
  
  if (modelKeys.includes('chatgpt')) {
    analysisCalls.push({
      model: 'chatgpt',
      promise: withTimeout(
        queryChatGPT(companyName, industry, [prompts.chatgpt[0]]),
        isFast ? 12000 : 15000,
        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }
      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))
    });
  }
  
  console.log(`   Executing ${analysisCalls.length} parallel analysis calls...`);
  
  // Execute all calls in parallel
  const results = await Promise.all(analysisCalls.map(async (call) => {
    try {
      console.log(`   📞 Starting ${call.model} analysis...`);
      const result = await call.promise;
      console.log(`   ✅ ${call.model} analysis completed: Score ${result.visibilityScore || 0}`);
      return { model: call.model, result };
    } catch (error) {
      console.log(`   ❌ ${call.model} analysis failed: ${error.message}`);
      return { 
        model: call.model, 
        result: { analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }
      };
    }
  }));
  
  // Aggregate results
  const aiScores = { gemini: 0, perplexity: 0, claude: 0, chatgpt: 0 };
  const breakdowns = {};
  const keyMetrics = {};
  const analysis = {};
  
  results.forEach(({ model, result }) => {
    aiScores[model] = result.visibilityScore || 0;
    breakdowns[model] = result;
    keyMetrics[model] = result.keyMetrics || { brandMentions: 0, positiveWords: 0, negativeWords: 0 };
    analysis[model] = result.analysis || 'No analysis available';
  });
  
  console.log(`   ✅ Parallel analysis completed for ${companyName}`);
  return { aiScores, breakdowns, keyMetrics, analysis };
}

async function getVisibilityData(companyName, industry = '', options = {}) {
  const startTime = Date.now();
  console.log('🚀 Starting Optimized AI Visibility Analysis for:', companyName);
  console.log('📊 Industry context:', industry || 'Not specified');
  
  // Default to fast mode for better performance
  const isFast = options && options.fast !== false; // Changed: fast mode is now default
  if (isFast) console.log('⚡ Optimized mode enabled: maximizing speed while maintaining accuracy');
  
  try {
    // Automatic industry and product detection if not provided (optimized in fast mode)
    let detectedIndustry = industry;
    let detectedProduct = '';
    
    // Start industry detection and search results in parallel for maximum speed
    const parallelTasks = [];
    
    if (!industry) {
      if (isFast) {
        console.log('🔍 Optimized mode: starting industry detection and search in parallel...');
        // Start industry detection in parallel
        parallelTasks.push(
          withTimeout(detectIndustryAndProduct(companyName), 8000, { industry: '', product: '' })
            .then(detection => {
              detectedIndustry = detection.industry;
              detectedProduct = detection.product;
              console.log(`📊 Quick detected industry: ${detectedIndustry || 'Unknown'}`);
              return { type: 'industry', data: detection };
            })
            .catch(error => {
              console.log('🔍 Quick detection failed, proceeding without industry context');
              detectedIndustry = '';
              detectedProduct = '';
              return { type: 'industry', data: { industry: '', product: '' } };
            })
        );
      } else {
        console.log('🔍 No industry specified, detecting automatically...');
        const detection = await detectIndustryAndProduct(companyName);
        detectedIndustry = detection.industry;
        detectedProduct = detection.product;
        console.log(`📊 Detected industry: ${detectedIndustry || 'Unknown'}`);
        console.log(`📊 Detected product: ${detectedProduct || 'Unknown'}`);
      }
    }
    
    // Get search results for competitors (start in parallel with industry detection)
    const searchQuery = `${companyName} competitors ${detectedIndustry}`.trim();
    console.log('🔍 Search query:', searchQuery);
    
    let searchResults = [];
    try {
      if (isFast) {
        // Start search in parallel with industry detection
        parallelTasks.push(
          withTimeout(queryCustomSearchAPI(searchQuery), 8000, [])
            .then(results => {
              searchResults = results;
              console.log('📈 Found', results.length, 'search results');
              return { type: 'search', data: results };
            })
            .catch(error => {
              console.error('❌ Search API error:', error.message);
              console.log('⚠️ Using empty search results, will rely on competitor detection');
              searchResults = [];
              return { type: 'search', data: [] };
            })
        );
        
        // Wait for both industry detection and search to complete
        if (parallelTasks.length > 0) {
          console.log('⏳ Waiting for parallel tasks (industry detection + search) to complete...');
          await Promise.all(parallelTasks);
        }
      } else {
        searchResults = await queryCustomSearchAPI(searchQuery);
        console.log('📈 Found', searchResults.length, 'search results');
      }
    } catch (error) {
      console.error('❌ Search API error:', error.message);
      console.log('⚠️ Using empty search results, will rely on competitor detection');
      searchResults = [];
    }
    
    const searchTime = Date.now();
    console.log(`⏱️ Search and industry detection completed in ${searchTime - startTime}ms`);
    
    // Detect competitors (optimized detection)
    console.log('🎯 Starting parallel competitor detection...');
    const competitorStartTime = Date.now();
    let competitors = [];
    if (isFast) {
      try {
        // Use our parallel competitor detection directly for maximum speed
        console.log('🚀 Using parallel competitor detection for maximum speed...');
        competitors = await withTimeout(detectCompetitors(companyName, searchResults), 20000, []);
        
        if (competitors.length === 0) {
          console.log('⚠️ Parallel detection returned no competitors, using quick extraction fallback');
          // Fallback to quick extraction
          const extracted = await withTimeout(extractCompetitorNames(companyName, searchResults), 8000, []);
          competitors = cleanCompetitorNames(extracted).slice(0, 10);
        }
        console.log('✅ Parallel competitor detection complete:', competitors);
      } catch (e) {
        console.log('⚠️ Parallel detection failed, using quick extraction fallback');
        try {
          const extracted = await withTimeout(extractCompetitorNames(companyName, searchResults), 8000, []);
          competitors = cleanCompetitorNames(extracted).slice(0, 10);
        } catch (fallbackError) {
          console.log('⚠️ Quick extraction failed, returning empty competitors');
          competitors = [];
        }
      }
    } else {
      try {
        const { detectCompetitorsEnhanced } = require('./enhancedCompetitorDetection');
        competitors = await detectCompetitorsEnhanced(companyName, industry);
        console.log('✅ Enhanced competitor detection complete. Found', competitors.length, 'competitors:', competitors);
      } catch (error) {
        console.error('❌ Enhanced competitor detection failed:', error.message);
        console.log('🔄 Falling back to original competitor detection...');
        try {
          competitors = await detectCompetitors(companyName, searchResults);
          console.log('✅ Original competitor detection complete. Found', competitors.length, 'competitors:', competitors);
        } catch (fallbackError) {
          console.error('❌ Original competitor detection also failed:', fallbackError.message);
          competitors = [];
        }
      }
    }
    
    const competitorTime = Date.now();
    console.log(`⏱️ Competitor detection completed in ${competitorTime - competitorStartTime}ms`);
    
    // No fallback competitors - only use detected competitors
    if (competitors.length === 0) {
      console.log('⚠️ No competitors detected - proceeding with empty competitor list');
    }
    
    // Analyze AI visibility across models (optimized: use all models but with timeouts)
    console.log('🤖 Starting parallel AI analysis...');
    const aiStartTime = Date.now();
    
    // Include the main company in analysis
    const allCompanies = [companyName, ...competitors];
    console.log('📋 Companies to analyze:', allCompanies);
    
    // Process all companies in parallel for maximum speed
    const analysisPromises = allCompanies.map(async (competitorName) => {
      console.log(`🎯 Starting analysis for: ${competitorName}`);
      
      // Skip scraping in fast mode for speed
      let scrapedData = null;
      if (!isFast) {
        try {
          const searchResult = searchResults.find(item => 
            item.name.toLowerCase().includes(competitorName.toLowerCase())
          );
          if (searchResult?.link) {
            console.log(`🌐 Scraping website for ${competitorName}:`, searchResult.link);
            scrapedData = await scrapeWebsite(searchResult.link);
            console.log(`✅ Scraping complete for ${competitorName}:`, scrapedData.name || 'No title');
          } else {
            console.log(`⚠️ No website link found for ${competitorName}`);
          }
        } catch (error) {
          console.error(`❌ Scraping error for ${competitorName}:`, error.message);
        }
      }
      
      console.log(`🤖 Starting AI analysis for ${competitorName}...`);
      
      // Use enhanced prompts with detected industry and product
      const enhancedPrompts = getEnhancedPrompts(competitorName, detectedIndustry, detectedProduct);
      
      if (isFast) {
        // Use the new parallel analysis function
        const [
          parallelAnalysis,
          audienceProfile,
          rawModelMetrics
        ] = await Promise.all([
          analyzeCompanyWithAllModels(competitorName, detectedIndustry, detectedProduct, enhancedPrompts, isFast),
          // Audience profile in parallel with a tight timeout to avoid slowing main flow
          withTimeout(getAudienceProfile(competitorName), 9000, null).catch(() => null),
          withTimeout(computePerModelRawMetrics(competitorName, true), 9000, { chatgpt: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, gemini: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, perplexity: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, claude: {mentions:0,prominence:0,sentiment:0,brandMentions:0} }).catch(() => ({ chatgpt: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, gemini: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, perplexity: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, claude: {mentions:0,prominence:0,sentiment:0,brandMentions:0} }))
        ]);
        
        // Extract individual responses from parallel analysis
        const geminiResponse = parallelAnalysis.breakdowns.gemini || { analysis: 'No analysis', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
        const perplexityResponse = parallelAnalysis.breakdowns.perplexity || { analysis: 'No analysis', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
        const claudeResponse = parallelAnalysis.breakdowns.claude || { analysis: 'No analysis', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
        const chatgptResponse = parallelAnalysis.breakdowns.chatgpt || { analysis: 'No analysis', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
        
        // Use scores from parallel analysis
        const scores = parallelAnalysis.aiScores;
        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;
        return {
          name: competitorName,
          citationCount: Math.floor(totalScore * 100),
          aiScores: scores,
          totalScore: Number(totalScore.toFixed(4)),
          breakdowns: parallelAnalysis.breakdowns,
          keyMetrics: parallelAnalysis.keyMetrics,
          scrapedData,
          analysis: parallelAnalysis.analysis,
          audienceProfile: audienceProfile || null,
          rawModels: rawModelMetrics,
          snippets: {
            gemini: (parallelAnalysis.analysis.gemini || '').slice(0, 300),
            chatgpt: (parallelAnalysis.analysis.chatgpt || '').slice(0, 300),
            claude: (parallelAnalysis.analysis.claude || '').slice(0, 300),
            perplexity: (parallelAnalysis.analysis.perplexity || '').slice(0, 300)
          }
        };
      }

      // Query all AI models in parallel for this competitor with enhanced error handling (full mode)
      const [
        geminiResponse, perplexityResponse, 
        claudeResponse, chatgptResponse,
        audienceProfile,
        rawModelMetrics
      ] = await Promise.all([
        queryGeminiVisibility(competitorName, detectedIndustry, enhancedPrompts.gemini).catch(err => {
          console.error(`❌ Gemini error for ${competitorName}:`, err.message);
          return { 
            analysis: 'Gemini analysis unavailable due to service overload', 
            visibilityScore: 0, 
            keyMetrics: {},
            breakdown: {}
          };
        }),
        queryPerplexity(competitorName, detectedIndustry, enhancedPrompts.perplexity).catch(err => {
          console.error(`❌ Perplexity error for ${competitorName}:`, err.message);
          return { 
            analysis: 'Perplexity analysis unavailable due to service overload', 
            visibilityScore: 0, 
            keyMetrics: {},
            breakdown: {}
          };
        }),
        queryClaude(competitorName, detectedIndustry, enhancedPrompts.claude).catch(err => {
          console.error(`❌ Claude error for ${competitorName}:`, err.message);
          return { 
            analysis: 'Claude analysis unavailable due to service overload', 
            visibilityScore: 0, 
            keyMetrics: {},
            breakdown: {}
          };
        }),
        queryChatGPT(competitorName, detectedIndustry, enhancedPrompts.chatgpt).catch(err => {
          console.error(`❌ ChatGPT error for ${competitorName}:`, err.message);
          return { 
            analysis: 'ChatGPT analysis unavailable due to service overload', 
            visibilityScore: 0, 
            keyMetrics: {},
            breakdown: {}
          };
        }),
        withTimeout(getAudienceProfile(competitorName), 12000, null).catch(() => null),
        withTimeout(computePerModelRawMetrics(competitorName, false), 15000, { chatgpt: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, gemini: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, perplexity: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, claude: {mentions:0,prominence:0,sentiment:0,brandMentions:0} }).catch(() => ({ chatgpt: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, gemini: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, perplexity: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, claude: {mentions:0,prominence:0,sentiment:0,brandMentions:0} }))
      ]);
      
      // Ensure all responses have valid structure
      const safeGeminiResponse = geminiResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };
      const safePerplexityResponse = perplexityResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };
      const safeClaudeResponse = claudeResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };
      const safeChatGPTResponse = chatgptResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };
      
      // Log response structures for debugging (truncate to keep logs small)
      console.log(`\n🔍 Response structures for ${competitorName} (truncated):`);
      const truncate = (obj) => {
        try {
          const str = JSON.stringify(obj);
          return str.length > 400 ? str.slice(0, 400) + '…' : str;
        } catch { return '[unserializable]'; }
      };
      console.log(`   Gemini:`, truncate(safeGeminiResponse));
      console.log(`   Perplexity:`, truncate(safePerplexityResponse));
      console.log(`   Claude:`, truncate(safeClaudeResponse));
      console.log(`   ChatGPT:`, truncate(safeChatGPTResponse));
      
      // Calculate scores with fallback values
      // Placeholder, will be set after normalization across competitors
      const scores = { gemini: 0, perplexity: 0, claude: 0, chatgpt: 0 };
      
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;
      
      // Check service availability and provide detailed logging
      const serviceStatus = {
        gemini: !geminiResponse.error,
        perplexity: !perplexityResponse.error,
        claude: !claudeResponse.error,
        chatgpt: !chatgptResponse.error
      };
      
      const availableServices = Object.values(serviceStatus).filter(Boolean).length;
      console.log(`📊 Service Status for ${competitorName}:`);
      console.log(`   - Gemini: ${serviceStatus.gemini ? '✅ Available' : '❌ Overloaded'}`);
      console.log(`   - Perplexity: ${serviceStatus.perplexity ? '✅ Available' : '❌ Overloaded'}`);
      console.log(`   - Claude: ${serviceStatus.claude ? '✅ Available' : '❌ Overloaded'}`);
      console.log(`   - ChatGPT: ${serviceStatus.chatgpt ? '✅ Available' : '❌ Overloaded'}`);
      console.log(`   - Available Services: ${availableServices}/4`);
      
      console.log(`📈 Calculated scores for ${competitorName}:`);
      console.log(`   - Gemini: ${scores.gemini.toFixed(4)} ${!serviceStatus.gemini ? '(fallback)' : ''}`);
      console.log(`   - Perplexity: ${scores.perplexity.toFixed(4)} ${!serviceStatus.perplexity ? '(fallback)' : ''}`);
      console.log(`   - Claude: ${scores.claude.toFixed(4)} ${!serviceStatus.claude ? '(fallback)' : ''}`);
      console.log(`   - ChatGPT: ${scores.chatgpt.toFixed(4)} ${!serviceStatus.chatgpt ? '(fallback)' : ''}`);
      console.log(`   - Average Score: ${totalScore.toFixed(4)}`);
      
      if (availableServices < 2) {
        console.log(`⚠️ Warning: Only ${availableServices}/4 AI services available. Results may be less accurate.`);
      }
      
      return {
        name: competitorName,
        citationCount: Math.floor(totalScore * 100), // Mock citation count based on score
        aiScores: scores,
        totalScore: Number(totalScore.toFixed(4)),
        breakdowns: {
          gemini: geminiResponse.breakdown || {},
          perplexity: perplexityResponse.breakdown || {},
          claude: claudeResponse.breakdown || {},
          chatgpt: chatgptResponse.breakdown || {}
        },
        keyMetrics: {
          gemini: geminiResponse.keyMetrics || {},
          perplexity: perplexityResponse.keyMetrics || {},
          claude: claudeResponse.keyMetrics || {},
          chatgpt: chatgptResponse.keyMetrics || {}
        },
        scrapedData: scrapedData,
        analysis: {
          gemini: geminiResponse.analysis || 'No analysis available',
          perplexity: perplexityResponse.analysis || 'No analysis available',
          claude: claudeResponse.analysis || 'No analysis available',
          chatgpt: chatgptResponse.analysis || 'No analysis available'
        },
        audienceProfile: audienceProfile || null,
        rawModels: rawModelMetrics,
        snippets: {
          gemini: (geminiResponse.analysis || '').slice(0, 300),
          chatgpt: (chatgptResponse.analysis || '').slice(0, 300),
          claude: (claudeResponse.analysis || '').slice(0, 300),
          perplexity: (perplexityResponse.analysis || '').slice(0, 300)
        }
      };
    });
    
    // Wait for all analyses to complete
    console.log('⏳ Waiting for all parallel analyses to complete...');
    let analysisResults = await Promise.all(analysisPromises);
    // Compute normalized per-model scores from rawModels across all competitors
    const enriched = analysisResults.map(r => ({ name: r.name, rawModels: r.rawModels || { chatgpt: {}, gemini: {}, perplexity: {}, claude: {} } }));
    const normalized = normalizeAndScoreModels(enriched);
    // Ensure modelKeys is available in this scope for filtering
    const configuredModelKeys = getConfiguredModelKeys();
    const scoreByName = new Map(normalized.map(n => [n.name, n.aiScores]));
    analysisResults = analysisResults.map(r => {
      // Use normalized CSE-based scores only for models that actually ran; zero otherwise
      const norm = scoreByName.get(r.name) || r.aiScores || { chatgpt: 0, gemini: 0, perplexity: 0, claude: 0 };
      const newScores = {
        chatgpt: configuredModelKeys.includes('chatgpt') ? norm.chatgpt : 0,
        gemini: configuredModelKeys.includes('gemini') ? norm.gemini : 0,
        perplexity: configuredModelKeys.includes('perplexity') ? norm.perplexity : 0,
        claude: configuredModelKeys.includes('claude') ? norm.claude : 0,
      };
      const avg = (newScores.chatgpt + newScores.gemini + newScores.perplexity + newScores.claude) / 4;
      return { ...r, aiScores: newScores, totalScore: Number(avg.toFixed(4)) };
    });

    // Compute AI Traffic shares using a small query pool (fast/full)
    console.log('\n🚀 Starting AI Traffic Share and Citation Metrics calculation...');
    console.log(`   Companies: ${allCompanies.join(', ')}`);
    console.log(`   Industry: ${detectedIndustry}`);
    console.log(`   Fast mode: ${isFast}`);
    
    try {
      console.log('📊 Calling computeAiTrafficShares...');
      const trafficPromise = computeAiTrafficShares(allCompanies, detectedIndustry, isFast, { companyName, product: detectedProduct })
        .then(result => {
          console.log('✅ AI Traffic Share calculation completed successfully');
          if (result && result.sharesByCompetitor) {
            console.log('   Traffic results:');
            Object.keys(result.sharesByCompetitor).forEach(competitor => {
              const data = result.sharesByCompetitor[competitor];
              console.log(`     ${competitor}: Global ${data.global.toFixed(1)}%`);
            });
          } else {
            console.log('   ⚠️ Traffic result is null/undefined');
          }
          return result;
        })
        .catch(error => {
          console.log('❌ AI Traffic Share calculation failed:', error.message);
          console.log('   Stack trace:', error.stack);
          return null;
        });

      console.log('📈 Calling computeCitationMetrics...');
      const citationsPromise = computeCitationMetrics(allCompanies, detectedIndustry, isFast, { companyName, product: detectedProduct })
        .then(result => {
          console.log('✅ AI Citation Metrics calculation completed successfully');
          if (result) {
            console.log('   Citation results:');
            Object.keys(result).forEach(competitor => {
              const data = result[competitor];
              if (data && data.global) {
                console.log(`     ${competitor}: Global ${(data.global.citationScore * 100).toFixed(1)}%`);
              } else {
                console.log(`     ${competitor}: No citation data`);
              }
            });
          } else {
            console.log('   ⚠️ Citation result is null/undefined');
          }
          return result;
        })
        .catch(error => {
          console.log('❌ AI Citation Metrics calculation failed:', error.message);
          console.log('   Stack trace:', error.stack);
          return null;
        });

      const [traffic, citations] = await Promise.all([trafficPromise, citationsPromise]);
      
      console.log('\n📋 Processing results...');
      console.log(`   Traffic result: ${traffic ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Citations result: ${citations ? 'SUCCESS' : 'FAILED'}`);
      
      analysisResults = analysisResults.map(r => {
        const aiTraffic = traffic ? (traffic.sharesByCompetitor[r.name] || { byModel: {}, global: 0, weightedGlobal: 0 }) : undefined;
        const citationsFor = citations ? (citations[r.name] || undefined) : undefined;
        
        console.log(`   ${r.name}:`);
        console.log(`     AI Traffic: ${aiTraffic ? `Global ${aiTraffic.global.toFixed(1)}%` : 'UNDEFINED'}`);
        console.log(`     Citations: ${citationsFor ? `Global ${(citationsFor.global?.citationScore * 100).toFixed(1)}%` : 'UNDEFINED'}`);
        
        return { ...r, aiTraffic, citations: citationsFor };
      });
    } catch (e) { 
      console.log('❌ Error in AI Traffic/Citation calculation:', e.message);
      console.log('   Stack trace:', e.stack);
    }

    // Compute RAVI per competitor
    analysisResults = analysisResults.map(r => ({
      ...r,
      ravi: computeRaviForCompetitor(r)
    }));
    console.log('✅ All parallel analyses completed!');
    
    const aiTime = Date.now();
    console.log(`⏱️ AI analysis completed in ${aiTime - aiStartTime}ms`);
    
    console.log('\n🎉 Optimized AI Visibility Analysis complete!');
    console.log('📋 Final results:');
    analysisResults.forEach(comp => {
      console.log(`   - ${comp.name}: Score ${comp.totalScore}/10`);
    });
    
    // Calculate overall service status
    const overallServiceStatus = {
      gemini: analysisResults.some(r => !r.breakdowns?.gemini?.error),
      perplexity: analysisResults.some(r => !r.breakdowns?.perplexity?.error),
      claude: analysisResults.some(r => !r.breakdowns?.claude?.error),
      chatgpt: analysisResults.some(r => !r.breakdowns?.chatgpt?.error)
    };
    
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️ Total analysis time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`📊 Performance breakdown:`);
    console.log(`   - Search & Industry: ${searchTime - startTime}ms`);
    console.log(`   - Competitor Detection: ${competitorTime - competitorStartTime}ms`);
    console.log(`   - AI Analysis: ${aiTime - aiStartTime}ms`);
    
    // Persist run rows for engagement/growth later
    try {
      const savePromises = analysisResults.map(async (r) => {
        try {
          await db.saveAiVisibilityRun({
            id: require('crypto').randomUUID(),
            company: companyName,
            competitor: r.name,
            totalScore: r.totalScore,
            aiScores: r.aiScores
          });
        } catch {}
        try {
          if (r.ravi?.rounded !== undefined) {
            await db.saveVisibilityLog({
              id: require('crypto').randomUUID(),
              competitor: r.name,
              metric: 'RAVI',
              value: Number(r.ravi.rounded) || 0
            });
          }
          if (r.aiTraffic?.global !== undefined) {
            await db.saveVisibilityLog({
              id: require('crypto').randomUUID(),
              competitor: r.name,
              metric: 'AI_Traffic_Share',
              value: Number(r.aiTraffic.global) || 0
            });
          }
          if (r.citations?.global?.citationScore !== undefined) {
            await db.saveVisibilityLog({
              id: require('crypto').randomUUID(),
              competitor: r.name,
              metric: 'CitationScore',
              value: Number(r.citations.global.citationScore) * 100 || 0
            });
          }
        } catch {}
      });
      await Promise.all(savePromises);
    } catch {}

    return {
      company: companyName,
      industry: industry,
      competitors: analysisResults,
      serviceStatus: overallServiceStatus
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`AI Visibility Analysis error after ${totalTime}ms:`, error);
    throw new Error(`Failed to analyze AI visibility: ${error.message}`);
  }
}

// Analyze a single competitor for AI visibility
async function analyzeSingleCompetitor(competitorName, industry = '') {
  console.log(`\n🎯 Analyzing single competitor: ${competitorName}`);
  console.log(`📋 Industry context: ${industry || 'Not specified'}`);
  
  try {
    // Detect industry and product if not provided
    let detectedIndustry = industry;
    let detectedProduct = '';
    
    if (!industry) {
      console.log('🔍 Detecting industry and product automatically...');
      const detection = await detectIndustryAndProduct(competitorName);
      detectedIndustry = detection.industry;
      detectedProduct = detection.product;
      console.log(`   ✅ Detected industry: ${detectedIndustry}`);
      console.log(`   ✅ Detected product: ${detectedProduct}`);
    }
    
    // Get enhanced prompts
    const enhancedPrompts = getEnhancedPrompts(competitorName, detectedIndustry, detectedProduct);
    
    console.log(`\n📝 Enhanced prompts for ${competitorName}:`);
    console.log(`   Gemini prompts:`, enhancedPrompts.gemini);
    console.log(`   Perplexity prompts:`, enhancedPrompts.perplexity);
    console.log(`   Claude prompts:`, enhancedPrompts.claude);
    console.log(`   ChatGPT prompts:`, enhancedPrompts.chatgpt);
    
    console.log('\n🤖 Querying AI models in parallel for visibility analysis...');
    
    // Query all AI models in parallel for maximum speed
    const [
      geminiResponse, perplexityResponse, 
      claudeResponse, chatgptResponse,
      audienceProfile
    ] = await Promise.all([
      queryGeminiVisibility(competitorName, detectedIndustry, enhancedPrompts.gemini).catch(err => {
        console.error(`❌ Gemini error for ${competitorName}:`, err.message);
        console.error(`   Stack trace:`, err.stack);
        return { 
          analysis: 'Analysis unavailable', 
          visibilityScore: 0, 
          keyMetrics: {},
          breakdown: {}
        };
      }),
      queryPerplexity(competitorName, detectedIndustry, enhancedPrompts.perplexity).catch(err => {
        console.error(`❌ Perplexity error for ${competitorName}:`, err.message);
        console.error(`   Stack trace:`, err.stack);
        return { 
          analysis: 'Analysis unavailable', 
          visibilityScore: 0, 
          keyMetrics: {},
          breakdown: {}
        };
      }),
      queryClaude(competitorName, detectedIndustry, enhancedPrompts.claude).catch(err => {
        console.error(`❌ Claude error for ${competitorName}:`, err.message);
        console.error(`   Stack trace:`, err.stack);
        return { 
          analysis: 'Analysis unavailable', 
          visibilityScore: 0, 
          keyMetrics: {},
          breakdown: {}
        };
      }),
      queryChatGPT(competitorName, detectedIndustry, enhancedPrompts.chatgpt).catch(err => {
        console.error(`❌ ChatGPT error for ${competitorName}:`, err.message);
        console.error(`   Stack trace:`, err.stack);
        return { 
          analysis: 'Analysis unavailable', 
          visibilityScore: 0, 
          keyMetrics: {},
          breakdown: {}
        };
      }),
      withTimeout(getAudienceProfile(competitorName), 12000, null).catch(() => null)
    ]);
    
    console.log(`\n🔍 Raw AI responses for ${competitorName}:`);
    console.log(`   Gemini:`, geminiResponse ? 'Success' : 'Failed');
    console.log(`   Perplexity:`, perplexityResponse ? 'Success' : 'Failed');
    console.log(`   Claude:`, claudeResponse ? 'Success' : 'Failed');
    console.log(`   ChatGPT:`, chatgptResponse ? 'Success' : 'Failed');
    
    // Ensure all responses have valid structure (no inflated defaults)
    const safeGeminiResponse = geminiResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
    const safePerplexityResponse = perplexityResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
    const safeClaudeResponse = claudeResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
    const safeChatGPTResponse = chatgptResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };
    
    // Log response structures for debugging
    console.log(`\n🔍 Response structures for ${competitorName}:`);
    console.log(`   Gemini:`, JSON.stringify(safeGeminiResponse, null, 2));
    console.log(`   Perplexity:`, JSON.stringify(safePerplexityResponse, null, 2));
    console.log(`   Claude:`, JSON.stringify(safeClaudeResponse, null, 2));
    console.log(`   ChatGPT:`, JSON.stringify(safeChatGPTResponse, null, 2));
    
    // Calculate scores (no positive fallbacks)
    const scores = {
      gemini: (safeGeminiResponse.visibilityScore || 0),
      perplexity: (safePerplexityResponse.visibilityScore || 0),
      claude: (safeClaudeResponse.visibilityScore || 0),
      chatgpt: (safeChatGPTResponse.visibilityScore || 0)
    };
    
    const totalScore = (scores.gemini + scores.perplexity + scores.claude + scores.chatgpt) / 4;
    
    console.log(`\n📊 AI Visibility Scores for ${competitorName}:`);
    console.log(`   - Gemini: ${scores.gemini.toFixed(4)}`);
    console.log(`   - Perplexity: ${scores.perplexity.toFixed(4)}`);
    console.log(`   - Claude: ${scores.claude.toFixed(4)}`);
    console.log(`   - ChatGPT: ${scores.chatgpt.toFixed(4)}`);
    console.log(`   - Average: ${totalScore.toFixed(4)}`);
    
    const competitorAnalysis = {
      name: competitorName,
      citationCount: Math.floor(totalScore * 100),
      aiScores: scores,
      totalScore: Number(totalScore.toFixed(4)),
      breakdowns: {
        gemini: safeGeminiResponse.breakdown || {},
        perplexity: safePerplexityResponse.breakdown || {},
        claude: safeClaudeResponse.breakdown || {},
        chatgpt: safeChatGPTResponse.breakdown || {}
      },
      keyMetrics: {
        gemini: safeGeminiResponse.keyMetrics || {},
        perplexity: safePerplexityResponse.keyMetrics || {},
        claude: safeClaudeResponse.keyMetrics || {},
        chatgpt: safeChatGPTResponse.keyMetrics || {}
      },
      scrapedData: null, // Not needed for single competitor
      analysis: {
        gemini: safeGeminiResponse.analysis || 'No analysis available',
        perplexity: safePerplexityResponse.analysis || 'No analysis available',
        claude: safeClaudeResponse.analysis || 'No analysis available',
        chatgpt: safeChatGPTResponse.analysis || 'No analysis available'
      },
      audienceProfile: audienceProfile || null
    };
    
    console.log(`\n✅ Single competitor analysis complete for ${competitorName}`);
    console.log(`📋 Final result: Score ${totalScore.toFixed(4)}/10`);
    
    return competitorAnalysis;
    
  } catch (error) {
    console.error('Single competitor analysis error:', error);
    throw new Error(`Failed to analyze competitor ${competitorName}: ${error.message}`);
  }
}

module.exports = {
  getVisibilityData,
  quickDetectCompetitors,
  queryCustomSearchAPI,
  detectCompetitors,
  queryGeminiVisibility,
  queryPerplexity,
  queryClaude,
  queryChatGPT,
  scrapeWebsite,
  analyzeVisibility,
  calculateVisibilityScore,
  getGeminiPrompts,
  getPerplexityPrompts,
  getClaudePrompts,
  getChatGPTPrompts,
  detectIndustryAndProduct,
  getConfiguredModelKeys,
  callModelSimple,
  computeCitationMetrics,
  detectMentionRobust,
  quickSentimentScore,
  sentimentWeightFromScore,
  computeProminenceFactorFromText,
  getEnhancedPrompts,
  analyzeSingleCompetitor
}; 