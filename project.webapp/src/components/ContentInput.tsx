import React, { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Globe, Loader2, Trash2, Copy, Check, ExternalLink, Download, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, BarChart, PieChart, LineChart, Activity, Target, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';
import { QAItem } from '../types';
import { apiService } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

interface ContentInputProps {
  onGenerateQA: (items: QAItem[], content: string) => Promise<void>;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  provider: string;
  model: string;
  questionCount: number;
  urls: UrlData[];
  setUrls: React.Dispatch<React.SetStateAction<UrlData[]>>;
}

export interface UrlData {
  url: string;
  content: string;
  status: 'pending' | 'extracting' | 'success' | 'error';
  error?: string;
  confidence?: number;
  tokens?: number;
  cost?: number;
}

export function ContentInput({ onGenerateQA, isProcessing, setIsProcessing, provider, model, questionCount, urls, setUrls }: ContentInputProps) {
  const [content, setContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [metrics, setMetrics] = useState({
    totalTokens: 0,
    estimatedCost: 0,
    confidenceScore: 0,
    contentLength: 0
  });
  const [showAnalysisNotification, setShowAnalysisNotification] = useState(false);

  const navigate = useNavigate();

  const addUrl = () => {
    // Validate required fields
    if (!newUrl.trim()) {
      // You could add a state for URL validation error here
      return;
    }
    
    // Basic URL validation
    try {
      new URL(newUrl);
    } catch {
      // You could add a state for URL validation error here
      return;
    }
    
    const urlData: UrlData = { url: newUrl.trim(), content: '', status: 'pending' };
    setUrls([...urls, urlData]);
    setNewUrl('');
    
    // Automatically extract content
    extractContentFromUrl(urlData, urls.length);
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const extractContentFromUrl = async (urlData: UrlData, index: number) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = { ...urlData, status: 'extracting' };
    setUrls(updatedUrls);

    try {
      const result = await apiService.extractContentFromUrl(urlData.url);
      const extractedContent = result.content || '';
      
      // Calculate metrics for this URL
      const tokens = extractedContent.length / 4; // Rough estimate
      const cost = tokens * 0.0001; // Rough cost estimate
      const confidence = Math.random() * 0.3 + 0.7; // Mock confidence score
      
      updatedUrls[index] = {
        ...urlData,
        content: extractedContent,
        status: 'success',
        tokens,
        cost,
        confidence
      };
      setUrls(updatedUrls);
      
      // Update overall content
      const allContent = updatedUrls.map(u => u.content).join('\n\n') + '\n\n' + content;
      setContent(allContent);
      
      // Update metrics
      updateMetrics(allContent);
      

      
    } catch (err: any) {
      updatedUrls[index] = {
        ...urlData,
        status: 'error',
        error: err.message || 'Failed to extract content'
      };
      setUrls(updatedUrls);
    }
  };

  const crawlWebsite = async (urlData: UrlData, index: number) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = { ...urlData, status: 'extracting' };
    setUrls(updatedUrls);
    setCrawling(true);

    try {
      console.log(`🕷️ Starting website crawl for: ${urlData.url}`);
      const result = await apiService.crawlWebsite(urlData.url, {
        maxPages: 50,
        maxDepth: 3,
        timeout: 30000
      });
      
      if (result.success && result.result) {
        const crawledContent = result.result.content || '';
        
        // Calculate metrics for crawled content
        const tokens = crawledContent.length / 4; // Rough estimate
        const cost = tokens * 0.0001; // Rough cost estimate
        const confidence = Math.random() * 0.3 + 0.7; // Mock confidence score
        
        updatedUrls[index] = {
          ...urlData,
          content: crawledContent,
          status: 'success',
          tokens,
          cost,
          confidence
        };
        setUrls(updatedUrls);
        
        // Update overall content
        const allContent = updatedUrls.map(u => u.content).join('\n\n') + '\n\n' + content;
        setContent(allContent);
        
        // Update metrics
        updateMetrics(allContent);
        
        console.log(`✅ Website crawl completed! Found ${result.result.totalPages} pages with ${crawledContent.length} characters`);
      } else {
        throw new Error('Crawl failed');
      }
      
    } catch (err: any) {
      console.error('❌ Website crawl error:', err);
      updatedUrls[index] = {
        ...urlData,
        status: 'error',
        error: err.message || 'Failed to crawl website'
      };
      setUrls(updatedUrls);
    } finally {
      setCrawling(false);
    }
  };

  const updateMetrics = (text: string) => {
    const tokens = text.length / 4;
    const cost = tokens * 0.0001;
    const confidence = Math.random() * 0.2 + 0.8;
    
    setMetrics({
      totalTokens: Math.round(tokens),
      estimatedCost: parseFloat(cost.toFixed(4)),
      confidenceScore: parseFloat((confidence * 100).toFixed(1)),
      contentLength: text.length
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = handleEmojiFilteredInput(e, (value) => {
      setContent(value);
      updateMetrics(value);
    });
  };

  const handleGenerateQA = async () => {
    if (!content.trim()) {
      alert('Please enter some content first');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await apiService.generateQuestions({ content, questionCount, provider, model });
      const qaItems: QAItem[] = result.questions.map((q: string) => ({
        question: q,
        answer: '',
        accuracy: '',
        sentiment: '',
        inputTokens: result.inputTokens || 0,
        outputTokens: result.outputTokens || 0,
        totalTokens: (result.inputTokens || 0) + (result.outputTokens || 0),
        cost: 0,
        geoScore: 0,
        citationLikelihood: 0
      }));
      await onGenerateQA(qaItems, content);
    } catch (err: any) {
      alert('Failed to generate questions: ' + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card bg-white border border-gray-200 rounded-xl shadow-sm max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-gray-700" />
        <h2 className="text-2xl font-bold text-gray-900">Content Enhancement</h2>
      </div>
      
      <div className="space-y-6">
        {/* Multi-URL Input Section */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-700" />
            Add URLs to crawl (multiple URLs supported)
          </label>
          <div className="space-y-3">
            {/* URL Input with Immediate Action Buttons */}
            <div className="flex gap-2">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  setNewUrl(value);
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  setNewUrl(value);
                })}
                onKeyDown={handleKeyDown}
                required
                placeholder="https://example.com/article *"
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                onClick={addUrl}
                disabled={!newUrl.trim()}
                className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base shadow"
              >
                <Plus className="w-4 h-4 text-white" />
                Add
              </button>
            </div>
            
            {/* Immediate Action Buttons - Show when URL is entered */}
            {newUrl.trim() && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const urlData: UrlData = { url: newUrl.trim(), content: '', status: 'pending' };
                    setUrls([...urls, urlData]);
                    extractContentFromUrl(urlData, urls.length);
                    setNewUrl('');
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors shadow flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Extract
                </button>
                <button
                  onClick={() => {
                    const urlData: UrlData = { url: newUrl.trim(), content: '', status: 'pending' };
                    setUrls([...urls, urlData]);
                    crawlWebsite(urlData, urls.length);
                    setNewUrl('');
                  }}
                  disabled={crawling}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {crawling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Crawling...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      Crawl Website
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* URL List */}
          {urls.length > 0 && (
            <div className="space-y-2 mb-4">
              {urls.map((urlData, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <div className="text-base text-gray-900 font-medium truncate">{urlData.url}</div>
                      {urlData.status === 'error' && (
                        <div className="text-xs text-red-600 mt-1">{urlData.error}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Force show both buttons always */}
                      <button
                        onClick={() => extractContentFromUrl(urlData, index)}
                        className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-700 transition-colors shadow flex items-center gap-2"
                      >
                        {urlData.status === 'extracting' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Extract
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => crawlWebsite(urlData, index)}
                        disabled={crawling}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-700 transition-colors shadow disabled:opacity-50 flex items-center gap-2"
                      >
                        {urlData.status === 'extracting' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Crawling...
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            Crawl
                          </>
                        )}
                      </button>
                      
                      {/* Show loading spinner during extraction */}
                      {urlData.status === 'extracting' && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      )}
                      
                      {/* Show success indicator */}
                      {urlData.status === 'success' && (
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                      
                      {/* Show error indicator */}
                      {urlData.status === 'error' && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <button
                        onClick={() => removeUrl(index)}
                        className="text-red-600 hover:text-red-400 transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Input */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-3">
            Content (from URLs + manual input)
          </label>
          <textarea
            value={content}
            onChange={handleContentChange}
            onPaste={(e) => handlePaste(e, (value) => {
              setContent(value);
              updateMetrics(value);
            })}
            onKeyDown={handleKeyDown}
            placeholder="Content will be automatically populated from URLs, or paste your content here..."
            className="w-full h-48 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
          />
        </div>

        {/* Generate Button */}
        <div className="flex items-center justify-between gap-4 mt-4">
          <div className="text-sm text-gray-600 font-medium">
            {urls.length} URL{urls.length !== 1 ? 's' : ''} • {content.length} characters
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateQA}
              disabled={isProcessing || !content.trim()}
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base shadow"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  Generating Q&A...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-white" />
                  Generate AI Questions
                </>
              )}
            </button>
            {/* Content Analysis disabled */}
            <button
              disabled
              className="bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg cursor-not-allowed flex items-center gap-2 text-base shadow"
              title="Content Analysis is disabled"
            >
              <BarChart3 className="w-5 h-5 text-white" />
              Content Analysis (disabled)
            </button>
            <button
              onClick={() => navigate('/content-structure-analysis', { state: { content, url: urls[0]?.url } })}
              disabled={!content.trim()}
              className="bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base shadow"
            >
              <Target className="w-5 h-5 text-white" />
              Structure Analysis
            </button>

          </div>
        </div>
      </div>

      {/* Analysis Notification */}
      {showAnalysisNotification && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                URLs Submitted Successfully!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Ready for comprehensive competitor analysis. Click "Comprehensive Analysis" to discover and analyze competitors automatically.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => {
                    setShowAnalysisNotification(false);
                    navigate('/comprehensive-analysis');
                  }}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Start Analysis
                </button>
                <button
                  onClick={() => setShowAnalysisNotification(false)}
                  className="ml-2 text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}