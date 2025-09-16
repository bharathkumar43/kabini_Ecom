// Quick API Key Test - Run this after adding your API keys
const aiVisibilityService = require('./aiVisibilityService.js');

console.log('🔑 Quick API Key Test\n');

// Test 1: Check configured model keys
console.log('1. Checking API key configuration:');
const modelKeys = aiVisibilityService.getConfiguredModelKeys();
console.log('   Configured models:', modelKeys);
console.log('   Number of models:', modelKeys.length);

if (modelKeys.length === 0) {
  console.log('\n❌ STILL NO API KEYS CONFIGURED!');
  console.log('\n📝 You need to:');
  console.log('   1. Get real API keys from:');
  console.log('      - Gemini: https://aistudio.google.com/');
  console.log('      - OpenAI: https://platform.openai.com/');
  console.log('      - Perplexity: https://www.perplexity.ai/');
  console.log('      - Anthropic: https://console.anthropic.com/');
  console.log('   2. Update backend/.env with real keys');
  console.log('   3. Restart the backend server');
  console.log('   4. Run this test again');
  process.exit(1);
}

console.log('\n✅ API KEYS ARE CONFIGURED!');
console.log('   Models available:', modelKeys.join(', '));

// Test 2: Quick citation test
console.log('\n2. Testing citation calculation:');
const testCompetitors = ['semrush', 'ahrefs'];
const testIndustry = 'seo';

console.log('   This will make real API calls...');
console.log('   ⚠️  This may take 30-60 seconds...\n');

aiVisibilityService.computeCitationMetrics(testCompetitors, testIndustry, true)
  .then(result => {
    console.log('✅ SUCCESS! Citation metrics are working!');
    console.log('\n📊 Sample Results:');
    
    Object.keys(result).forEach(competitor => {
      const data = result[competitor];
      console.log(`\n🏢 ${competitor.toUpperCase()}:`);
      console.log(`   Global Score: ${(data.global.citationScore * 100).toFixed(2)}%`);
      console.log(`   Citation Rate: ${(data.global.citationRate * 100).toFixed(2)}%`);
    });
    
    console.log('\n🎉 AI Citation Metrics are now working!');
    console.log('   Go to your frontend and run a new analysis.');
    console.log('   You should see real scores instead of 0.0%');
  })
  .catch(error => {
    console.log('❌ API test failed:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('   1. API keys are invalid');
    console.log('   2. No internet connection');
    console.log('   3. API rate limits exceeded');
    console.log('   4. API service is down');
  });

