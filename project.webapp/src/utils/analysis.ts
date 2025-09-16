// Calculate accuracy score (simplified)
export function calculateAccuracy(question: string, answer: string, content: string): number {
  const questionWords = question.toLowerCase().split(' ');
  const answerWords = answer.toLowerCase().split(' ');
  const contentWords = content.toLowerCase().split(' ');
  
  // Check relevance
  let relevanceScore = 0;
  questionWords.forEach(word => {
    if (word.length > 3 && answerWords.includes(word)) {
      relevanceScore += 1;
    }
  });
  
  // Check content coverage
  let coverageScore = 0;
  answerWords.forEach(word => {
    if (word.length > 3 && contentWords.includes(word)) {
      coverageScore += 1;
    }
  });
  
  // Calculate final score
  const maxRelevance = Math.max(questionWords.length, 1);
  const maxCoverage = Math.max(answerWords.length, 1);
  
  const accuracy = ((relevanceScore / maxRelevance) * 0.6 + (coverageScore / maxCoverage) * 0.4) * 100;
  return Math.min(Math.max(accuracy, 0), 100);
}

// Enhanced sentiment analysis for website/URL content
export function analyzeSentiment(text: string): string {
  // Expanded dictionaries for better coverage
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'helpful', 'useful', 'clear', 'effective',
    'beneficial', 'advantageous', 'superior', 'quality', 'reliable', 'efficient', 'powerful', 'comprehensive', 'detailed', 'accurate',
    'professional', 'innovative', 'advanced', 'secure', 'fast', 'easy', 'simple', 'convenient', 'flexible', 'scalable',
    'robust', 'stable', 'trusted', 'proven', 'award-winning', 'leading', 'premium', 'exclusive', 'cutting-edge', 'modern',
    'user-friendly', 'intuitive', 'seamless', 'smooth', 'responsive', 'optimized', 'enhanced', 'improved', 'upgraded', 'streamlined'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'negative', 'unclear', 'confusing', 'useless', 'ineffective', 'poor',
    'unreliable', 'slow', 'difficult', 'complex', 'outdated', 'limited', 'restrictive', 'expensive', 'risky', 'unstable',
    'buggy', 'glitchy', 'broken', 'faulty', 'defective', 'inferior', 'substandard', 'mediocre', 'disappointing', 'frustrating',
    'annoying', 'problematic', 'troublesome', 'cumbersome', 'clunky', 'awkward', 'unintuitive', 'complicated', 'overwhelming', 'stressful'
  ];
  
  // Business and technical terms that indicate positive sentiment
  const businessPositive = [
    'solution', 'platform', 'service', 'product', 'feature', 'capability', 'functionality', 'performance', 'reliability', 'security',
    'support', 'documentation', 'integration', 'automation', 'optimization', 'efficiency', 'productivity', 'growth', 'success', 'achievement',
    'innovation', 'technology', 'development', 'improvement', 'enhancement', 'upgrade', 'update', 'maintenance', 'monitoring', 'analytics'
  ];
  
  // Business and technical terms that indicate negative sentiment
  const businessNegative = [
    'issue', 'problem', 'error', 'bug', 'failure', 'crash', 'downtime', 'outage', 'disruption', 'delay',
    'limitation', 'constraint', 'restriction', 'barrier', 'obstacle', 'challenge', 'difficulty', 'complexity', 'confusion', 'uncertainty',
    'risk', 'threat', 'vulnerability', 'weakness', 'deficiency', 'shortcoming', 'drawback', 'disadvantage', 'inconvenience', 'frustration'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;
  let totalWords = words.length;
  
  words.forEach(word => {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[^\w]/g, '');
    
    if (cleanWord.length < 3) return; // Skip very short words
    
    // Check positive words
    if (positiveWords.includes(cleanWord)) {
      positiveScore += 1;
    } else if (businessPositive.includes(cleanWord)) {
      positiveScore += 0.5; // Business terms get lower weight
    }
    
    // Check negative words
    if (negativeWords.includes(cleanWord)) {
      negativeScore += 1;
    } else if (businessNegative.includes(cleanWord)) {
      negativeScore += 0.5; // Business terms get lower weight
    }
  });
  
  // Calculate sentiment ratio
  const totalScore = positiveScore + negativeScore;
  
  if (totalScore === 0) {
    return 'Neutral'; // Default to neutral when no sentiment words found
  }
  
  const positiveRatio = positiveScore / totalScore;
  const negativeRatio = negativeScore / totalScore;
  
  // Determine sentiment with thresholds
  if (positiveRatio > 0.6) {
    return 'Positive';
  } else if (negativeRatio > 0.6) {
    return 'Negative';
  } else {
    return 'Neutral';
  }
}

