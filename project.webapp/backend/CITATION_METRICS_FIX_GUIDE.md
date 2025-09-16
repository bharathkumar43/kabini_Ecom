# AI Citation Metrics Fix Guide

## 🔍 Problem Identified

The AI Citation Metrics are showing 0.0% because the API keys are not configured properly. The system is using placeholder values instead of real API keys.

## ✅ Solution Steps

### 1. Update API Keys in Environment File

Edit `backend/.env` and replace the placeholder values:

```bash
# Before (placeholder values):
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# After (real API keys):
GEMINI_API_KEY=AIzaSyC...your_actual_gemini_key
OPENAI_API_KEY=sk-...your_actual_openai_key
PERPLEXITY_API_KEY=pplx-...your_actual_perplexity_key
ANTHROPIC_API_KEY=sk-ant-...your_actual_anthropic_key
```

### 2. Get API Keys

#### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key
5. Copy the key (starts with `AIzaSyC`)

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Go to API Keys section
4. Create a new secret key
5. Copy the key (starts with `sk-`)

#### Perplexity API Key
1. Go to [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for Pro account
3. Go to API section
4. Generate API key
5. Copy the key (starts with `pplx-`)

#### Anthropic API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in to your account
3. Go to API Keys section
4. Create a new key
5. Copy the key (starts with `sk-ant-`)

### 3. Test the Fix

Run the test script to verify the fix:

```bash
cd backend
node test-with-real-keys.js
```

### 4. Restart Backend Server

After updating the API keys, restart the backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
# or
node server.js
```

### 5. Run New Analysis

1. Go to the frontend
2. Run a new competitor analysis
3. Check the AI Citation Metrics table
4. You should now see calculated scores instead of 0.0%

## 🧪 Testing Scripts

### Test Citation Logic (Mock Data)
```bash
node test-citation-direct.js
```
This tests the citation metrics calculation logic with mock data.

### Test with Real API Keys
```bash
node test-with-real-keys.js
```
This tests the citation metrics with real API calls.

## 📊 Expected Results

After fixing the API keys, you should see:

- **AI Citation Metrics**: Calculated scores (e.g., 85.5%, 92.3%)
- **Per Model Scores**: Individual scores for each LLM
- **Global Scores**: Overall citation performance
- **Citation Rates**: How often competitors are mentioned

## 🔧 Troubleshooting

### If API Keys Still Don't Work

1. **Check Key Format**: Ensure keys don't have extra spaces or quotes
2. **Check Permissions**: Verify API keys have proper permissions
3. **Check Rate Limits**: Some APIs have rate limits
4. **Check Internet**: Ensure server has internet access
5. **Check Logs**: Look at server console for error messages

### Common Error Messages

- `API key not configured`: Key is missing or invalid
- `Incorrect API key provided`: Key format is wrong
- `Rate limit exceeded`: Too many API calls
- `Network error`: Internet connectivity issue

## 🎯 What This Fixes

- ✅ AI Citation Metrics will show real calculated scores
- ✅ AI Traffic Share will also work (uses same API keys)
- ✅ All LLM-based analysis will function properly
- ✅ Competitor analysis will be more accurate

## 📝 Notes

- The citation metrics calculation logic is working correctly
- The issue was purely API key configuration
- Once API keys are set, all metrics will populate automatically
- The system validates API keys to prevent using placeholder values

