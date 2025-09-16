import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { historyService } from '../services/historyService';
import { sessionManager } from '../services/sessionManager';
import type { HistoryItem, QAHistoryItem } from '../types';

import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';
import { computeAiCitationScore, computeRelativeAiVisibility, median } from '../utils/formulas';

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';

// SVG/mini-visuals for each feature
const BarChartSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="2" y="12" width="5" height="10" fill="#3b82f6"/><rect x="10" y="6" width="5" height="16" fill="#60a5fa"/><rect x="18" y="2" width="5" height="20" fill="#2563eb"/><rect x="26" y="8" width="5" height="14" fill="#93c5fd"/><rect x="34" y="16" width="5" height="6" fill="#1e40af"/></svg>
);
const PieChartSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><circle cx="12" cy="12" r="10" fill="#fbbf24"/><path d="M12 2 A10 10 0 0 1 22 12 L12 12 Z" fill="#f59e42"/></svg>
);
const MagicWandSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="18" y="4" width="4" height="16" rx="2" fill="#a21caf"/><circle cx="20" cy="4" r="3" fill="#f472b6"/><circle cx="20" cy="20" r="2" fill="#f472b6"/></svg>
);
const StructureSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="6" y="10" width="8" height="8" fill="#10b981"/><rect x="26" y="6" width="8" height="8" fill="#34d399"/><rect x="16" y="2" width="8" height="8" fill="#6ee7b7"/><path d="M14 14 L20 10 L26 14" stroke="#10b981" strokeWidth="2" fill="none"/></svg>
);
const CalendarSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="6" y="6" width="28" height="14" rx="3" fill="#f87171"/><rect x="10" y="10" width="6" height="6" fill="#fff"/><rect x="24" y="10" width="6" height="6" fill="#fff"/></svg>
);
const LineChartSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><polyline points="2,22 10,10 18,14 26,6 34,18 38,10" fill="none" stroke="#6366f1" strokeWidth="2"/><circle cx="10" cy="10" r="2" fill="#6366f1"/><circle cx="26" cy="6" r="2" fill="#6366f1"/><circle cx="34" cy="18" r="2" fill="#6366f1"/></svg>
);

interface FeatureCardProps {
  title: string;
  description: string;
  button: string;
  onClick: () => void;
  icon: React.ReactNode;
  visual?: React.ReactNode;
}

function FeatureCard({ title, description, button, onClick, icon, visual }: FeatureCardProps) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow hover:shadow-lg transition flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between">
          {icon}
          {visual && <div className="ml-auto">{visual}</div>}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="mb-4 text-gray-600">{description}</p>
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-auto"
        onClick={onClick}
      >
        {button}
      </button>
    </div>
  );
}

// New Dashboard Feature Cards
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  children: React.ReactNode;
}

function DashboardCard({ title, icon, iconBgColor, children }: DashboardCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {children}
    </div>
  );
}

// Sentiment Analysis Component
function SentimentAnalysisCard({ competitors, company }: { 
  competitors: any[], 
  company?: string 
}) {
  // Calculate sentiment percentages based on brand mentions
  const calculateSentiment = () => {
    if (!competitors || competitors.length === 0) {
      return { positive: 0, neutral: 0, negative: 0, total: 0, drivers: { positive: [], neutral: [], negative: [] } };
    }

    let totalMentions = 0;
    let positiveMentions = 0;
    let neutralMentions = 0;
    let negativeMentions = 0;
    
    const positiveDrivers: string[] = [];
    const neutralDrivers: string[] = [];
    const negativeDrivers: string[] = [];

    competitors.forEach((competitor: any) => {
      // Extract sentiment data from competitor analysis
      const breakdowns = competitor.breakdowns || {};
      const geminiBreakdown = breakdowns.gemini || {};
      
      // Count mentions by sentiment
      const mentions = geminiBreakdown.mentionsScore || 0;
      const sentiment = geminiBreakdown.sentimentScore || 0.5;
      
      totalMentions += mentions;
      
      // Categorize sentiment (0-0.3: negative, 0.3-0.7: neutral, 0.7-1: positive)
      if (sentiment < 0.3) {
        negativeMentions += mentions;
        negativeDrivers.push(competitor.name || 'Unknown');
      } else if (sentiment > 0.7) {
        positiveMentions += mentions;
        positiveDrivers.push(competitor.name || 'Unknown');
      } else {
        neutralMentions += mentions;
        neutralDrivers.push(competitor.name || 'Unknown');
      }
    });

    // Calculate percentages
    let positivePercent = totalMentions > 0 ? (positiveMentions / totalMentions) * 100 : 0;
    let neutralPercent = totalMentions > 0 ? (neutralMentions / totalMentions) * 100 : 0;
    let negativePercent = totalMentions > 0 ? (negativeMentions / totalMentions) * 100 : 0;

    // Apply override logic: if negative is 100%, show as Neutral 80% and Negative 20%
    if (negativePercent === 100) {
      neutralPercent = 80;
      negativePercent = 20;
      positivePercent = 0;
    }

    return {
      positive: Math.round(positivePercent * 100) / 100,
      neutral: Math.round(neutralPercent * 100) / 100,
      negative: Math.round(negativePercent * 100) / 100,
      total: totalMentions,
      drivers: {
        positive: positiveDrivers.slice(0, 3), // Top 3 positive drivers
        neutral: neutralDrivers.slice(0, 3),   // Top 3 neutral drivers
        negative: negativeDrivers.slice(0, 3)  // Top 3 negative drivers
      }
    };
  };

  const sentiment = calculateSentiment();
  // Determine dominant sentiment based on highest percentage
  const dominantSentiment = sentiment.neutral > sentiment.positive && sentiment.neutral > sentiment.negative ? 'Neutral' :
                           sentiment.positive > sentiment.negative ? 'Positive' : 'Negative';
  const sentimentColor = dominantSentiment === 'Positive' ? 'text-green-600' : 
                        dominantSentiment === 'Negative' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sentiment Analysis</h3>
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Overall Sentiment */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${sentimentColor}`}>
            {dominantSentiment}
          </div>
          
        </div>

        {/* Sentiment Percentages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Positive</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${sentiment.positive}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{sentiment.positive}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Neutral</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${sentiment.neutral}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{sentiment.neutral}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Negative</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${sentiment.negative}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{sentiment.negative}%</span>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

// AI Visibility Score Component
function AIVisibilityScoreCard({ score, industry, metrics }: { 
  score: number, 
  industry?: string, 
  metrics?: any 
}) {
  // Validate and convert score from 0-10 scale to 0-100 scale for display
  const validateScore = (rawScore: number): number => {
    // Ensure score is within valid range (0-10)
    const clampedScore = Math.max(0, Math.min(10, rawScore));
    // Convert to 0-100 scale
    return Math.round(clampedScore * 10);
  };
  
  const displayScore = validateScore(score);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <DashboardCard
      title="AI Visibility Score"
      icon={<Eye className="w-5 h-5 text-white" />}
      iconBgColor="bg-green-500"
    >
      <div className="text-center">
        <div className={`text-4xl font-bold ${getScoreColor(displayScore)} mb-2`}>
          {displayScore}
        </div>
        <div className="text-gray-600 mb-2">out of 100</div>
        <div className={`text-lg font-semibold ${getScoreColor(displayScore)} mb-3`}>
          {getScoreLabel(displayScore)}
        </div>
        
        {/* Detailed metrics removed for cleaner UI */}
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${getProgressColor(displayScore)} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, displayScore))}%` }}
          ></div>
        </div>
      </div>
    </DashboardCard>
  );
}

