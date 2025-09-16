// Test Citation Metrics with Real API Keys
const aiVisibilityService = require('./aiVisibilityService.js');

console.log('🔑 Testing Citation Metrics with Real API Keys...\n');

// Check current API key status
console.log('1. Checking API key status:');
const modelKeys = aiVisibilityService.getConfiguredModelKeys();
console.log('   Configured models:', modelKeys);
console.log('   Number of models:', modelKeys.length);

if (modelKeys.length === 0) {
  console.log('\n❌ No API keys configured!');
  console.log('\n📝 To fix this:');
  console.log('   1. Open backend/.env');
  console.log('   2. Replace placeholder values with real API keys:');
  console.log('      GEMINI_API_KEY=your_actual_gemini_key');
  console.log('      OPENAI_API_KEY=your_actual_openai_key');
  console.log('      PERPLEXITY_API_KEY=your_actual_perplexity_key');
  console.log('      ANTHROPIC_API_KEY=your_actual_anthropic_key');
  console.log('   3. Restart the backend server');
  console.log('   4. Run this test again');
  process.exit(1);
}

// Test with real API keys
console.log('\n2. Testing with real API keys:');
const testCompetitors = ['semrush', 'ahrefs'];
const testIndustry = 'seo';

console.log('   This will make real API calls to:');
modelKeys.forEach(model => console.log(`     - ${model}`));
console.log('   ⚠️  This may take 30-60 seconds...\n');

aiVisibilityService.computeCitationMetrics(testCompetitors, testIndustry, true)
  .then(result => {
    console.log('✅ Real API citation metrics completed!');
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
    
    console.log('\n🎉 Real API test completed successfully!');
    console.log('   The citation metrics are now working with real data!');
  })
  .catch(error => {
    console.log('❌ Real API test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if API keys are valid');
    console.log('   2. Check internet connection');
    console.log('   3. Check API rate limits');
    console.log('   4. Check API key permissions');
  });

