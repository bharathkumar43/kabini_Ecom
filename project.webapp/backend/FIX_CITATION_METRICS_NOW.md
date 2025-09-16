# 🚨 URGENT: Fix AI Citation Metrics 0.0% Issue

## 🔍 Problem Confirmed
Your AI Citation Metrics are showing 0.0% because **NO API KEYS ARE CONFIGURED**. The system is using placeholder values instead of real API keys.

## ✅ IMMEDIATE SOLUTION

### Step 1: Get Your API Keys

#### 🔑 Gemini API Key (Google AI)
1. Go to: https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new API key
5. Copy the key (starts with `AIzaSyC...`)

#### 🔑 OpenAI API Key (ChatGPT)
1. Go to: https://platform.openai.com/
2. Sign in to your account
3. Go to "API Keys" section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)

#### 🔑 Perplexity API Key
1. Go to: https://www.perplexity.ai/
2. Sign up for Pro account ($20/month)
3. Go to API section
4. Generate API key
5. Copy the key (starts with `pplx-...`)

#### 🔑 Anthropic API Key (Claude)
1. Go to: https://console.anthropic.com/
2. Sign in to your account
3. Go to "API Keys" section
4. Create a new key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Update Your Environment File

**Open:** `backend/.env`

**Replace these lines:**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**With your real API keys:**
```bash
GEMINI_API_KEY=AIzaSyC...your_actual_gemini_key_here
OPENAI_API_KEY=sk-...your_actual_openai_key_here
PERPLEXITY_API_KEY=pplx-...your_actual_perplexity_key_here
ANTHROPIC_API_KEY=sk-ant-...your_actual_anthropic_key_here
```

### Step 3: Restart Backend Server

1. **Stop the current server** (Ctrl+C in terminal)
2. **Start the server again:**
   ```bash
   cd backend
   npm start
   ```

### Step 4: Test the Fix

Run this command to verify:
```bash
cd backend
node test-with-real-keys.js
```

You should see:
```
✅ Configured models: ['gemini', 'chatgpt', 'perplexity', 'claude']
✅ Citation metrics calculation completed!
```

### Step 5: Run New Analysis

1. Go to your frontend application
2. Run a new competitor analysis
3. Check the AI Citation Metrics table
4. You should now see calculated scores instead of 0.0%

## 🎯 Expected Results After Fix

Instead of:
- ChatGPT Rate: 0.0%
- Gemini Rate: 0.0%
- Perplexity Rate: 0.0%
- Claude Rate: —
- Global Score: 0.0%

You should see:
- ChatGPT Rate: 15.2%
- Gemini Rate: 23.8%
- Perplexity Rate: 18.5%
- Claude Rate: 12.1%
- Global Score: 17.4%

## ⚠️ Important Notes

1. **API Keys Required**: You MUST have real API keys - placeholder values won't work
2. **Cost**: Some APIs have usage costs (Perplexity $20/month, OpenAI pay-per-use)
3. **Rate Limits**: APIs have rate limits, so calculations may take time
4. **Internet Required**: Server needs internet access to call APIs

## 🔧 Troubleshooting

### If Still Getting 0.0%:
1. Check API keys don't have extra spaces
2. Verify keys are valid and active
3. Check server has internet access
4. Look at server console for error messages
5. Try with just one API key first (Gemini is free)

### Common Errors:
- `API key not configured`: Key is missing or invalid
- `Incorrect API key provided`: Key format is wrong
- `Rate limit exceeded`: Too many API calls
- `Network error`: Internet connectivity issue

## 🎉 Success!

Once you add real API keys, the AI Citation Metrics will:
- ✅ Calculate real citation scores
- ✅ Show per-model breakdowns
- ✅ Display global scores
- ✅ Provide meaningful competitor analysis

**The 0.0% issue will be completely resolved!**