// Enhanced sentiment analysis with confidence scoring
export function analyzeSentimentWithConfidence(text: string): { sentiment: string; confidence: number; breakdown: { positive: number; negative: number; neutral: number } } {
  // Expanded dictionaries (same as above)
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'helpful', 'useful', 'clear', 'effective',
    'beneficial', 'advantageous', 'superior', 'quality', 'reliable', 'efficient', 'powerful', 'comprehensive', 'detailed', 'accurate',
    'professional', 'innovative', 'advanced', 'secure', 'fast', 'easy', 'simple', 'convenient', 'flexible', 'scalable',
    'robust', 'stable', 'trusted', 'proven', 'award-winning', 'leading', 'premium', 'exclusive', 'cutting-edge', 'modern',
    'user-friendly', 'intuitive', 'seamless', 'smooth', 'responsive', 'optimized', 'enhanced', 'improved', 'upgraded', 'streamlined'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'negative', 'unclear', 'confusing', 'useless', 'ineffective', 'poor',
    'unreliable', 'slow', 'difficult', 'complex', 'outdated', 'limited', 'restrictive', 'expensive', 'risky', 'unstable',
    'buggy', 'glitchy', 'broken', 'faulty', 'defective', 'inferior', 'substandard', 'mediocre', 'disappointing', 'frustrating',
    'annoying', 'problematic', 'troublesome', 'cumbersome', 'clunky', 'awkward', 'unintuitive', 'complicated', 'overwhelming', 'stressful'
  ];
  
  const businessPositive = [
    'solution', 'platform', 'service', 'product', 'feature', 'capability', 'functionality', 'performance', 'reliability', 'security',
    'support', 'documentation', 'integration', 'automation', 'optimization', 'efficiency', 'productivity', 'growth', 'success', 'achievement',
    'innovation', 'technology', 'development', 'improvement', 'enhancement', 'upgrade', 'update', 'maintenance', 'monitoring', 'analytics'
  ];
  
  const businessNegative = [
    'issue', 'problem', 'error', 'bug', 'failure', 'crash', 'downtime', 'outage', 'disruption', 'delay',
    'limitation', 'constraint', 'restriction', 'barrier', 'obstacle', 'challenge', 'difficulty', 'complexity', 'confusion', 'uncertainty',
    'risk', 'threat', 'vulnerability', 'weakness', 'deficiency', 'shortcoming', 'drawback', 'disadvantage', 'inconvenience', 'frustration'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;
  let totalWords = words.length;
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (cleanWord.length < 3) return;
    
    if (positiveWords.includes(cleanWord)) {
      positiveScore += 1;
    } else if (businessPositive.includes(cleanWord)) {
      positiveScore += 0.5;
    }
    
    if (negativeWords.includes(cleanWord)) {
      negativeScore += 1;
    } else if (businessNegative.includes(cleanWord)) {
      negativeScore += 0.5;
    }
  });
  
  const totalScore = positiveScore + negativeScore;
  
  if (totalScore === 0) {
    return {
      sentiment: 'Neutral',
      confidence: 0.8,
      breakdown: { positive: 0, negative: 0, neutral: 100 }
    };
  }
  
  const positiveRatio = (positiveScore / totalScore) * 100;
  const negativeRatio = (negativeScore / totalScore) * 100;
  const neutralRatio = 100 - positiveRatio - negativeRatio;
  
  let sentiment: string;
  let confidence: number;
  
  if (positiveRatio > 60) {
    sentiment = 'Positive';
    confidence = Math.min(0.9, positiveRatio / 100);
  } else if (negativeRatio > 60) {
    sentiment = 'Negative';
    confidence = Math.min(0.9, negativeRatio / 100);
  } else {
    sentiment = 'Neutral';
    confidence = Math.max(0.6, neutralRatio / 100);
  }
  
  return {
    sentiment,
    confidence,
    breakdown: {
      positive: Math.round(positiveRatio),
      negative: Math.round(negativeRatio),
      neutral: Math.round(neutralRatio)
    }
  };
}

import { callGeminiAPI } from './geminiApi';

// Helper: Split content into chunks of maxLength (overlapping by overlap chars)
function chunkContent(content: string, maxLength: number = 3500, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < content.length) {
    const end = Math.min(start + maxLength, content.length);
    chunks.push(content.slice(start, end));
    if (end === content.length) break;
    start += maxLength - overlap;
  }
  return chunks;
}

// Calculate confidence using Gemini API (relevance only, full content or chunked)
export async function calculateConfidenceWithGemini(
  question: string, 
  content: string, 
  apiKey: string, 
  model: string = 'gemini-1.5-flash'
): Promise<number> {
  // Gemini 1.5 context window is ~30,000 tokens, but to be safe, use ~10,000 chars
  const MAX_CHARS = 9000;
  if (content.length <= MAX_CHARS) {
    // Content fits, send all
    const prompt = `Rate how relevant the following question is to the given blog content on a scale of 0 to 100, where 0 means not relevant at all and 100 means extremely relevant.\n\nOnly consider how closely the question relates to the topics, facts, or ideas present in the blog content.\n\nBlog Content:\n${content}\n\nQuestion: ${question}\n\nRespond with ONLY a number between 0 and 100.`;
    const result = await callGeminiAPI(prompt, apiKey, model, false);
    const confidenceText = result.text.trim();
    const confidenceMatch = confidenceText.match(/\d+/);
    if (confidenceMatch) {
      const confidence = parseInt(confidenceMatch[0]);
      return Math.min(Math.max(confidence, 0), 100);
    }
    return 50;
  } else {
    // Content too long, chunk and aggregate
    const chunks = chunkContent(content, MAX_CHARS, 500);
    const scores: number[] = [];
    for (const chunk of chunks) {
      const prompt = `Rate how relevant the following question is to the given blog content on a scale of 0 to 100, where 0 means not relevant at all and 100 means extremely relevant.\n\nOnly consider how closely the question relates to the topics, facts, or ideas present in the blog content.\n\nBlog Content:\n${chunk}\n\nQuestion: ${question}\n\nRespond with ONLY a number between 0 and 100.`;
      const result = await callGeminiAPI(prompt, apiKey, model, false);
      const confidenceText = result.text.trim();
      const confidenceMatch = confidenceText.match(/\d+/);
      if (confidenceMatch) {
        const confidence = parseInt(confidenceMatch[0]);
        scores.push(Math.min(Math.max(confidence, 0), 100));
      }
    }
    // Aggregate: use max score (most optimistic)
    if (scores.length > 0) {
      return Math.max(...scores);
    }
    return 50;
  }
}

