#!/usr/bin/env node

require('dotenv').config();

// Simulate the getConfiguredModelKeys function
function getConfiguredModelKeys() {
  const keys = [];
  if (process.env.OPENAI_API_KEY) keys.push('chatgpt');
  if (process.env.GEMINI_API_KEY) keys.push('gemini');
  if (process.env.ANTHROPIC_API_KEY) keys.push('claude');
  if (process.env.PERPLEXITY_API_KEY) keys.push('perplexity');
  return keys;
}

console.log('🔍 Testing Model Key Configuration...\n');

console.log('📋 API Key Status:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');
console.log('PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? 'SET' : 'NOT SET');

console.log('\n📋 API Key Values (first 20 chars):');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? process.env.PERPLEXITY_API_KEY.substring(0, 20) + '...' : 'NOT SET');

console.log('\n🤖 Configured Model Keys:', getConfiguredModelKeys());

// Check if keys are placeholder values
const isPlaceholder = (key) => {
  return key && (
    key.includes('your_') || 
    key.includes('_here') ||
    key === 'your_openai_api_key_here' ||
    key === 'your_gemini_api_key_here' ||
    key === 'your_anthropic_api_key_here' ||
    key === 'your_perplexity_api_key_here'
  );
};

console.log('\n🚨 Placeholder Detection:');
console.log('OPENAI_API_KEY is placeholder:', isPlaceholder(process.env.OPENAI_API_KEY));
console.log('GEMINI_API_KEY is placeholder:', isPlaceholder(process.env.GEMINI_API_KEY));
console.log('ANTHROPIC_API_KEY is placeholder:', isPlaceholder(process.env.ANTHROPIC_API_KEY));
console.log('PERPLEXITY_API_KEY is placeholder:', isPlaceholder(process.env.PERPLEXITY_API_KEY));

