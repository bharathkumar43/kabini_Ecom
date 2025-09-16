// Import the functions properly
const aiVisibilityService = require('./aiVisibilityService.js');
const { getConfiguredModelKeys, callModelSimple, computeCitationMetrics } = aiVisibilityService;

console.log('Testing Citation Metrics...\n');

// Test 1: Check configured model keys
console.log('1. Testing getConfiguredModelKeys():');
const modelKeys = getConfiguredModelKeys();
console.log('Configured models:', modelKeys);
console.log('Number of models:', modelKeys.length);

if (modelKeys.length === 0) {
  console.log('❌ No models configured! This is why citation metrics are 0.');
  process.exit(1);
}

// Test 2: Test a simple API call
console.log('\n2. Testing API call for first model:');
const firstModel = modelKeys[0];
console.log(`Testing model: ${firstModel}`);

callModelSimple(firstModel, 'Answer briefly: What is the best SEO tool?')
  .then(response => {
    console.log('✅ API call successful!');
    console.log('Response length:', response.length);
    console.log('Response preview:', response.substring(0, 100) + '...');
  })
  .catch(error => {
    console.log('❌ API call failed:', error.message);
  });

// Test 3: Test citation metrics calculation
console.log('\n3. Testing citation metrics calculation:');

const testCompetitors = ['semrush', 'ahrefs'];
const testIndustry = 'seo';

computeCitationMetrics(testCompetitors, testIndustry, true)
  .then(result => {
    console.log('✅ Citation metrics calculation completed!');
    console.log('Result:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.log('❌ Citation metrics calculation failed:', error.message);
  });