// Enhanced confidence calculation with detailed scoring criteria
export async function calculateEnhancedConfidence(
  question: string, 
  content: string, 
  apiKey: string, 
  model: string = 'gemini-1.5-flash'
): Promise<{ confidence: number, breakdown: { relevance: number, answerability: number, specificity: number, depth: number } }> {
  try {
    const prompt = `Analyze this question's relevance to the given content using these specific criteria:

1. RELEVANCE (0-25 points): How directly related is the question to the main topics and themes in the content?
2. ANSWERABILITY (0-25 points): Can the question be definitively answered using only the provided content?
3. SPECIFICITY (0-25 points): Is the question specific enough to have a clear, unambiguous answer?
4. DEPTH (0-25 points): Does the question test meaningful understanding rather than just surface-level facts?

Blog Content:
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

Question: ${question}

Respond with ONLY the scores in this exact format:
RELEVANCE: [0-25]
ANSWERABILITY: [0-25]
SPECIFICITY: [0-25]
DEPTH: [0-25]
TOTAL: [sum of all scores]`;

    const { callGeminiAPI } = await import('./geminiApi');
    const result = await callGeminiAPI(prompt, apiKey, model, false);
    
    const response = result.text.trim();
    
    // Extract individual scores
    const relevanceMatch = response.match(/RELEVANCE:\s*(\d+)/i);
    const answerabilityMatch = response.match(/ANSWERABILITY:\s*(\d+)/i);
    const specificityMatch = response.match(/SPECIFICITY:\s*(\d+)/i);
    const depthMatch = response.match(/DEPTH:\s*(\d+)/i);
    const totalMatch = response.match(/TOTAL:\s*(\d+)/i);
    
    const relevance = relevanceMatch ? Math.min(Math.max(parseInt(relevanceMatch[1]), 0), 25) : 12;
    const answerability = answerabilityMatch ? Math.min(Math.max(parseInt(answerabilityMatch[1]), 0), 25) : 12;
    const specificity = specificityMatch ? Math.min(Math.max(parseInt(specificityMatch[1]), 0), 25) : 12;
    const depth = depthMatch ? Math.min(Math.max(parseInt(depthMatch[1]), 0), 25) : 12;
    
    const total = totalMatch ? Math.min(Math.max(parseInt(totalMatch[1]), 0), 100) : 
                  relevance + answerability + specificity + depth;
    
    return {
      confidence: total,
      breakdown: { relevance, answerability, specificity, depth }
    };
    
  } catch (error) {
    console.error('Error calculating enhanced confidence:', error);
    return {
      confidence: 50,
      breakdown: { relevance: 12, answerability: 12, specificity: 12, depth: 14 }
    };
  }
}

// Filter questions by confidence threshold
export function filterQuestionsByConfidence(
  questions: string[],
  confidences: number[],
  minConfidence: number = 95
): { filteredQuestions: string[], filteredConfidences: number[], removedCount: number } {
  const filteredQuestions: string[] = [];
  const filteredConfidences: number[] = [];
  let removedCount = 0;
  
  questions.forEach((question, index) => {
    const confidence = confidences[index] || 0;
    if (confidence >= minConfidence) {
      filteredQuestions.push(question);
      filteredConfidences.push(confidence);
    } else {
      removedCount++;
    }
  });
  
  return { filteredQuestions, filteredConfidences, removedCount };
}

// Calculate confidence statistics
export function calculateConfidenceStats(confidences: number[]): {
  average: number;
  median: number;
  min: number;
  max: number;
  above95: number;
  above80: number;
  above60: number;
} {
  if (confidences.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0, above95: 0, above80: 0, above60: 0 };
  }
  
  const sorted = [...confidences].sort((a, b) => a - b);
  const average = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = Math.min(...confidences);
  const max = Math.max(...confidences);
  
  const above95 = confidences.filter(conf => conf >= 95).length;
  const above80 = confidences.filter(conf => conf >= 80).length;
  const above60 = confidences.filter(conf => conf >= 60).length;
  
  return { average, median, min, max, above95, above80, above60 };
}

// AI-Powered confidence calculation for individual questions - RELEVANCE ONLY
export async function calculateQuestionConfidence(
  question: string, 
  content: string, 
  apiKey: string, 
  model: string = 'gemini-1.5-flash'
): Promise<{
  confidence: number;
  reasoning: string;
  outputTokens: number;
}> {
  try {
    const prompt = `Rate how relevant the following question is to the given blog content on a scale of 0 to 100, where 0 means not relevant at all and 100 means extremely relevant.

Only consider how closely the question relates to the topics, facts, or ideas present in the blog content.

Blog Content:
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

Question: ${question}

Respond with ONLY a number between 0 and 100.`;

    const { callGeminiAPI } = await import('./geminiApi');
    const result = await callGeminiAPI(prompt, apiKey, model, false);
    
    const response = result.text.trim();
    
    // Extract confidence score
    const confidenceMatch = response.match(/\d+/);
    const confidence = confidenceMatch ? Math.min(Math.max(parseInt(confidenceMatch[0]), 0), 100) : 50;
    
    const reasoning = `AI Relevance Score: ${confidence}/100 - ${confidence >= 80 ? 'Highly relevant' : confidence >= 60 ? 'Moderately relevant' : 'Low relevance'} to the content`;
    
    return {
      confidence,
      reasoning,
      outputTokens: result.outputTokens
    };
    
  } catch (error) {
    console.error('Error calculating question confidence:', error);
    return {
      confidence: 50,
      reasoning: 'Error in AI analysis - using fallback score',
      outputTokens: 0
    };
  }
}

