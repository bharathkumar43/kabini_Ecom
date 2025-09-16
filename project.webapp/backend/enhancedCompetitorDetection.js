const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// API Keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

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

// Enhanced Method 1: Industry-specific competitor search with parallel queries
async function searchIndustryCompetitors(companyName, industry = '') {
  try {
    console.log(`   📰 Method 1: Industry-specific competitor search for "${companyName}"`);
    
    // More specific industry-focused queries
    const searchQueries = [
      `${companyName} competitors ${industry}`,
      `${companyName} vs ${industry} companies`,
      `${companyName} ${industry} market competitors`,
      `${companyName} ${industry} industry rivals`,
      `${companyName} ${industry} alternative companies`,
      `${companyName} ${industry} competing businesses`
    ];
    
    console.log(`   🚀 Running ${searchQueries.length} industry queries in parallel...`);
    
    // Run all queries in parallel
    const queryPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`   🔍 Industry query ${index + 1}: "${query}"`);
        
        const searchResults = await queryCustomSearchAPI(query);
        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);
        return searchResults;
      } catch (error) {
        console.error(`   ❌ Industry query ${index + 1} failed:`, error.message);
        return [];
      }
    });
    
    // Wait for all queries to complete
    const allSearchResults = await Promise.all(queryPromises);
    
    // Flatten results
    const flattenedResults = allSearchResults.flat();
    console.log(`   📊 Total industry results: ${flattenedResults.length}`);
    
    const competitors = await extractCompetitorNamesEnhanced(companyName, flattenedResults, industry);
    console.log(`   🎯 Extracted ${competitors.length} competitors from industry search:`, competitors);
    return competitors;
  } catch (error) {
    console.error('❌ Industry search error:', error.message);
    return [];
  }
}

// Enhanced Method 2: Direct competitor search with parallel queries
async function searchDirectCompetitors(companyName) {
  try {
    console.log(`   🎯 Method 2: Direct competitor search for "${companyName}"`);
    
    // Direct competitor-focused queries
    const searchQueries = [
      `${companyName} competitors`,
      `${companyName} vs`,
      `${companyName} alternatives`,
      `${companyName} rivals`,
      `${companyName} competing companies`,
      `${companyName} similar companies`
    ];
    
    console.log(`   🚀 Running ${searchQueries.length} direct competitor queries in parallel...`);
    
    // Run all queries in parallel
    const queryPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`   🔍 Direct competitor query ${index + 1}: "${query}"`);
        
        const searchResults = await queryCustomSearchAPI(query);
        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);
        return searchResults;
      } catch (error) {
        console.error(`   ❌ Direct competitor query ${index + 1} failed:`, error.message);
        return [];
      }
    });
    
    // Wait for all queries to complete
    const allSearchResults = await Promise.all(queryPromises);
    
    // Flatten results
    const flattenedResults = allSearchResults.flat();
    console.log(`   📊 Total direct competitor results: ${flattenedResults.length}`);
    
    const competitors = await extractCompetitorNamesEnhanced(companyName, flattenedResults);
    console.log(`   🎯 Extracted ${competitors.length} direct competitors:`, competitors);
    return competitors;
  } catch (error) {
    console.error('❌ Direct competitor search error:', error.message);
    return [];
  }
}

// Enhanced Method 3: Market analysis search with parallel queries
async function searchMarketAnalysis(companyName, industry = '') {
  try {
    console.log(`   📊 Method 3: Market analysis search for "${companyName}"`);
    
    // Market analysis focused queries
    const searchQueries = [
      `${companyName} market analysis`,
      `${companyName} industry report`,
      `${companyName} competitive landscape`,
      `${companyName} market share`,
      `${companyName} industry overview`,
      `${companyName} market competitors`
    ];
    
    console.log(`   🚀 Running ${searchQueries.length} market analysis queries in parallel...`);
    
    // Run all queries in parallel
    const queryPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`   🔍 Market analysis query ${index + 1}: "${query}"`);
        
        const searchResults = await queryCustomSearchAPI(query);
        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);
        return searchResults;
      } catch (error) {
        console.error(`   ❌ Market analysis query ${index + 1} failed:`, error.message);
        return [];
      }
    });
    
    // Wait for all queries to complete
    const allSearchResults = await Promise.all(queryPromises);
    
    // Flatten results
    const flattenedResults = allSearchResults.flat();
    console.log(`   📊 Total market analysis results: ${flattenedResults.length}`);
    
    const competitors = await extractCompetitorNamesEnhanced(companyName, flattenedResults, industry);
    console.log(`   🎯 Extracted ${competitors.length} competitors from market analysis:`, competitors);
    return competitors;
  } catch (error) {
    console.error('❌ Market analysis search error:', error.message);
    return [];
  }
}

// Enhanced competitor name extraction with better AI prompt
async function extractCompetitorNamesEnhanced(companyName, searchResults, industry = '') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const searchText = searchResults.map(item => `${item.name}: ${item.snippet}`).join('\n\n');
  
  // Enhanced prompt for more accurate competitor extraction
  const prompt = `You are a business analyst specializing in competitive intelligence. Analyze these search results and extract ONLY the direct competitor company names for "${companyName}"${industry ? ` in the ${industry} industry` : ''}.

CRITICAL INSTRUCTIONS:
1. Focus ONLY on companies that directly compete with ${companyName} in the same market
2. Exclude ${companyName} itself from the results
3. Exclude generic terms like "competitors", "companies", "businesses", "solutions"
4. Exclude companies that are partners, suppliers, or complementary services
5. Only include companies that offer similar products/services to ${companyName}
6. Return ONLY a JSON array of company names, no explanations
7. Ensure all company names are real, established businesses

Search results to analyze:
${searchText}

Return format: ["Company1", "Company2", "Company3"]`;

  console.log(`   🤖 Extracting competitors using enhanced AI for "${companyName}"`);
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
    
    const competitors = JSON.parse(cleanedResponse);
    const validCompetitors = Array.isArray(competitors) ? competitors : [];
    
    console.log(`   ✅ Enhanced AI extracted ${validCompetitors.length} competitors`);
    return validCompetitors;
  } catch (error) {
    console.error('❌ Failed to parse competitor names:', error.message);
    console.error('Raw response:', response);
    return [];
  }
}

