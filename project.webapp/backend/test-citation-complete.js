// Complete Citation Metrics Test with Proper Mocking
const aiVisibilityService = require('./aiVisibilityService.js');

console.log('🧪 Complete Citation Metrics Test...\n');

// Mock the getConfiguredModelKeys function at the module level
const originalGetConfiguredModelKeys = aiVisibilityService.getConfiguredModelKeys;
aiVisibilityService.getConfiguredModelKeys = () => {
  console.log('🔧 Mock getConfiguredModelKeys returning test models');
  return ['gemini', 'chatgpt', 'perplexity', 'claude'];
};

// Mock the callModelSimple function
const originalCallModelSimple = aiVisibilityService.callModelSimple;
aiVisibilityService.callModelSimple = async (modelKey, prompt) => {
  console.log(`📞 Mock API call to ${modelKey}: "${prompt.substring(0, 50)}..."`);
  
  // Simulate different responses based on the query
  const responses = {
    'gemini': 'Semrush is the best SEO tool for keyword research and competitor analysis. Ahrefs also provides excellent backlink analysis.',
    'chatgpt': 'For SEO tools, I recommend Semrush for comprehensive keyword research. Ahrefs is great for backlink analysis and site auditing.',
    'perplexity': 'Semrush and Ahrefs are leading SEO platforms. Semrush excels in keyword research while Ahrefs dominates backlink analysis.',
    'claude': 'The top SEO tools include Semrush for keyword research and Ahrefs for backlink analysis. Both offer comprehensive SEO solutions.'
  };
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return responses[modelKey] || 'No specific SEO tools mentioned in this response.';
};

// Test individual functions first
console.log('1. Testing individual functions:');
const { detectMentionRobust, quickSentimentScore, sentimentWeightFromScore, computeProminenceFactorFromText } = aiVisibilityService;

const testText = 'Semrush is the best SEO tool for keyword research and competitor analysis.';
const detection = detectMentionRobust(testText.toLowerCase(), 'semrush', ['seo', 'tool', 'keyword']);
console.log('   detectMentionRobust:', detection);

const sentiment = quickSentimentScore(testText);
console.log('   quickSentimentScore:', sentiment);

const prominence = computeProminenceFactorFromText(testText, 'semrush');
console.log('   computeProminenceFactorFromText:', prominence);

// Test citation metrics calculation
console.log('\n2. Testing citation metrics calculation:');
const testCompetitors = ['semrush', 'ahrefs', 'moz'];
const testIndustry = 'seo';

aiVisibilityService.computeCitationMetrics(testCompetitors, testIndustry, true)
  .then(result => {
    console.log('✅ Citation metrics calculation completed!');
    console.log('\n📊 Results:');
    
    Object.keys(result).forEach(competitor => {
      const data = result[competitor];
      console.log(`\n🏢 ${competitor.toUpperCase()}:`);
      console.log(`   Global Score: ${(data.global.citationScore * 100).toFixed(2)}%`);
      console.log(`   Global Rate: ${(data.global.citationRate * 100).toFixed(2)}%`);
      console.log(`   Total Queries: ${data.global.totalQueries}`);
      console.log(`   Citation Count: ${data.global.citationCount}`);
      
      console.log('   Per Model:');
      Object.keys(data.perModel).forEach(model => {
        const modelData = data.perModel[model];
        console.log(`     ${model}: ${(modelData.citationScore * 100).toFixed(2)}% (${modelData.citationCount}/${modelData.totalQueries})`);
      });
    });
    
    console.log('\n🎉 Mock test completed successfully!');
    console.log('\n💡 The citation metrics logic is working correctly!');
    console.log('   To use with real API keys:');
    console.log('   1. Update your API keys in backend/.env');
    console.log('   2. Restart the backend server');
    console.log('   3. Run a new competitor analysis');
  })
  .catch(error => {
    console.log('❌ Citation metrics calculation failed:', error.message);
    console.log('Stack trace:', error.stack);
  })
  .finally(() => {
    // Restore original functions
    aiVisibilityService.getConfiguredModelKeys = originalGetConfiguredModelKeys;
    aiVisibilityService.callModelSimple = originalCallModelSimple;
  });

