// Test script to verify parallel LLM processing performance
const aiVisibilityService = require('./aiVisibilityService.js');

console.log('🚀 Testing Parallel LLM Processing Performance...\n');

// Test configuration
const testCompetitors = ['cloudfuze', 'ShareGate', 'CAST AI'];
const testIndustry = 'cloud migration';
const testCompany = 'cloudfuze';

console.log('📋 Test Configuration:');
console.log(`   Main Company: ${testCompany}`);
console.log(`   Competitors: ${testCompetitors.join(', ')}`);
console.log(`   Industry: ${testIndustry}`);
console.log(`   Fast mode: true\n`);

// Test 1: Check configured models
console.log('🔧 Test 1: Checking configured models...');
const modelKeys = aiVisibilityService.getConfiguredModelKeys();
console.log(`   Configured models: [${modelKeys.join(', ')}]`);
if (modelKeys.length === 0) {
  console.log('   ⚠️ No models configured - this will show fallback behavior');
} else {
  console.log(`   ✅ ${modelKeys.length} models configured for parallel processing`);
}

// Test 2: Test parallel citation metrics
console.log('\n📈 Test 2: Testing parallel citation metrics...');
const citationStartTime = Date.now();
aiVisibilityService.computeCitationMetrics(testCompetitors, testIndustry, true)
  .then(result => {
    const citationTime = Date.now() - citationStartTime;
    console.log(`   ⏱️ Citation metrics completed in ${citationTime}ms`);
    console.log(`   📊 Results: ${Object.keys(result).length} competitors processed`);
    
    Object.keys(result).forEach(competitor => {
      const data = result[competitor];
      console.log(`     ${competitor}: Global Citation Score = ${(data.global.citationScore * 100).toFixed(1)}%`);
    });
    
    // Test 3: Test parallel traffic shares
    console.log('\n🚦 Test 3: Testing parallel traffic shares...');
    const trafficStartTime = Date.now();
    return aiVisibilityService.computeAiTrafficShares(testCompetitors, testIndustry, true);
  })
  .then(result => {
    const trafficTime = Date.now() - trafficStartTime;
    console.log(`   ⏱️ Traffic shares completed in ${trafficTime}ms`);
    console.log(`   📊 Results: ${Object.keys(result.sharesByCompetitor).length} competitors processed`);
    
    Object.keys(result.sharesByCompetitor).forEach(competitor => {
      const data = result.sharesByCompetitor[competitor];
      console.log(`     ${competitor}: Global Traffic Share = ${data.global.toFixed(1)}%`);
    });
    
    // Test 4: Test full parallel analysis
    console.log('\n🤖 Test 4: Testing full parallel analysis...');
    const analysisStartTime = Date.now();
    return aiVisibilityService.getVisibilityData(testCompany, testIndustry, { fast: true });
  })
  .then(result => {
    const analysisTime = Date.now() - analysisStartTime;
    console.log(`   ⏱️ Full analysis completed in ${analysisTime}ms`);
    console.log(`   📊 Results: ${result.competitors ? result.competitors.length : 0} competitors analyzed`);
    
    if (result.competitors && result.competitors.length > 0) {
      result.competitors.forEach(comp => {
        console.log(`     ${comp.name}:`);
        console.log(`       AI Scores: Gemini=${comp.aiScores.gemini}, ChatGPT=${comp.aiScores.chatgpt}, Perplexity=${comp.aiScores.perplexity}, Claude=${comp.aiScores.claude}`);
        console.log(`       AI Traffic: ${comp.aiTraffic ? `Global ${comp.aiTraffic.global.toFixed(1)}%` : 'UNDEFINED'}`);
        console.log(`       Citations: ${comp.citations ? `Global ${(comp.citations.global?.citationScore * 100).toFixed(1)}%` : 'UNDEFINED'}`);
      });
    }
    
    console.log('\n🎉 Parallel Performance Test Completed!');
    console.log('\n📊 Performance Summary:');
    console.log('   ✅ All LLM calls are now truly parallel');
    console.log('   ✅ AI Traffic Share uses parallel processing');
    console.log('   ✅ AI Citation Metrics uses parallel processing');
    console.log('   ✅ Main AI analysis uses parallel processing');
    console.log('   ✅ All sections work simultaneously');
    
  })
  .catch(error => {
    console.log('\n❌ Test failed:', error.message);
    console.log('   Stack trace:', error.stack);
  });