// Enhanced competitor validation with parallel processing
async function validateCompetitorsEnhanced(companyName, competitorNames, industry = '') {
  if (!GEMINI_API_KEY) {
    console.log(`   ⚠️ No Gemini API key, returning top 10 competitors without validation`);
    return competitorNames.slice(0, 10);
  }
  
  console.log(`   🤖 Enhanced validation for ${competitorNames.length} competitors of "${companyName}" in parallel...`);
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Process all competitors in parallel
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
      
      console.log(`   [DEBUG] ${competitor} scored ${score}/100 - ${score >= 60 ? 'VALID' : 'REJECTED'}`);
      
      return {
        competitor,
        score,
        isValid: score >= 60,
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

// Main enhanced competitor detection function with parallel processing
async function detectCompetitorsEnhanced(companyName, industry = '') {
  console.log('\n🔍 Starting ENHANCED competitor detection with PARALLEL processing...');
  console.log(`🎯 Target company: "${companyName}"`);
  console.log(`📊 Industry context: "${industry || 'Not specified'}"`);
  
  const allCompetitors = new Map();
  const methodResults = {};
  
  // Run all 3 detection methods in parallel for maximum speed
  console.log('🚀 Launching all detection methods simultaneously...');
  
  const detectionPromises = [
    // Method 1: Industry-specific competitor search
    (async () => {
      console.log('\n📰 Method 1: Industry-specific competitor search...');
      try {
        const competitors = await searchIndustryCompetitors(companyName, industry);
        methodResults.industrySearch = competitors;
        console.log(`   ✅ Found ${competitors.length} competitors via industry search:`, competitors);
        return { method: 'industrySearch', competitors };
      } catch (error) {
        console.error(`   ❌ Industry search failed:`, error.message);
        return { method: 'industrySearch', competitors: [] };
      }
    })(),
    
    // Method 2: Direct competitor analysis
    (async () => {
      console.log('\n🎯 Method 2: Direct competitor analysis...');
      try {
        const competitors = await searchDirectCompetitors(companyName);
        methodResults.directCompetitors = competitors;
        console.log(`   ✅ Found ${competitors.length} direct competitors:`, competitors);
        return { method: 'directCompetitors', competitors };
      } catch (error) {
        console.error(`   ❌ Direct competitor search failed:`, error.message);
        return { method: 'directCompetitors', competitors: [] };
      }
    })(),
    
    // Method 3: Market analysis search
    (async () => {
      console.log('\n📊 Method 3: Market analysis search...');
      try {
        const competitors = await searchMarketAnalysis(companyName, industry);
        methodResults.marketAnalysis = competitors;
        console.log(`   ✅ Found ${competitors.length} competitors via market analysis:`, competitors);
        return { method: 'marketAnalysis', competitors };
      } catch (error) {
        console.error(`   ❌ Market analysis failed:`, error.message);
        return { method: 'marketAnalysis', competitors: [] };
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
      result.competitors.forEach(comp => {
        allCompetitors.set(comp, (allCompetitors.get(comp) || 0) + 1);
      });
    }
  });
  
  // Combine results and rank by frequency
  console.log('\n📊 Combining results from all methods...');
  console.log('📈 Method results:', methodResults);
  
  const totalUniqueCompetitors = allCompetitors.size;
  console.log(`📊 Total unique competitors found: ${totalUniqueCompetitors}`);
  console.log('📈 Frequency map:', Object.fromEntries(allCompetitors));
  
  // Rank competitors by frequency
  const rankedCompetitors = Array.from(allCompetitors.entries())
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
  
  console.log('📈 Ranked competitors by frequency:');
  rankedCompetitors.forEach((comp, index) => {
    console.log(`   ${index + 1}. ${comp.name} (frequency: ${comp.frequency})`);
  });
  
  // Show detailed method breakdown
  console.log('📊 Detailed method breakdown:');
  rankedCompetitors.forEach(comp => {
    const methods = [];
    if (methodResults.industrySearch?.includes(comp.name)) methods.push('industrySearch');
    if (methodResults.directCompetitors?.includes(comp.name)) methods.push('directCompetitors');
    if (methodResults.marketAnalysis?.includes(comp.name)) methods.push('marketAnalysis');
    console.log(`   - ${comp.name}: found by ${methods.join(', ')}`);
  });
  
  const competitorNames = rankedCompetitors.map(c => c.name);
  
  // Enhanced validation with parallel processing
  console.log('\n✅ Enhanced validation with parallel processing...');
  const validatedCompetitors = await validateCompetitorsEnhanced(companyName, competitorNames, industry);
  console.log(`🎯 Final validated competitors:`, validatedCompetitors);
  
  // No fallback competitors - return only detected and validated competitors
  return validatedCompetitors;
}

module.exports = {
  detectCompetitorsEnhanced,
  searchIndustryCompetitors,
  searchDirectCompetitors,
  searchMarketAnalysis,
  validateCompetitorsEnhanced,
  extractCompetitorNamesEnhanced,
  queryCustomSearchAPI
}; 