// LLM Presence Component
function LLMPresenceCard({ serviceStatus, aiScores }: { 
  serviceStatus: any, 
  aiScores?: any
}) {
  const llmServices = [
    { name: 'ChatGPT', key: 'chatgpt', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Gemini', key: 'gemini', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Perplexity', key: 'perplexity', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Claude', key: 'claude', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  // Determine availability based ONLY on actual AI scores from backend
  const getLLMAvailability = () => {
    const availability: Record<string, boolean> = {
      chatgpt: false,
      gemini: false,
      perplexity: false,
      claude: false
    };

    if (aiScores) {
      // Only mark as available if there's a real score > 0
      // No fallback to serviceStatus - only real data counts
      availability.chatgpt = aiScores.chatgpt !== undefined && aiScores.chatgpt > 0;
      availability.gemini = aiScores.gemini !== undefined && aiScores.gemini > 0;
      availability.perplexity = aiScores.perplexity !== undefined && aiScores.perplexity > 0;
      availability.claude = aiScores.claude !== undefined && aiScores.claude > 0;
    }
    // Removed fallback to serviceStatus - if no aiScores, all are false

    return availability;
  };

  const currentStatus = getLLMAvailability();
  
  // Count available services
  const availableServices = llmServices.filter(service => currentStatus[service.key]).length;
  const totalServices = llmServices.length;

  return (
    <DashboardCard
      title="LLM Presence"
      icon={<Bot className="w-5 h-5 text-white" />}
      iconBgColor="bg-blue-500"
    >
      <div className="space-y-3">
        {llmServices.map((service) => {
          const isAvailable = currentStatus[service.key];
          
          return (
            <div key={service.key} className="flex items-center justify-between">
              <span className="text-gray-700">{service.name}</span>
              <div className={`flex items-center ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {isAvailable ? (
                  <>
                    {service.icon}
                    <span className="ml-1 text-sm">Available</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span className="ml-1 text-sm">Not Available</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        

      </div>
    </DashboardCard>
  );
}

// Share of AI Voice KPI Card
function ShareOfAIVoiceCard({ result }: { result: any }) {
  const computeShare = (analysisResult: any): number => {
    try {
      if (!analysisResult || !Array.isArray(analysisResult.competitors) || analysisResult.competitors.length === 0) return 0;

      const mainCompany = analysisResult.competitors.find((c: any) => c.name?.toLowerCase() === analysisResult.company?.toLowerCase())
        || analysisResult.competitors[0];
      if (!mainCompany) return 0;

      const getMentions = (c: any): number => {
        const m = (
          c?.keyMetrics?.gemini?.brandMentions ??
          c?.keyMetrics?.gemini?.mentionsCount ??
          c?.breakdowns?.gemini?.mentionsScore ??
          0
        ) as number;
        const num = Number(m);
        return isNaN(num) ? 0 : Math.max(0, num);
      };

      const main = getMentions(mainCompany);
      const total = (analysisResult.competitors || []).reduce((sum: number, c: any) => sum + getMentions(c), 0);
      if (total <= 0) return 0;
      return Math.round(((main / total) * 100) * 10) / 10;
    } catch {
      return 0;
    }
  };

  const sharePct = computeShare(result);
  return (
    <DashboardCard
      title="Share of AI Voice"
      icon={<PieChart className="w-5 h-5 text-white" />}
      iconBgColor="bg-rose-500"
    >
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-1">{sharePct}%</div>
        <div className="text-sm text-gray-600">Your brand mentions ÷ total mentions</div>
      </div>
    </DashboardCard>
  );
}

// Top Performing Products KPI Card
function TopProductsKpiCard({ result }: { result: any }) {
  type NormalizedProduct = {
    sku: string;
    category: string;
    visibility: number; // 0..1
    conversion: number | null; // 0..1 or null
    composite: number; // visibility * (conversion || 1)
  };

  const normalize01 = (raw: unknown): number | null => {
    const v = Number(raw);
    if (isNaN(v)) return null;
    if (v <= 0) return 0;
    if (v <= 1) return Math.min(1, v);
    if (v <= 10) return Math.min(1, v / 10);
    if (v <= 100) return Math.min(1, v / 100);
    return 1;
  };

  const getProducts = (): NormalizedProduct[] => {
    try {
      const source = (result?.products || result?.productPerformance || []) as any[];
      if (!Array.isArray(source) || source.length === 0) return [];

      const mapped = source.map((p: any) => {
        const sku = String(p?.sku || p?.id || p?.SKU || 'Unknown');
        const category = String(p?.category || (Array.isArray(p?.categories) ? p.categories[0] : '') || '—');
        const visibility = normalize01(
          p?.visibilityScore ?? p?.aiVisibilityScore ?? p?.score ?? p?.totalScore ?? null
        ) ?? 0;
        const conversion = normalize01(
          p?.conversionRate ?? p?.conversion ?? p?.cv ?? p?.performance?.conversionRate ?? null
        );
        const composite = visibility * (conversion ?? 1);
        return { sku, category, visibility, conversion: conversion ?? null, composite } as NormalizedProduct;
      });

      return mapped
        .sort((a, b) => b.composite - a.composite)
        .slice(0, 5);
    } catch {
      return [];
    }
  };

  const products = getProducts();

  return (
    <DashboardCard
      title="Top Performing Products"
      icon={<Award className="w-5 h-5 text-white" />}
      iconBgColor="bg-orange-500"
    >
      {products.length === 0 ? (
        <div className="text-sm text-gray-600 text-center">No product performance data available</div>
      ) : (
        <div className="space-y-3">
          {products.map((p, idx) => {
            const visPct = Math.round(p.visibility * 1000) / 10;
            const convPct = p.conversion === null ? null : Math.round(p.conversion * 1000) / 10;
            const compPct = Math.round(p.composite * 1000) / 10;
            return (
              <div key={`${p.sku}-${idx}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-800 text-sm font-semibold flex items-center justify-center">{idx + 1}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate" title={p.sku}>{p.sku}</div>
                    <div className="text-xs text-gray-600 truncate" title={p.category}>{p.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Visibility</div>
                    <div className="text-sm font-medium text-gray-900">{visPct}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Conversion</div>
                    <div className="text-sm font-medium text-gray-900">{convPct === null ? 'N/A' : `${convPct}%`}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="text-sm font-semibold text-gray-900">{compPct}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

// Competitor Benchmark Component
function CompetitorBenchmarkCard({ competitors, industry }: { competitors: any[], industry?: string }) {
  const getBenchmarkStatus = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return { status: 'No Data', rank: 'N/A', color: 'text-gray-500', score: 0, rawScore: 0 };
    
    // Calculate average score (scores are on 0-10 scale, convert to 0-100 for display)
    const avgScore = competitors.reduce((sum, comp) => sum + (comp.totalScore || 0), 0) / competitors.length;
    const displayScore = Math.round(avgScore * 10);
    
    if (displayScore >= 80) return { status: 'Excellent', rank: 'Top 10%', color: 'text-purple-600', score: displayScore, rawScore: avgScore };
    if (displayScore >= 70) return { status: 'Above Average', rank: 'Top 25%', color: 'text-blue-600', score: displayScore, rawScore: avgScore };
    if (displayScore >= 60) return { status: 'Average', rank: 'Top 50%', color: 'text-yellow-600', score: displayScore, rawScore: avgScore };
    if (displayScore >= 50) return { status: 'Below Average', rank: 'Bottom 50%', color: 'text-orange-600', score: displayScore, rawScore: avgScore };
    return { status: 'Poor', rank: 'Bottom 25%', color: 'text-red-600', score: displayScore, rawScore: avgScore };
  };

  const benchmark = getBenchmarkStatus(competitors);
  const filledBars = Math.min(5, Math.max(1, Math.ceil((competitors?.length || 0) / 2)));

  return (
    <DashboardCard
      title="Competitor Benchmark"
      icon={<BarChartIcon className="w-5 h-5 text-white" />}
      iconBgColor="bg-purple-500"
    >
      <div className="text-center">
        <div className={`text-2xl font-bold ${benchmark.color} mb-2`}>
          {benchmark.status}
        </div>
        
        <div className="text-lg font-semibold text-gray-700 mb-3">
          Score: {benchmark.score}/100
        </div>
      </div>
    </DashboardCard>
  );
}

export function Overview() {
  const { user } = useAuth();
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  // keep but unused in this page variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);
  const navigate = useNavigate();
  
  // Unified analysis state
  const [inputValue, setInputValue] = useState(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.originalInput || '';
      }
      return '';
    } catch { return ''; }
  });
  const [analysisType, setAnalysisType] = useState<'root-domain' | 'exact-url'>('root-domain');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputType, setInputType] = useState<'company' | 'url'>(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.inputType || 'company';
      }
      return 'company';
    } catch { return 'company'; }
  });
  const [analysisResult, setAnalysisResult] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Extract the actual analysis data from the cached structure
        return parsed.data || parsed;
      }
      return null;
    } catch { return null; }
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // Removed Root Domain / Exact URL dropdown
  const [selectedIndustry, setSelectedIndustry] = useState<string>('auto');
  const mapIndustryLabel = (raw?: string): string => {
    const s = String(raw || '').toLowerCase();
    if (/tech|software|it|saas|cloud/.test(s)) return 'Information Technology & Services';
    if (/bank|financ|fintech|invest|payment|insur/.test(s)) return 'Finance';
    if (/health|medic|pharma|bio|clinic|care/.test(s)) return 'Healthcare';
    if (/legal|law|attorney|compliance/.test(s)) return 'Legal';
    if (/e-?commerce|commerce|retail|shop|store|magento|shopify|woocommerce/.test(s)) return 'Ecommerce & Retail';
    if (/media|news|content|video|stream/.test(s)) return 'Media';
    if (/edu|school|college|university|learning|edtech/.test(s)) return 'Education';
    return 'Others';
  };
  
  // Add New Competitor state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [isUrlInput, setIsUrlInput] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  
  // History data state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load history items from service
  useEffect(() => {
    const items = historyService.getHistoryItems();
    setHistoryItems(items);
    console.log('[Overview] Loaded history items:', items.length);
  }, [refreshKey]);

  // Restore cached data on mount
  useEffect(() => {
    const session = sessionManager.getLatestAnalysisSession('overview', user?.id);
    if (session) {
      setInputValue(session.inputValue || '');
      setInputType(session.inputType || 'company');
      setAnalysisResult(session.data);
      console.log('[Overview] Restored analysis session:', session);
    } else {
      console.log('[Overview] No previous analysis session found - starting fresh');
    }
  }, [user?.id]);

  // Check if this is a fresh session (no previous data)
  const [isFreshSession, setIsFreshSession] = useState(false);
  
  useEffect(() => {
    const session = sessionManager.getLatestAnalysisSession('overview', user?.id);
    setIsFreshSession(!session);
  }, [user?.id]);

  // Listen for storage changes to auto-refresh
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'comprehensive_history' || e.key === 'sessions') {
        console.log('[Overview] Storage changed, refreshing data');
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes every 3 seconds (fallback)
    const interval = setInterval(() => {
      const currentItems = historyService.getHistoryItems();
      if (currentItems.length !== historyItems.length) {
        console.log('[Overview] Item count changed, refreshing data');
        setRefreshKey(prev => prev + 1);
      }
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [historyItems.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Only include sessions for the logged-in user
  const userSessions = user ? sessions.filter(s => s.userId === user.id) : [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTotalCost = () => {
    // Calculate from sessions
    const sessionsCost = userSessions.reduce((sum, session) => {
      return sum + parseFloat(session.statistics?.totalCost || '0');
    }, 0);
    
    // Calculate from history items
    const historyCost = historyItems.reduce((sum, item) => {
      if (item.type === 'qa') {
        const qaItem = item as QAHistoryItem;
        return sum + parseFloat(qaItem.sessionData.statistics?.totalCost || '0');
      }
      return sum;
    }, 0);
    
    const totalCost = sessionsCost + historyCost;
    console.log('[Overview] Total cost calculation:', { sessionsCost, historyCost, totalCost });
    return totalCost;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTotalQuestions = () => {
    // Calculate from sessions
    const sessionsQuestions = userSessions.reduce((sum, session) => {
      return sum + (session.qaData?.length || 0);
    }, 0);
    
    // Calculate from history items
    const historyQuestions = historyItems.reduce((sum, item) => {
      if (item.type === 'qa') {
        const qaItem = item as QAHistoryItem;
        return sum + (qaItem.sessionData.qaData?.length || 0);
      }
      return sum;
    }, 0);
    
    const totalQuestions = sessionsQuestions + historyQuestions;
    console.log('[Overview] Total questions calculation:', { sessionsQuestions, historyQuestions, totalQuestions });
    return totalQuestions;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAverageAccuracy = () => {
    // Get all QA items from sessions
    const sessionQAItems = userSessions.flatMap(session => session.qaData);
    
    // Get all QA items from history
    const historyQAItems = historyItems
      .filter(item => item.type === 'qa')
      .flatMap(item => (item as QAHistoryItem).sessionData.qaData);
    
    // Combine all QA items
    const allQAItems = [...sessionQAItems, ...historyQAItems];
    
    if (allQAItems.length === 0) return 0;
    
    // Calculate average accuracy from individual QA items
    const accuracyValues = allQAItems
      .map(qa => parseFloat(qa.accuracy || '0'))
      .filter(accuracy => accuracy > 0);
    
    if (accuracyValues.length === 0) return 0;
    
    const avgAccuracy = accuracyValues.reduce((sum, acc) => sum + acc, 0) / accuracyValues.length;
    console.log('[Overview] Average accuracy calculation:', { 
      sessionQAItems: sessionQAItems.length, 
      historyQAItems: historyQAItems.length, 
      totalQAItems: allQAItems.length,
      accuracyValues: accuracyValues.length,
      avgAccuracy 
    });
    return avgAccuracy;
  };

  // Detect URL type automatically
  const detectUrlType = (url: string): 'root-domain' | 'exact-url' => {
    try {
      // Remove protocol and www
      let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Split by slashes to get path parts
      const urlParts = cleanUrl.split('/');
      const domainPart = urlParts[0]; // Get the domain part
      
      // Check if it's a root domain (just domain, no path)
      if (urlParts.length === 1 || (urlParts.length > 1 && urlParts[1].trim() === '')) {
        return 'root-domain';
      } else {
        // Has path or subdomain - treat as exact URL
        return 'exact-url';
      }
    } catch (error) {
      console.error('Error detecting URL type:', error);
      return 'root-domain'; // Default fallback
    }
  };

  // Extract company name from URL
  const extractCompanyFromUrl = (url: string): string => {
    try {
      // Remove protocol and www if present
      let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Remove path, query parameters, and fragments
      domain = domain.split('/')[0].split('?')[0].split('#')[0];
      
      // Remove common TLDs and get the main part
      const domainParts = domain.split('.');
      if (domainParts.length >= 2) {
        // For domains like "company.com" or "company.co.uk"
        return domainParts[domainParts.length - 2];
      }
      
      return domain;
    } catch (error) {
      console.error('Error extracting company from URL:', error);
      return url; // Fallback to original input
    }
  };

  // Detect industry from company name or URL
  const detectIndustry = (companyName: string, url?: string): string => {
    const name = companyName.toLowerCase();
    const fullUrl = url?.toLowerCase() || '';
    
    // More specific industry detection logic
    if (name.includes('cloud') && (name.includes('migration') || name.includes('migrate') || name.includes('transform'))) {
      return 'Cloud Migration & Transformation';
    }
    
    if (name.includes('cloud') || name.includes('aws') || name.includes('azure') || name.includes('gcp') || 
        name.includes('kubernetes') || name.includes('docker') || name.includes('devops')) {
      return 'Cloud Computing & DevOps';
    }
    
    if (name.includes('ai') || name.includes('artificial intelligence') || name.includes('machine learning') || 
        name.includes('ml') || name.includes('deep learning') || name.includes('neural')) {
      return 'Artificial Intelligence & ML';
    }
    
    if (name.includes('cyber') || name.includes('security') || name.includes('firewall') || name.includes('vpn') ||
        name.includes('threat') || name.includes('protection')) {
      return 'Cybersecurity';
    }
    
    if (name.includes('data') && (name.includes('analytics') || name.includes('warehouse') || name.includes('lake') || 
        name.includes('science') || name.includes('mining'))) {
      return 'Data Analytics & Science';
    }
    
    if (name.includes('saas') || name.includes('software as a service') || name.includes('platform') ||
        name.includes('api') || name.includes('integration')) {
      return 'SaaS & Platform Services';
    }
    
    if (name.includes('tech') || name.includes('software') || name.includes('digital') || name.includes('innovation')) {
      return 'Technology & Software';
    }
    
    if (name.includes('bank') || name.includes('finance') || name.includes('credit') || name.includes('loan') ||
        name.includes('payment') || name.includes('fintech') || name.includes('investment')) {
      return 'Financial Services & Fintech';
    }
    
    if (name.includes('health') || name.includes('medical') || name.includes('pharma') || name.includes('care') ||
        name.includes('biotech') || name.includes('telehealth')) {
      return 'Healthcare & Biotech';
    }
    
    if (name.includes('retail') || name.includes('shop') || name.includes('store') || name.includes('commerce') ||
        name.includes('ecommerce') || name.includes('marketplace')) {
      return 'Retail & E-commerce';
    }
    
    if (name.includes('edu') || name.includes('school') || name.includes('university') || name.includes('college') ||
        name.includes('learning') || name.includes('training')) {
      return 'Education & Training';
    }
    
    if (name.includes('media') || name.includes('news') || name.includes('entertainment') || name.includes('tv') ||
        name.includes('content') || name.includes('publishing')) {
      return 'Media & Entertainment';
    }
    
    if (name.includes('auto') || name.includes('car') || name.includes('vehicle') || name.includes('transport') ||
        name.includes('logistics') || name.includes('supply chain')) {
      return 'Automotive & Transportation';
    }
    
    if (name.includes('food') || name.includes('restaurant') || name.includes('cafe') || name.includes('dining') ||
        name.includes('delivery') || name.includes('catering')) {
      return 'Food & Beverage';
    }
    
    if (name.includes('real') || name.includes('estate') || name.includes('property') || name.includes('housing') ||
        name.includes('construction') || name.includes('architecture')) {
      return 'Real Estate & Construction';
    }
    
    if (name.includes('energy') || name.includes('oil') || name.includes('gas') || name.includes('power') ||
        name.includes('renewable') || name.includes('solar') || name.includes('wind')) {
      return 'Energy & Utilities';
    }
    
    if (name.includes('consulting') || name.includes('consultant') || name.includes('advisory') || 
        name.includes('strategy') || name.includes('management')) {
      return 'Consulting & Advisory';
    }
    
    // Default industry for unknown companies
    return 'Business Services';
  };

  // Clear cached analysis data
  const clearAnalysisData = () => {
    try {
      localStorage.removeItem('overview_market_analysis');
      setAnalysisResult(null);
      setInputValue('');
      setInputType('company');
      setAnalysisError(null);
      setShowSuccessMessage(false);
      console.log('[Overview] Analysis data cleared');
    } catch (error) {
      console.error('[Overview] Error clearing analysis data:', error);
    }
  };

  // Unified Analysis Function
  const startAnalysis = async () => {
    // Validate required fields
    if (!inputValue.trim()) {
      setAnalysisError('Please enter a company name or URL to analyze.');
      return;
    }
    
    // Auto-detect if input is a URL and extract company name
    let finalCompanyName = inputValue.trim();
    let detectedInputType: 'company' | 'url' = 'company';
    
    if (inputValue.includes('http://') || inputValue.includes('https://') || inputValue.includes('www.')) {
      finalCompanyName = extractCompanyFromUrl(inputValue);
      detectedInputType = 'url';
      console.log('[Overview] Detected URL, extracted company name:', finalCompanyName);
    }
    
    // Detect industry from company name and URL
    const autoIndustry = detectIndustry(finalCompanyName, inputValue);
    const autoMapped = mapIndustryLabel(autoIndustry);
    const detectedIndustry = selectedIndustry !== 'auto' ? selectedIndustry : autoMapped;
    console.log('[Overview] Detected industry:', detectedIndustry);
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowSuccessMessage(false);
    
    try {
      const abortController = new AbortController();
      setAbortController(abortController);
      
      console.log('[Overview] Starting AI visibility analysis for:', finalCompanyName);
      console.log('[Overview] Detected industry:', detectedIndustry);
      
      const analysisResults = await apiService.getAIVisibilityAnalysis(
        finalCompanyName,
        detectedIndustry,
        { signal: abortController.signal }
      );
      
      console.log('[Overview] Analysis results received:', analysisResults);
      
      if (analysisResults.success && analysisResults.data) {
        console.log('[Overview] Setting analysis result:', analysisResults.data);
        
        // Add detected industry to the analysis result
        const enhancedResult = {
          ...analysisResults.data,
          industry: detectedIndustry,
          originalInput: inputValue,
          inputType: detectedInputType, // Add input type to the cached data
          analysisType: analysisType // Add analysis type to the cached data
        };
        
        setAnalysisResult(enhancedResult);
        setShowSuccessMessage(true);
        
        // Save to history
        try {
          const competitors = analysisResults.data.competitors || [];
          const historyItem = {
            id: `ai-visibility-${Date.now()}`,
            type: 'ai-visibility' as const,
            name: `AI Visibility Analysis - ${finalCompanyName}`,
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
            company: finalCompanyName,
            industry: detectedIndustry,
            analysis: {
              competitors: competitors.map((comp: any) => ({
                name: comp.name,
                mentions: comp.mentions || 0,
                status: 'success' as const
              })),
              serviceStatus: analysisResults.data.serviceStatus || {
                gemini: true,
                perplexity: true,
                claude: true,
                chatgpt: true
              },
              summary: {
                totalCompetitors: competitors.length,
                averageVisibilityScore: competitors.reduce((sum: number, comp: any) => sum + (comp.mentions || 0), 0) / Math.max(competitors.length, 1),
                topCompetitor: competitors.length > 0 ? competitors.reduce((top: any, comp: any) => 
                  (comp.mentions || 0) > (top.mentions || 0) ? comp : top
                ).name : 'None'
              }
            }
          };
          
          try {
            await historyService.addHistoryItem(historyItem);
            
            // Dispatch custom event to notify other components (like History) that new analysis was created
            window.dispatchEvent(new CustomEvent('new-analysis-created', { 
              detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
            }));
            
            console.log('[Overview] Analysis saved to history:', historyItem);
          } catch (error) {
            console.error('[Overview] Failed to save analysis to history:', error);
            // Still dispatch the event even if history save fails
            window.dispatchEvent(new CustomEvent('new-analysis-created', { 
              detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
            }));
          }
        } catch (e) {
          console.warn('Failed to save analysis to history:', e);
        }
        
        // Cache the results
        try {
          localStorage.setItem('overview_market_analysis', JSON.stringify({
            company: finalCompanyName,
            originalInput: inputValue,
            inputType: detectedInputType,
            industry: detectedIndustry,
            analysisType: analysisType, // Cache analysis type
            data: enhancedResult,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Failed to cache analysis results:', e);
        }
      } else {
        console.error('[Overview] Analysis failed:', analysisResults.error);
        setAnalysisError(analysisResults.error || 'Analysis failed. Please try again.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Analysis was cancelled');
        return;
      }
      console.error('AI analysis error:', error);
      setAnalysisError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAbortController(null);
    }
  };

  // Stats grid intentionally removed to focus on faster market analysis UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stats: Array<never> = [];

  // Recent sessions not used on this page variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recentSessions: Array<never> = [];

  // Helper to get AI Visibility Score from analysis result using actual API structure
  const getAIVisibilityScore = (result: any) => {
    // Check for direct score fields first
    if (result?.aiVisibilityScore !== undefined && result?.aiVisibilityScore !== null) {
      return result.aiVisibilityScore;
    }
    if (result?.totalScore !== undefined && result?.totalScore !== null) {
      return result.totalScore;
    }
    if (result?.visibilityScore !== undefined && result?.visibilityScore !== null) {
      return result.visibilityScore;
    }
    
    // If no direct score, try to get from competitors (they contain the actual scores)
    if (result?.competitors && result.competitors.length > 0) {
      // Look for the main company score in competitors
      const mainCompany = result.competitors.find((comp: any) => 
        comp.name?.toLowerCase() === result.company?.toLowerCase()
      );
      
      if (mainCompany?.totalScore !== undefined && mainCompany?.totalScore !== null) {
        return mainCompany.totalScore;
      }
      
      // Fallback: calculate average from all competitors
      const validScores = result.competitors
        .filter((comp: any) => comp.totalScore !== undefined && comp.totalScore !== null)
        .map((comp: any) => comp.totalScore);
      
      if (validScores.length > 0) {
        const avgScore = validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length;
        return avgScore;
      }
    }
    
    return 0; // Default fallback
  };

  // Helper to get detailed AI Visibility metrics from actual API structure
  const getAIVisibilityMetrics = (result: any) => {
    if (!result?.competitors || result.competitors.length === 0) {
      return null;
    }

    // Find the main company data in competitors
    const mainCompany = result.competitors.find((comp: any) => 
      comp.name?.toLowerCase() === result.company?.toLowerCase()
    );
    
    if (!mainCompany) {
      return null;
    }

    // Extract metrics from the actual API structure
    const totalScore = mainCompany.totalScore || 0;
    const aiScores = mainCompany.aiScores || {};
    const breakdowns = mainCompany.breakdowns || {};

    // Use mentions from key metrics or breakdowns
    const mainMentions = Number(
      (
        mainCompany?.keyMetrics?.gemini?.brandMentions ??
        mainCompany?.keyMetrics?.gemini?.mentionsCount ??
        breakdowns?.gemini?.mentionsScore ??
        0
      ) as number
    ) || 0;

    // Compute median competitor mentions
    const competitorMentions: number[] = (result.competitors || [])
      .filter((c: any) => c.name?.toLowerCase() !== result.company?.toLowerCase())
      .map((c: any) => {
        const m =
          c?.keyMetrics?.gemini?.brandMentions ??
          c?.keyMetrics?.gemini?.mentionsCount ??
          c?.breakdowns?.gemini?.mentionsScore ??
          0;
        return Number(m) || 0;
      });
    const medianCompetitor = median(competitorMentions);

    // Derived metrics per provided formulas
    const aiCitationScore = computeAiCitationScore(mainMentions, medianCompetitor);
    const relativeAiVisibility = computeRelativeAiVisibility(mainMentions, medianCompetitor);

    // Get Gemini breakdown (most detailed data available)
    const geminiBreakdown = breakdowns.gemini || {};

    return {
      aiVisibilityScore: Math.min(10, Math.max(0, totalScore)),
      brandMentions: Number(mainMentions.toFixed(5)),
      medianCompetitorMentions: Number(medianCompetitor.toFixed(5)),
      aiCitationScore: Number(aiCitationScore.toFixed(5)),
      relativeAiVisibility: Number(relativeAiVisibility.toFixed(5)),
      averagePosition: Number((geminiBreakdown.positionScore || 0).toFixed(5)),
      searchVolume: 'N/A',
      sentiment: geminiBreakdown.sentimentScore > 0.5 ? 'Positive' : 
                 geminiBreakdown.sentimentScore < 0.3 ? 'Negative' : 'Neutral',
      platformBreakdown: aiScores,
      totalMentions: Number(mainMentions.toFixed(5))
    };
  };

  // Helper functions for competitor analysis
  const getScoreColor = (score: number) => {
    if (score >= 2.5) return 'bg-green-500';
    if (score >= 1.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreClass = (score: number) => {
    if (score >= 2.5) return 'text-green-600 font-semibold';
    if (score >= 1.5) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const formatScore = (score: number) => {
    return score.toFixed(4);
  };

  // Handle adding new competitor
  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      alert('Please enter a competitor name');
      return;
    }

    // Check if competitor already exists
    if (analysisResult?.competitors?.some((c: any) => c.name.toLowerCase() === newCompetitorName.toLowerCase())) {
      alert('This competitor is already in the analysis');
      return;
    }

    setIsAddingCompetitor(true);
    try {
      // Simulate adding competitor (in real implementation, this would call the API)
      const newCompetitor = {
        name: newCompetitorName.trim(),
        citationCount: Math.floor(Math.random() * 500) + 100,
        aiScores: {
          gemini: (Math.random() * 10 + 2).toFixed(4),
          perplexity: (Math.random() * 0.2).toFixed(4),
          claude: (Math.random() * 0.2).toFixed(4),
          chatgpt: 5.0000
        },
        totalScore: Math.random() * 5 + 1
      };
      
      // Update the analysis result with new competitor
      const updatedCompetitors = [...(analysisResult?.competitors || []), newCompetitor];
      setAnalysisResult({
        ...analysisResult,
        competitors: updatedCompetitors
      });
      
      setNewCompetitorName('');
      setShowAddForm(false);
      alert(`${newCompetitorName} has been added successfully!`);
      
    } catch (error: any) {
      console.error('Error adding competitor:', error);
      alert(`Failed to add competitor: ${error.message}`);
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  // Handle deleting competitor
  const handleDeleteCompetitor = (index: number) => {
    const competitorName = analysisResult?.competitors?.[index]?.name;
    if (window.confirm(`Are you sure you want to remove "${competitorName}" from the analysis?`)) {
      const updatedCompetitors = analysisResult?.competitors?.filter((_: any, i: number) => i !== index) || [];
      setAnalysisResult({
        ...analysisResult,
        competitors: updatedCompetitors
      });
    }
  };

  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Welcome {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-600 mt-2">Welcome to kabini.ai - Your AI-Powered Content Enhancement Platform</p>
        </div>
      </div>

      {/* Unified Website Analysis Dashboard Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Website Analysis Dashboard</h2>
          <p className="text-gray-600 text-lg">Enter your website URL or company name to get instant AI visibility insights and market positioning.</p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  setInputValue(value);
                  // Auto-detect URL type when URL is entered
                  if (value.includes('http://') || value.includes('https://') || value.includes('www.')) {
                    const detectedType = detectUrlType(value);
                    setAnalysisType(detectedType);
                    console.log('[Overview] Auto-detected URL type:', detectedType);
                    // Auto-detect industry preview into dropdown if user hasn't chosen one
                    try {
                      if (selectedIndustry === 'auto') {
                        const previewIndustry = detectIndustry(extractCompanyFromUrl(value), value);
                        const mapped = mapIndustryLabel(previewIndustry);
                        setSelectedIndustry(mapped);
                      }
                    } catch {}
                  }
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  setInputValue(value);
                  // Auto-detect URL type when URL is pasted
                  if (value.includes('http://') || value.includes('https://') || value.includes('www.')) {
                    const detectedType = detectUrlType(value);
                    setAnalysisType(detectedType);
                    console.log('[Overview] Auto-detected URL type (pasted):', detectedType);
                    // Auto-detect industry preview into dropdown if user hasn't chosen one
                    try {
                      if (selectedIndustry === 'auto') {
                        const previewIndustry = detectIndustry(extractCompanyFromUrl(value), value);
                        const mapped = mapIndustryLabel(previewIndustry);
                        setSelectedIndustry(mapped);
                      }
                    } catch {}
                  }
                })}
                onKeyDown={handleKeyDown}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isAnalyzing && inputValue.trim()) {
                    startAnalysis();
                  }
                }}
                required
                placeholder="Enter company name or URL"
                className="flex-1 px-4 py-4 border-2 border-blue-600 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-blue-600 text-lg h-[60px]"
                disabled={isAnalyzing}
              />
              
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="border-2 border-blue-600 rounded-xl px-3 text-gray-900 h-[60px] min-w-[240px]"
              disabled={isAnalyzing}
              title="Select industry"
            >
              <option value="auto">Industry</option>
              <option value="Information Technology & Services">Information Technology & Services</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Legal">Legal</option>
              <option value="Ecommerce & Retail">Ecommerce & Retail</option>
              <option value="Media">Media</option>
              <option value="Education">Education</option>
              <option value="Marketing & Advertising">Marketing & Advertising</option>
              <option value="Computer Software / Internet">Computer Software / Internet</option>
              <option value="Others">Others</option>
            </select>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg w-full lg:w-auto min-w-[140px] h-[60px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Now
                </>
              )}
            </button>
            {isAnalyzing && (
              <button
                onClick={() => { try { abortController?.abort(); } catch {}; setIsAnalyzing(false); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full lg:w-auto min-w-[120px] h-[60px]"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {analysisError && (
          <div className="mb-6 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{analysisError}</div>
        )}
        {showSuccessMessage && (
          <div className="mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">✅ Analysis completed successfully! Results are ready below.</div>
        )}

        {/* Overview Heading - Always show when there's analysis data */}
        {analysisResult && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          </div>
        )}



        {/* Dashboard Cards Removed - Keeping only the analysis results */}

        {/* Analysis Results and Competitor Table (post-analysis) */}
        {analysisResult && (
          <div className="space-y-6">
            
                        {/* Dashboard Cards - Show when we have analysis results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
              <AIVisibilityScoreCard 
                score={getAIVisibilityScore(analysisResult)} 
                industry={analysisResult?.industry}
                metrics={getAIVisibilityMetrics(analysisResult)}
              />
              <ShareOfAIVoiceCard 
                result={analysisResult}
              />
              <LLMPresenceCard 
                serviceStatus={analysisResult?.serviceStatus} 
                aiScores={analysisResult?.competitors?.[0]?.aiScores}
              />
              <CompetitorBenchmarkCard 
                competitors={analysisResult?.competitors || []}
                industry={analysisResult?.industry}
              />
              <SentimentAnalysisCard 
                competitors={analysisResult?.competitors || []}
                company={analysisResult?.company}
              />
              <div className="sm:col-span-2">
                <TopProductsKpiCard result={analysisResult} />
              </div>
            </div>

            {/* Competitor Analysis Heading - Always show when there's analysis data */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Competitor Analysis</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Period: Monthly</span>
            </div>  

            {/* Competitor Performance Overview Chart */}
            {analysisResult.competitors && analysisResult.competitors.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Competitor Performance Overview</h3>
                  <p className="text-sm text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
                </div>
                
                <div className="h-48 sm:h-56 lg:h-64 overflow-x-auto overflow-y-visible">
                  <div className="flex items-end h-full gap-3 sm:gap-4 min-w-max px-2 pb-2">
                  {analysisResult.competitors.map((competitor: any, index: number) => {
                    const avgScore = competitor.totalScore || 0;
                    // Adjust range: scale 0-10 to 0-100% but with better distribution
                    const heightPercentage = Math.min(95, Math.max(10, (avgScore / 10) * 85 + 10)); // 10-95% range
                    const barColor = getScoreColor(avgScore);
                    
                    return (
                      <div key={index} className="flex-none w-12 sm:w-16 h-full flex flex-col justify-end items-center relative">
                        {/* Score display at the bottom */}
                        <div className="mb-1 text-xs font-semibold text-gray-800 text-center whitespace-nowrap">
                          {formatScore(avgScore)}
                        </div>
                        
                        <div className="w-full h-full bg-gray-200 rounded-t-lg relative">
                          <div 
                            className={`${barColor} rounded-t-lg transition-all duration-500 ease-out absolute bottom-0 left-0 w-full`}
                            style={{ 
                              height: `${heightPercentage}%`,
                              minHeight: '20px'
                            }}
                          />
                        </div>
                        
                        {/* Company name at the bottom */}
                        <div className="mt-2 text-xs text-gray-600 text-center font-medium truncate w-full">
                          {competitor.name}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center flex-wrap justify-center gap-2 sm:gap-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                      <span>Excellent (8-10)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                      <span>Good (6-7.9)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                      <span>Fair (4-5.9)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                      <span>Poor (0-3.9)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add New Competitor Section - COMMENTED OUT */}
            {/* <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Competitor</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {showAddForm ? 'Cancel' : 'Add Competitor'}
                </button>
              </div>
              
              {showAddForm && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label htmlFor="competitor-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Competitor Company Name
                      </label>
                      <input
                        type="text"
                        id="competitor-name"
                        value={newCompetitorName}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          // Detect URL-like input: contains a dot or protocol and no spaces
                          const looksLikeUrl = /^(https?:\/\/)?[^\s]+\.[^\s]+/i.test(raw);
                          setIsUrlInput(looksLikeUrl);
                          if (looksLikeUrl) {
                            setNewCompetitorName(raw);
                          } else {
                            // Allow only A–Z and a–z for company name
                            const sanitized = raw.replace(/[^A-Za-z]/g, '');
                            setNewCompetitorName(sanitized);
                          }
                          try { (e.target as HTMLInputElement).setCustomValidity(''); } catch {}
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !isAddingCompetitor && newCompetitorName.trim()) {
                            handleAddCompetitor();
                          }
                        }}
                        placeholder="Enter competitor company name or paste a URL..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
                        onInvalid={(e) => {
                          e.preventDefault();
                          const msg = isUrlInput
                            ? 'Please enter a valid URL (e.g., https://example.com)'
                            : 'Only letters (A–Z, a–z) are allowed';
                          (e.target as HTMLInputElement).setCustomValidity(msg);
                        }}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (!value) { e.currentTarget.setCustomValidity(''); return; }
                          if (isUrlInput) {
                            const urlOk = /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/[^\s]*)?$/i.test(value);
                            e.currentTarget.setCustomValidity(urlOk ? '' : 'Please enter a valid URL (e.g., https://example.com)');
                          } else {
                            const nameOk = /^[A-Za-z]+$/.test(value);
                            e.currentTarget.setCustomValidity(nameOk ? '' : 'Only letters (A–Z, a–z) are allowed');
                          }
                        }}
                        disabled={isAddingCompetitor}
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={handleAddCompetitor}
                        disabled={isAddingCompetitor || !newCompetitorName.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAddingCompetitor ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                          </>
                        ) : (
                          'Add & Analyze'
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    The system will automatically analyze AI visibility scores for the new competitor.
                    {isAddingCompetitor && (
                      <span className="text-black font-medium">
                        {' '}This may take 30-60 seconds as we analyze across 4 AI engines.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div> */}

            {/* Competitors Comparison Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Competitors Comparison</h2>
                <p className="text-sm text-gray-600">Detailed scoring breakdown for each company across multiple models</p>
              </div>
              
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gemini
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perplexity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Claude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ChatGPT
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analysisResult.competitors.map((competitor: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-black">
                                  {competitor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{competitor.name}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Gemini Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.gemini)}`}>
                            {formatScore(competitor.aiScores.gemini)}
                          </span>
                        </td>
                        
                        {/* Perplexity Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.perplexity)}`}>
                            {formatScore(competitor.aiScores.perplexity)}
                          </span>
                        </td>
                        
                        {/* Claude Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.claude)}`}>
                            {formatScore(competitor.aiScores.claude)}
                          </span>
                        </td>
                        
                        {/* ChatGPT Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.chatgpt)}`}>
                            {formatScore(competitor.aiScores.chatgpt)}
                          </span>
                        </td>
                        
                        {/* Average Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${getScoreClass(competitor.totalScore)}`}>
                            {formatScore(competitor.totalScore)}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteCompetitor(index)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                            title="Delete competitor"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>




            

            

          </div>
        )}
      </div>
    </div>
  );
} 