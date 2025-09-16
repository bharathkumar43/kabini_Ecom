// Test script to verify backend logging is working
const aiVisibilityService = require('./aiVisibilityService.js');

console.log('🧪 Testing backend logging for competitor insight page...\n');

// Test with a small set of competitors
const testCompetitors = ['cloudfuze', 'ShareGate'];
const testIndustry = 'cloud migration';

console.log('📋 Test Configuration:');
console.log(`   Competitors: ${testCompetitors.join(', ')}`);
console.log(`   Industry: ${testIndustry}`);
console.log(`   Fast mode: true\n`);

// Test the main function
aiVisibilityService.getVisibilityData('cloudfuze', testIndustry, { fast: true })
  .then(result => {
    console.log('\n🎉 Test completed successfully!');
    console.log('📊 Result summary:');
    
    if (result && result.competitors) {
      result.competitors.forEach(comp => {
        console.log(`   ${comp.name}:`);
        console.log(`     AI Traffic: ${comp.aiTraffic ? `Global ${comp.aiTraffic.global.toFixed(1)}%` : 'UNDEFINED'}`);
        console.log(`     Citations: ${comp.citations ? `Global ${(comp.citations.global?.citationScore * 100).toFixed(1)}%` : 'UNDEFINED'}`);
      });
    } else {
      console.log('   No competitor data found');
    }
  })
  .catch(error => {
    console.log('\n❌ Test failed:', error.message);
    console.log('   Stack trace:', error.stack);
  });

