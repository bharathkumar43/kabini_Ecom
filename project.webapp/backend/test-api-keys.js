#!/usr/bin/env node

// Test script to verify API key configuration and test API calls
require('dotenv').config();

const axios = require('axios');

console.log('🔍 Testing API Key Configuration...\n');

// Check environment variables
const apiKeys = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};

console.log('📋 API Key Status:');
Object.entries(apiKeys).forEach(([key, value]) => {
  const status = value && value !== `your_${key.toLowerCase()}_here` ? '✅ SET' : '❌ NOT SET';
  const displayValue = value ? `${value.substring(0, 10)}...` : 'Not configured';
  console.log(`   ${key}: ${status} (${displayValue})`);
});

console.log('\n🧪 Testing API Calls...\n');

// Test ChatGPT
async function testChatGPT() {
  if (!apiKeys.OPENAI_API_KEY || apiKeys.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.log('❌ ChatGPT: API key not configured');
    return;
  }
  
  try {
    console.log('🤖 Testing ChatGPT (gpt-3.5-turbo)...');
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello" in one word.' }
      ],
      max_tokens: 10
    }, { 
      headers: { 'Authorization': `Bearer ${apiKeys.OPENAI_API_KEY}` },
      timeout: 10000
    });
    
    const content = response.data?.choices?.[0]?.message?.content || '';
    console.log(`   ✅ ChatGPT Response: "${content.trim()}"`);
  } catch (error) {
    console.log(`   ❌ ChatGPT Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Test Perplexity
async function testPerplexity() {
  if (!apiKeys.PERPLEXITY_API_KEY || apiKeys.PERPLEXITY_API_KEY === 'your_perplexity_api_key_here') {
    console.log('❌ Perplexity: API key not configured');
    return;
  }
  
  try {
    console.log('🤖 Testing Perplexity (sonar)...');
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello" in one word.' }
      ],
      max_tokens: 10
    }, { 
      headers: { 
        'Authorization': `Bearer ${apiKeys.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    const content = response.data?.choices?.[0]?.message?.content || '';
    console.log(`   ✅ Perplexity Response: "${content.trim()}"`);
  } catch (error) {
    console.log(`   ❌ Perplexity Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Test Claude
async function testClaude() {
  if (!apiKeys.ANTHROPIC_API_KEY || apiKeys.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.log('❌ Claude: API key not configured');
    return;
  }
  
  try {
    console.log('🤖 Testing Claude (claude-3.5-sonnet-20241022)...');
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3.5-sonnet-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "Hello" in one word.' }]
    }, { 
      headers: { 
        'Authorization': `Bearer ${apiKeys.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });
    
    const content = response.data?.content?.[0]?.text || '';
    console.log(`   ✅ Claude Response: "${content.trim()}"`);
  } catch (error) {
    console.log(`   ❌ Claude Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Test Gemini
async function testGemini() {
  if (!apiKeys.GEMINI_API_KEY || apiKeys.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('❌ Gemini: API key not configured');
    return;
  }
  
  try {
    console.log('🤖 Testing Gemini (gemini-1.5-flash)...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKeys.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say "Hello" in one word.');
    const content = result.response.candidates[0]?.content?.parts[0]?.text || '';
    console.log(`   ✅ Gemini Response: "${content.trim()}"`);
  } catch (error) {
    console.log(`   ❌ Gemini Error: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  await testChatGPT();
  console.log('');
  await testPerplexity();
  console.log('');
  await testClaude();
  console.log('');
  await testGemini();
  
  console.log('\n📝 Summary:');
  console.log('   - If you see ❌ errors, check your API keys in backend/.env');
  console.log('   - Replace placeholder values with your actual API keys');
  console.log('   - Restart your backend server after updating API keys');
}

runTests().catch(console.error);