/**
 * Calculate a simple GEO score for a Q&A pair.
 * Heuristic: based on answer length, keyword overlap, and structure.
 * - +40 if answer length is reasonable (30-300 chars)
 * - +30 if at least 3 keywords from the question appear in the answer
 * - +20 if answer contains at least one list or heading (\n, -, *, 1.)
 * - +10 if answer ends with a period/question mark/exclamation
 * Max score: 100
 */
export function calculateGeoScore(question: string, answer: string): number {
  let score = 0;
  const answerLen = answer.length;
  if (answerLen >= 30 && answerLen <= 300) score += 40;

  // Keyword overlap
  const qWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const aWords = answer.toLowerCase().split(/\W+/);
  const overlap = qWords.filter(qw => aWords.includes(qw));
  if (overlap.length >= 3) score += 30;

  // Structure: list or heading
  if (/\n\s*[-*1.]/.test(answer)) score += 20;

  // Ends with punctuation
  if (/[.!?]$/.test(answer.trim())) score += 10;

  return Math.min(score, 100);
}

/**
 * Calculate advanced GEO score for a Q&A pair using multiple factors.
 * Returns { geoScore, breakdown }
 */
export async function calculateGeoScoreV2({
  accuracy,
  question,
  answer,
  importantQuestions,
  allConfidences,
  sourceUrl,
  content
}: {
  accuracy: number;
  question: string;
  answer: string;
  importantQuestions: string[];
  allConfidences: number[];
  sourceUrl: string;
  content: string;
}): Promise<{ geoScore: number, breakdown: any }> {
  // Dynamic Coverage Score - Calculate based on content similarity and question relevance
  let coverage = 0;
  if (importantQuestions.length > 0) {
    let totalCoverageScore = 0;
    for (let i = 0; i < importantQuestions.length; i++) {
      const importantQ = importantQuestions[i];
      const confidence = allConfidences[i] || 0;
      
      // Calculate semantic similarity between current question and important question
      const similarity = calculateQuestionSimilarity(question, importantQ);
      
      // Weight by confidence and similarity
      const questionCoverage = (confidence * similarity) / 100;
      totalCoverageScore += questionCoverage;
    }
    coverage = (totalCoverageScore / importantQuestions.length) * 100;
  }

  // Dynamic Structure Score - More comprehensive analysis
  let structure = 0;
  
  // 1. Answer Length Analysis (0-20 points)
  const answerLength = answer.length;
  if (answerLength >= 50 && answerLength <= 500) {
    structure += 20; // Optimal length
  } else if (answerLength >= 30 && answerLength <= 800) {
    structure += 15; // Good length
  } else if (answerLength >= 20 && answerLength <= 1000) {
    structure += 10; // Acceptable length
  }
  
  // 2. Formatting and Structure (0-30 points)
  if (/^Q:|<h[1-6]>|<h[1-6] /.test(answer) || /<h[1-6]>/.test(content)) structure += 15;
  if (/\n\s*[-*1.]/.test(answer) || /<ul>|<ol>/.test(answer)) structure += 15;
  
  // 3. Readability Analysis (0-25 points)
  const sentences = answer.split(/[.!?]/).filter(s => s.trim().length > 0);
  const words = answer.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLen = sentences.length > 0 ? words.length / sentences.length : 0;
  
  if (avgSentenceLen >= 10 && avgSentenceLen <= 25) {
    structure += 25; // Optimal sentence length
  } else if (avgSentenceLen >= 8 && avgSentenceLen <= 30) {
    structure += 20; // Good sentence length
  } else if (avgSentenceLen >= 5 && avgSentenceLen <= 35) {
    structure += 15; // Acceptable sentence length
  }
  
  // 4. Content Organization (0-25 points)
  let organizationScore = 0;
  
  // Check for logical flow indicators
  if (/first|second|third|finally|in conclusion|to summarize/i.test(answer)) organizationScore += 10;
  if (/however|but|although|while|on the other hand/i.test(answer)) organizationScore += 5;
  if (/for example|such as|including|specifically/i.test(answer)) organizationScore += 5;
  if (/therefore|thus|as a result|consequently/i.test(answer)) organizationScore += 5;
  
  structure += Math.min(organizationScore, 25);
  
  // Cap structure at 100
  if (structure > 100) structure = 100;

  // Schema Presence
  let schema = /@type\s*[:=]\s*['"]?FAQPage['"]?/i.test(answer) || /@type\s*[:=]\s*['"]?FAQPage['"]?/i.test(content) ? 1 : 0;

  // Accessibility Score
  let access = 1;
  try {
    const robotsUrl = sourceUrl.replace(/\/$/, '') + '/robots.txt';
    const res = await axios.get(robotsUrl, { timeout: 2000 });
    if (/Disallow:\s*\//i.test(res.data)) access = 0;
  } catch (e) {
    access = 1; // If fetch fails, assume accessible
  }

  // Updated GEO Score formula using accuracy instead of aiConfidence
  const geoScore = 0.4 * accuracy + 0.2 * coverage + 0.2 * structure + 0.1 * schema * 100 + 0.1 * access * 100;
  return {
    geoScore: Math.round(geoScore),
    breakdown: { accuracy, coverage, structure, schema, access }
  };
}

// Helper function to calculate question similarity
function calculateQuestionSimilarity(question1: string, question2: string): number {
  // Convert to lowercase and split into words
  const words1 = question1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const words2 = question2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  // Calculate Jaccard similarity
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return union.length > 0 ? intersection.length / union.length : 0;
}

/**
 * Calculate answer accuracy using Gemini AI.
 * Returns a score from 0 to 100 based on how well the answer is supported by the content.
 */
export async function calculateAccuracyWithGemini(
  answer: string,
  content: string,
  apiKey: string,
  model: string = 'gemini-1.5-flash'
): Promise<number> {
  const prompt = `Rate how well the following answer is supported by the given content on a scale of 0 to 100, where 0 means not supported at all and 100 means fully supported.\n\nContent:\n${content}\n\nAnswer:\n${answer}\n\nRespond with ONLY a number between 0 and 100.`;
  const result = await callGeminiAPI(prompt, apiKey, model, false);
  const response = result.text.trim();
  const match = response.match(/\d+/);
  return match ? Math.min(Math.max(parseInt(match[0]), 0), 100) : 50;
}

/**
 * Applies Gemini suggestions to HTML code using DOM manipulation.
 * @param {string} htmlString - The original HTML code as a string.
 * @param {Array<{type: string, description: string, implementation: string, [key: string]: any}>} suggestions - List of suggestions from Gemini.
 * @returns {string} - The improved HTML code as a string.
 */
export function applySuggestionsWithDOM(
  htmlString: string,
  suggestions: Array<{type: string, description: string, implementation: string, exactReplacement?: {find: string, replace: string}, [key: string]: any}>,
  options?: { highlight?: boolean }
) {
  let appliedCount = 0;
  const appliedSuggestions: string[] = [];

  console.log('[Apply Suggestions] Starting to apply suggestions:', {
    htmlLength: htmlString.length,
    suggestionsCount: suggestions.length,
    suggestions: suggestions.map(s => ({ 
      type: s.type, 
      hasExactReplacement: !!s.exactReplacement,
      hasCurrentContent: !!s.currentContent,
      hasEnhancedContent: !!s.enhancedContent,
      currentContentPreview: s.currentContent?.substring(0, 100) + '...',
      enhancedContentPreview: s.enhancedContent?.substring(0, 100) + '...'
    }))
  });

  // First, apply exact replacements to the HTML string
  suggestions.forEach(suggestion => {
    try {
      if (suggestion.exactReplacement) {
        const { find, replace } = suggestion.exactReplacement;
        console.log(`[Apply Suggestions] Applying ${suggestion.type}:`, {
          find: find.substring(0, 100) + '...',
          replace: replace.substring(0, 100) + '...',
          found: htmlString.includes(find),
          findLength: find.length,
          replaceLength: replace.length
        });
        
        if (htmlString.includes(find)) {
          const beforeLength = htmlString.length;
          htmlString = htmlString.replace(find, replace);
          const afterLength = htmlString.length;
          appliedCount++;
          appliedSuggestions.push(`${suggestion.type} applied with exact replacement`);
          console.log(`[Apply Suggestions] Successfully applied ${suggestion.type}:`, {
            beforeLength,
            afterLength,
            lengthChanged: beforeLength !== afterLength,
            htmlChanged: htmlString !== htmlString
          });
        } else {
          console.log(`[Apply Suggestions] Could not find pattern for ${suggestion.type}:`, {
            searchPattern: find.substring(0, 200) + '...',
            htmlContainsPattern: htmlString.includes(find),
            htmlPreview: htmlString.substring(0, 500) + '...'
          });
          
          // Try alternative approaches for common suggestion types
          if (suggestion.type === 'sentence_replacement' && suggestion.currentContent && suggestion.enhancedContent) {
            console.log(`[Apply Suggestions] Trying alternative approach for ${suggestion.type}...`);
            const altFind = suggestion.currentContent.trim();
            const altReplace = suggestion.enhancedContent.trim();
            
            if (htmlString.includes(altFind)) {
              htmlString = htmlString.replace(altFind, altReplace);
              appliedCount++;
              appliedSuggestions.push(`${suggestion.type} applied with alternative pattern`);
              console.log(`[Apply Suggestions] Successfully applied ${suggestion.type} with alternative pattern`);
            } else {
              console.log(`[Apply Suggestions] Alternative pattern also not found for ${suggestion.type}`);
            }
          }
          
          // Try sentenceReplacement pattern if available
          if (suggestion.sentenceReplacement) {
            console.log(`[Apply Suggestions] Trying sentenceReplacement pattern for ${suggestion.type}...`);
            const { find: srFind, replace: srReplace } = suggestion.sentenceReplacement;
            
            if (htmlString.includes(srFind)) {
              htmlString = htmlString.replace(srFind, srReplace);
              appliedCount++;
              appliedSuggestions.push(`${suggestion.type} applied with sentenceReplacement pattern`);
              console.log(`[Apply Suggestions] Successfully applied ${suggestion.type} with sentenceReplacement pattern`);
            } else {
              console.log(`[Apply Suggestions] sentenceReplacement pattern also not found for ${suggestion.type}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to apply exact replacement for ${suggestion.type}:`, error);
    }
  });

  // Parse HTML string to DOM for additional improvements
  let doc;
  try {
    const parser = new window.DOMParser();
    doc = parser.parseFromString(htmlString, 'text/html');
    
    // Check for parsing errors
    if (doc.querySelector('parsererror')) {
      console.warn('[Apply Suggestions] HTML parsing errors detected, using fallback approach');
      // If parsing fails, return the original HTML with basic improvements
      return htmlString;
    }
  } catch (error) {
    console.error('[Apply Suggestions] Error parsing HTML:', error);
    // If parsing fails, return the original HTML with basic improvements
    return htmlString;
  }

  // Helper: replace text in existing text nodes only (structure-safe)
  const replaceInTextNodes = (root: Document | HTMLElement, findText: string, replaceText: string): number => {
    if (!findText || !replaceText) return 0;
    let count = 0;
    const walker = (root as Document).createTreeWalker ?
      (root as Document).createTreeWalker((root as Document).body || (root as unknown as HTMLElement), NodeFilter.SHOW_TEXT) :
      (doc as Document).createTreeWalker((root as Document).body || doc.body, NodeFilter.SHOW_TEXT);
    let node: any;
    while (node = walker.nextNode()) {
      if (node.textContent && node.textContent.includes(findText)) {
        node.textContent = node.textContent.replaceAll(findText, replaceText);
        if (options?.highlight && node.parentElement) {
          node.parentElement.setAttribute('data-ai-updated', 'true');
        }
        count++;
      }
    }
    return count;
  };

  // Preserve original CSS and styling
  const originalStyles = doc.querySelectorAll('style, link[rel="stylesheet"]');
  const originalScripts = doc.querySelectorAll('script');
  
  // Preserve original header and navigation structure
  const originalHeader = doc.querySelector('header, nav, .header, .navbar, .navigation');
  const originalFooter = doc.querySelector('footer, .footer');

  // Apply additional DOM-based improvements
  suggestions.forEach(suggestion => {
    try {
      // Skip if exact replacement was already applied
      if (suggestion.exactReplacement && htmlString.includes(suggestion.exactReplacement.replace)) {
        return;
      }

      // Handle different suggestion types with SAFE replacements only
      // Heading: update existing heading if currentContent matches; otherwise skip
      if (suggestion.type === 'heading') {
        const newHeading = (suggestion.enhancedContent || suggestion.implementation || '').trim();
        const currentHeading = (suggestion.currentContent || '').trim();
        if (newHeading.length > 0) {
          const headings = Array.from(doc.querySelectorAll('h1,h2,h3')) as HTMLElement[];
          let updated = false;
          headings.forEach(h => {
            const text = (h.textContent || '').trim();
            if ((currentHeading && text.includes(currentHeading)) || (!currentHeading && h.tagName.toLowerCase() === 'h1')) {
              h.textContent = newHeading;
              if (options?.highlight) h.setAttribute('data-ai-updated', 'true');
              updated = true;
            }
          });
          if (updated) {
            appliedCount++;
            appliedSuggestions.push('Heading updated');
          }
        }
      }
      
      // Paragraph: replace matching text within existing paragraphs only
      if (suggestion.type === 'paragraph') {
        const { currentContent, enhancedContent } = suggestion as any;
        if (currentContent && enhancedContent) {
          let replaced = false;
          const paragraphs = doc.querySelectorAll('p');
          paragraphs.forEach(p => {
            if (p.textContent && p.textContent.includes(currentContent)) {
              p.textContent = (p.textContent || '').replaceAll(currentContent, enhancedContent);
              if (options?.highlight) p.setAttribute('data-ai-updated', 'true');
              replaced = true;
            }
          });
          // also attempt deep replacement in text nodes
          if (!replaced) {
            replaced = replaceInTextNodes(doc, currentContent, enhancedContent) > 0;
          }
          if (replaced) {
            appliedCount++;
            appliedSuggestions.push('Paragraph content replaced');
          }
        }
      }
      
      // List: only replace text inside existing <li> items if a match is provided
      if (suggestion.type === 'list') {
        const { currentContent, enhancedContent } = suggestion as any;
        if (currentContent && enhancedContent) {
          const items = doc.querySelectorAll('li');
          let replaced = false;
          items.forEach(li => {
            if (li.textContent && li.textContent.includes(currentContent)) {
              li.textContent = li.textContent.replace(currentContent, enhancedContent);
              if (options?.highlight) (li as HTMLElement).setAttribute('data-ai-updated', 'true');
              replaced = true;
            }
          });
          if (!replaced) {
            replaced = replaceInTextNodes(doc, currentContent, enhancedContent) > 0;
          }
          if (replaced) {
            appliedCount++;
            appliedSuggestions.push('List item content replaced');
          }
        }
      }
      
      // Schema: skip DOM changes to avoid layout/script impact
      
      // Meta description
      if (suggestion.type === 'meta_description') {
        let meta = doc.querySelector('meta[name="description"]') as HTMLMetaElement;
        if (!meta) {
          meta = doc.createElement('meta');
          meta.name = 'description';
          doc.head.appendChild(meta);
        }
        const firstParagraph = doc.querySelector('p')?.textContent || '';
        meta.content = firstParagraph.substring(0, 160) || 'Improved meta description.';
        appliedCount++;
        appliedSuggestions.push('Meta description updated');
      }
      
      // Title improvements
    if (suggestion.type === 'title') {
      let title = doc.querySelector('title');
      if (!title) {
        title = doc.createElement('title');
        doc.head.appendChild(title);
      }
        const h1Text = doc.querySelector('h1')?.textContent;
        title.textContent = h1Text || 'Improved Title';
        appliedCount++;
        appliedSuggestions.push('Title updated');
      }
      
      // Meta keywords
      if (suggestion.type === 'meta_keywords') {
        let meta = doc.querySelector('meta[name="keywords"]') as HTMLMetaElement;
        if (!meta) {
          meta = doc.createElement('meta');
          meta.name = 'keywords';
          doc.head.appendChild(meta);
        }
        // Extract keywords from content
        const text = doc.body.textContent || '';
        const words = text.split(/\s+/).filter(word => word.length > 4);
        const keywordCounts = words.reduce((acc, word) => {
          acc[word.toLowerCase()] = (acc[word.toLowerCase()] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const topKeywords = Object.entries(keywordCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([word]) => word);
        meta.content = topKeywords.join(', ');
        appliedCount++;
        appliedSuggestions.push('Meta keywords updated');
      }
      
      // Meta viewport
      if (suggestion.type === 'meta_viewport') {
        let meta = doc.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        if (!meta) {
          meta = doc.createElement('meta');
          meta.name = 'viewport';
          doc.head.appendChild(meta);
        }
        meta.content = 'width=device-width, initial-scale=1.0';
        appliedCount++;
        appliedSuggestions.push('Meta viewport updated');
      }
      
      // Open Graph tags
      if (suggestion.type === 'og_title') {
        let meta = doc.querySelector('meta[property="og:title"]') as HTMLMetaElement;
        if (!meta) {
          meta = doc.createElement('meta');
          meta.setAttribute('property', 'og:title');
          doc.head.appendChild(meta);
        }
        meta.content = doc.querySelector('h1')?.textContent || doc.querySelector('title')?.textContent || '';
        appliedCount++;
        appliedSuggestions.push('Open Graph title added');
      }
      
      if (suggestion.type === 'og_description') {
        let meta = doc.querySelector('meta[property="og:description"]') as HTMLMetaElement;
        if (!meta) {
          meta = doc.createElement('meta');
          meta.setAttribute('property', 'og:description');
          doc.head.appendChild(meta);
        }
        meta.content = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        appliedCount++;
        appliedSuggestions.push('Open Graph description added');
      }
      
      // Canonical URL
      if (suggestion.type === 'canonical') {
        let link = doc.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!link) {
          link = doc.createElement('link');
          link.rel = 'canonical';
          doc.head.appendChild(link);
        }
        link.href = window.location.href;
        appliedCount++;
        appliedSuggestions.push('Canonical URL added');
      }
      
      // Language attribute
      if (suggestion.type === 'lang_attribute') {
        const html = doc.documentElement;
        html.lang = 'en';
        appliedCount++;
        appliedSuggestions.push('Language attribute updated');
      }
      
      // replace_b_with_strong: skipped to avoid structural changes

      // Keyword optimization for AI visibility
      if (suggestion.type === 'keyword_optimization') {
        // Safer: update meta keywords only, do not touch visible content
        const source = suggestion.enhancedContent || suggestion.implementation || '';
        const keywords = source.match(/Enhanced with keywords:\s*(.+)/i) || source.match(/Add keywords:\s*(.+)/i);
        if (keywords && keywords[1]) {
          let meta = doc.querySelector('meta[name="keywords"]') as HTMLMetaElement;
          if (!meta) {
            meta = doc.createElement('meta');
            meta.name = 'keywords';
            doc.head.appendChild(meta);
          }
          meta.content = keywords[1];
          appliedCount++;
          appliedSuggestions.push('Meta keywords updated');
        }
      }

      // Content enhancement for AI understanding
      if (suggestion.type === 'content_enhancement') {
        const paragraphs = doc.querySelectorAll('p');
        if (paragraphs.length > 0) {
          const targetParagraph = paragraphs[0];
          const enhancedText = suggestion.enhancedContent;
          
          if (enhancedText && enhancedText.length > 10) {
            // Replace the entire paragraph content, not just add to it
            targetParagraph.textContent = enhancedText;
            appliedCount++;
            appliedSuggestions.push('Content enhanced for AI understanding');
          }
        }
      }

      // Sentence replacement for better AI understanding
      if (suggestion.type === 'sentence_replacement') {
        const originalSentence = suggestion.currentContent;
        const improvedSentence = suggestion.enhancedContent;
        
        if (originalSentence && improvedSentence) {
          // Replace throughout the document, text nodes only
          const replacedCount = replaceInTextNodes(doc, originalSentence, improvedSentence);
          
          if (replacedCount > 0) {
            appliedCount++;
            appliedSuggestions.push('Sentence replaced for better AI understanding');
          }
        }
      }

      // AI-friendly content restructuring
      if (suggestion.type === 'ai_content_restructure') {
        const { currentContent, enhancedContent } = suggestion as any;
        if (currentContent && enhancedContent) {
          const replacedCount = replaceInTextNodes(doc, currentContent, enhancedContent);
          if (replacedCount > 0) {
            appliedCount++;
            appliedSuggestions.push('Content restructured');
          }
        }
      }
      
      // semantic_html: skipped to avoid adding elements
      
    } catch (error) {
      console.warn(`Failed to apply suggestion ${suggestion.type}:`, error);
    }
  });

  // Add non-visual summary and optional highlight style
  if (appliedCount > 0) {
    const summaryScript = doc.createElement('script');
    summaryScript.type = 'application/json';
    summaryScript.id = 'ai-change-summary';
    summaryScript.textContent = JSON.stringify({ appliedCount, appliedSuggestions });
    doc.head.appendChild(summaryScript);
  }

  // Ensure proper HTML structure and preserve styling
  let finalHtml = doc.documentElement.outerHTML;
  
  // Add viewport meta tag if missing to prevent layout issues
  if (!finalHtml.includes('viewport')) {
    const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    finalHtml = finalHtml.replace('</head>', `    ${viewportMeta}\n</head>`);
  }
  
  // If no suggestions were applied, add a visible change to ensure something is different
  if (appliedCount === 0) {
    console.log('[Apply Suggestions] No suggestions were applied, adding visible change...');
    const visibleChange = `
      <div style="
        background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
        padding: 20px;
        margin: 20px;
        border-left: 6px solid #f39c12;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
        position: relative;
        z-index: 1000;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
          <strong style="font-size: 18px; color: #d68910;">AI Suggestions Generated</strong>
        </div>
        <p style="margin: 0; color: #856404; font-size: 16px;">
          <strong>${suggestions.length} AI suggestions</strong> were generated but could not be automatically applied to this page. 
          The suggestions are available in the suggestions panel for manual review and implementation.
        </p>
        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 4px;">
          <strong style="color: #d68910;">Available Suggestions:</strong>
          <ul style="margin: 5px 0 0 20px; color: #856404;">
            ${suggestions.slice(0, 3).map(s => `<li>${s.type}: ${s.description}</li>`).join('')}
            ${suggestions.length > 3 ? `<li>... and ${suggestions.length - 3} more suggestions</li>` : ''}
          </ul>
        </div>
      </div>
    `;
    
    if (finalHtml.includes('<body>')) {
      finalHtml = finalHtml.replace('<body>', '<body>\n' + visibleChange);
    } else {
      finalHtml = visibleChange + '\n' + finalHtml;
    }
    
    appliedCount = 1;
    appliedSuggestions.push('Added visible notification for unapplied suggestions');
    console.log('[Apply Suggestions] Added visible change for unapplied suggestions');
  }
  
  console.log('[Apply Suggestions] Final result:', {
    originalHtmlLength: htmlString.length,
    finalHtmlLength: finalHtml.length,
    appliedCount,
    appliedSuggestions,
    htmlChanged: finalHtml !== htmlString,
    lengthChanged: finalHtml.length !== htmlString.length
  });
  
  // Ensure proper DOCTYPE
  if (!finalHtml.includes('<!DOCTYPE html>')) {
    finalHtml = '<!DOCTYPE html>\n' + finalHtml;
  }
  
  if (options?.highlight) {
    const style = doc.createElement('style');
    style.textContent = `
    [data-ai-updated="true"] { background: #ecfdf5 !important; outline: 2px solid #10b98133; }
    `;
    doc.head.appendChild(style);
  }

  return finalHtml;
}

// Compute a heuristic LLM understandability score for an HTML document
export function scoreLLMUnderstandability(html: string): { score: number; breakdown: Record<string, number> } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');

    let score = 0;
    const breakdown: Record<string, number> = {};

    // Headings structure (0-20)
    const h1 = doc.querySelectorAll('h1').length;
    const h2 = doc.querySelectorAll('h2').length;
    const h3 = doc.querySelectorAll('h3').length;
    let headingScore = 0;
    if (h1 === 1) headingScore += 10; // exactly one h1
    if (h2 >= 2) headingScore += 6;   // multiple sections
    if (h3 >= 2) headingScore += 4;   // sub‑sections
    score += headingScore; breakdown.headings = headingScore;

    // Meta description (0-10)
    const metaDesc = doc.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    let metaScore = 0;
    const len = metaDesc?.content?.length || 0;
    if (len >= 50 && len <= 160) metaScore = 10; else if (len > 0) metaScore = 6;
    score += metaScore; breakdown.metaDescription = metaScore;

    // Schema (FAQ/Article) (0-15)
    let schemaScore = 0;
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    if (scripts.length > 0) {
      const hasUseful = scripts.some(s => /"@type"\s*:\s*"(Article|FAQPage)"/i.test(s.textContent || ''));
      schemaScore = hasUseful ? 15 : 8;
    }
    score += schemaScore; breakdown.schema = schemaScore;

    // Readability by average sentence length (0-20)
    const text = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
    const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(Boolean);
    const avgSentence = sentences.length ? words.length / sentences.length : 0;
    let readabilityScore = 0;
    if (avgSentence > 8 && avgSentence < 25) readabilityScore = 20;
    else if (avgSentence > 6 && avgSentence < 30) readabilityScore = 14;
    else if (avgSentence > 4 && avgSentence < 35) readabilityScore = 10;
    score += readabilityScore; breakdown.readability = readabilityScore;

    // Lists (0-5)
    const hasLists = doc.querySelector('ul,ol,dl') ? 5 : 0;
    score += hasLists; breakdown.lists = hasLists;

    // Image alt coverage (0-10)
    const imgs = Array.from(doc.querySelectorAll('img'));
    let altScore = 0;
    if (imgs.length > 0) {
      const withAlt = imgs.filter(i => (i.getAttribute('alt') || '').trim().length > 0).length;
      const ratio = withAlt / imgs.length;
      if (ratio >= 0.9) altScore = 10; else if (ratio >= 0.6) altScore = 6; else if (ratio > 0) altScore = 3;
    } else {
      altScore = 5; // neutral for pages without images
    }
    score += altScore; breakdown.altText = altScore;

    // Open Graph / canonical / lang (0-10)
    let misc = 0;
    if (doc.querySelector('meta[property="og:title"]')) misc += 3;
    if (doc.querySelector('meta[property="og:description"]')) misc += 3;
    if (doc.querySelector('link[rel="canonical"]')) misc += 2;
    if (doc.documentElement.lang) misc += 2;
    score += misc; breakdown.metadata = misc;

    // Content density (0-10)
    const paragraphs = Array.from(doc.querySelectorAll('p')).filter(p => (p.textContent || '').trim().length > 60);
    let density = 0;
    const contentLen = text.length;
    if (contentLen > 2000) density += 5; else if (contentLen > 800) density += 3;
    if (paragraphs.length >= 5) density += 5; else if (paragraphs.length >= 3) density += 3;
    score += density; breakdown.contentDensity = density;

    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score, breakdown };
  } catch {
    return { score: 50, breakdown: { error: 1 } };
  }
}