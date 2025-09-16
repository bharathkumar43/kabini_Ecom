#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testChatGPT() {
  console.log('🔍 Testing ChatGPT API...');
  console.log('API Key Status:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello" in one word.' }
      ],
      max_tokens: 10
    }, { 
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      timeout: 10000
    });
    
    const content = response.data?.choices?.[0]?.message?.content || '';
    console.log('✅ ChatGPT Response:', `"${content.trim()}"`);
    console.log('✅ ChatGPT is working correctly!');
  } catch (error) {
    console.log('❌ ChatGPT Error:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.code) {
      console.log('Error Code:', error.response.data.error.code);
    }
  }
}

testChatGPT().catch(console.error);

