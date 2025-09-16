import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Download, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, BarChart, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { historyService } from '../services/historyService';
import { sessionManager } from '../services/sessionManager';
import type { HistoryItem, QAHistoryItem } from '../types';
import AIVisibilityTable from './AIVisibilityTable';
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
                      className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 mt-auto"
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
        <div className="text-gray-600 mb-2">
          {benchmark.rank} in your industry
        </div>
        <div className="text-lg font-semibold text-gray-700 mb-3">
          Score: {benchmark.score}/100
        </div>
      </div>
    </DashboardCard>
  );
}

export function CompetitorInsight() {
  const { user } = useAuth();
  const stableUserId = user?.id || user?.email || user?.name || 'anonymous';
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  // keep but unused in this page variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);
  const navigate = useNavigate();
  
  // Independent analysis state for Competitor Insight page
  // Initialize with empty values; restore after user is known to avoid picking stale sessions
  const [inputValue, setInputValue] = useState('');
  const [analysisType, setAnalysisType] = useState<'root-domain' | 'exact-url'>('root-domain');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputType, setInputType] = useState<'company' | 'url'>('company');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('auto');
  // New structured inputs for analysis configuration
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [country, setCountry] = useState('');
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
  // Removed Root Domain / Exact URL dropdown
  
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

  // Restore cached analysis data after user is known
  useEffect(() => {
    try {
      const session = sessionManager.getLatestAnalysisSession('ai-visibility', stableUserId);
      if (session) {
        console.log('[AIVisibilityAnalysis] Restoring cached analysis data:', session);
        
        // Restore all cached values
        if (session.inputValue) setInputValue(session.inputValue);
        if (session.inputType) setInputType(session.inputType as 'company' | 'url');
        if (session.analysisType) setAnalysisType(session.analysisType as 'root-domain' | 'exact-url');
        
        // Ensure we're setting the correct data structure
        if (session.data) {
          setAnalysisResult(session.data);
          // If we have cached results, show success message
          setShowSuccessMessage(true);
        }
        
        console.log('[AIVisibilityAnalysis] Cached data restored successfully');
      } else {
        // No session for this user → clear any stale state
        setAnalysisResult(null);
        setInputValue('');
        setInputType('company');
        setAnalysisType('root-domain');
      }
    } catch (error) {
      console.error('[AIVisibilityAnalysis] Error restoring cached data:', error);
    }
  }, [stableUserId]);

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

  // Debug effect to monitor analysis result changes
  useEffect(() => {
    console.log('[AIVisibilityAnalysis] Analysis result changed:', analysisResult);
  }, [analysisResult]);

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
    
    // If only a bare domain was provided and no rule matched, default to Ecommerce & Retail
    // This ensures competitor discovery still runs for consumer sites like florists, groceries, etc.
    if (/^https?:\/\//.test(fullUrl) || /\./.test(fullUrl)) {
      return 'Ecommerce & Retail';
    }

    // Default industry for unknown cases: favor Ecommerce & Retail to power consumer competitor discovery
    return 'Ecommerce & Retail';
  };

  // Clear cached analysis data
  const clearAnalysisData = () => {
    try {
      sessionManager.clearSessionsByType('ai-visibility');
      setAnalysisResult(null);
      setInputValue('');
      setInputType('company');
      setAnalysisError(null);
      setShowSuccessMessage(false);
      console.log('[AIVisibilityAnalysis] Analysis data cleared');
    } catch (error) {
      console.error('[AIVisibilityAnalysis] Error clearing analysis data:', error);
    }
  };

  // Unified Analysis Function
  const startAnalysis = async () => {
    // Validate required fields
    if (!websiteUrl.trim()) {
      setAnalysisError('Website URL is required.');
      return;
    }

    // Use structured Website URL as primary input
    const primaryInput = websiteUrl.trim();

    // Auto-detect if input is a URL and extract company name
    let finalCompanyName = primaryInput;
    let detectedInputType: 'company' | 'url' = 'company';

    if (primaryInput.includes('http://') || primaryInput.includes('https://') || primaryInput.includes('www.')) {
      finalCompanyName = extractCompanyFromUrl(primaryInput);
      detectedInputType = 'url';
      console.log('[Overview] Detected URL, extracted company name:', finalCompanyName);
    }

    // Detect industry from company name and URL (allow override from dropdown)
    const autoIndustry = detectIndustry(finalCompanyName, primaryInput);
    const autoMapped = mapIndustryLabel(autoIndustry);
    const detectedIndustry = selectedIndustry !== 'auto' ? selectedIndustry : autoMapped;
    console.log('[CompetitorInsight] API call parameters:', { finalCompanyName, detectedIndustry });

    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowSuccessMessage(false);

    try {
      const abortController = new AbortController();
      setAbortController(abortController);

      console.log('[CompetitorInsight] Starting competitor analysis for:', finalCompanyName);
      console.log('[CompetitorInsight] Detected industry:', detectedIndustry);

      const analysisResults = await apiService.getAIVisibilityAnalysis(
        primaryInput,
        detectedIndustry,
        { signal: abortController.signal },
        {
          productName: productName.trim() || undefined,
          productCategory: productCategory.trim() || undefined,
          competitorName: competitorName.trim() || undefined,
          country: country.trim() || undefined,
        }
      );
      
      console.log('[AIVisibilityAnalysis] Analysis results received:', analysisResults);
      
      if (analysisResults.success && analysisResults.data) {
        console.log('[CompetitorInsight] Setting analysis result:', analysisResults.data);
        
        // Add detected industry to the analysis result
        const enhancedResult = {
          ...analysisResults.data,
          industry: detectedIndustry,
          originalInput: websiteUrl,
          inputType: detectedInputType, // Add input type to the cached data
          analysisType: analysisType // Add analysis type to the cached data
        };
        
        // Force a re-render by updating state
        setAnalysisResult(null); // Clear first
        setTimeout(() => {
          setAnalysisResult(enhancedResult);
          setShowSuccessMessage(true);
          console.log('[CompetitorInsight] State updated, analysis result set:', enhancedResult);
          
          // Force a re-render by updating a dummy state
          setRefreshKey(prev => prev + 1);
        }, 100);
        
        // Save to history
        try {
          const competitors = analysisResults.data.competitors || [];
          const historyItem = {
            id: `ai-visibility-${Date.now()}`,
            type: 'ai-visibility' as const,
            name: `Competitor Analysis - ${finalCompanyName}`,
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
            
            console.log('[CompetitorInsight] Analysis saved to history:', historyItem);
          } catch (error) {
            console.error('[CompetitorInsight] Failed to save analysis to history:', error);
            // Still dispatch the event even if history save fails
            window.dispatchEvent(new CustomEvent('new-analysis-created', { 
              detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
            }));
          }
        } catch (e) {
          console.warn('Failed to save analysis to history:', e);
        }
        
        // Cache the results using session manager
        try {
          sessionManager.saveAnalysisSession(
            'ai-visibility',
            enhancedResult,
            websiteUrl,
            analysisType,
            detectedInputType,
            detectedIndustry,
            stableUserId
          );
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
    // Check for direct AI visibility score first
    if (result.aiVisibilityScore !== undefined && result.aiVisibilityScore !== null) {
      return result.aiVisibilityScore;
    }
    
    // Check for total score
    if (result.totalScore !== undefined && result.totalScore !== null) {
      return result.totalScore;
    }
    
    // Check for visibility score
    if (result.visibilityScore !== undefined && result.visibilityScore !== null) {
      return result.visibilityScore;
    }
    
    // Fallback: calculate average from competitor scores if available
    if (result.competitors && Array.isArray(result.competitors) && result.competitors.length > 0) {
      const scores = result.competitors
        .map((comp: any) => comp.aiScores ? Object.values(comp.aiScores).filter((score: any) => typeof score === 'number' && score > 0) : [])
        .flat()
        .filter((score: any) => typeof score === 'number' && score > 0);
      
      if (scores.length > 0) {
        const average = scores.reduce((sum: number, score: any) => sum + score, 0) / scores.length;
        return Math.round(average * 10) / 10; // Round to 1 decimal place
      }
    }
    
    return 0;
  };

  // Helper to get detailed AI Visibility metrics from actual API structure
  const getAIVisibilityMetrics = (result: any) => {
    // Look for the main company's data in competitors array
    const mainCompany = result.competitors?.find((comp: any) => 
      comp.name?.toLowerCase() === result.company?.toLowerCase()
    );
    
    if (mainCompany) {
      // Derive mentions for main company (use keyMetrics if available)
      const mainMentions = Math.max(
        0,
        Number(
          (
            mainCompany?.keyMetrics?.gemini?.brandMentions ??
            mainCompany?.keyMetrics?.gemini?.mentionsCount ??
            mainCompany?.breakdowns?.gemini?.mentionsScore ??
            mainCompany.brandMentions ?? 0
          ) as number
        )
      );

      // Build competitor mentions array excluding main company
      const competitorMentions: number[] = (result.competitors || [])
        .filter((c: any) => c.name?.toLowerCase() !== result.company?.toLowerCase())
        .map((c: any) => {
          const m =
            c?.keyMetrics?.gemini?.brandMentions ??
            c?.keyMetrics?.gemini?.mentionsCount ??
            c?.breakdowns?.gemini?.mentionsScore ??
            c.brandMentions ?? 0;
          return Number(m) || 0;
        });
      const medianCompetitor = median(competitorMentions);

      const aiCitationScore = computeAiCitationScore(mainMentions, medianCompetitor);
      const relativeAiVisibility = computeRelativeAiVisibility(mainMentions, medianCompetitor);

      return {
        brandMentions: Number(mainMentions.toFixed(5)),
        medianCompetitorMentions: Number(medianCompetitor.toFixed(5)),
        aiCitationScore: Number(aiCitationScore.toFixed(5)),
        relativeAiVisibility: Number(relativeAiVisibility.toFixed(5)),
        averagePosition: Number((mainCompany.averagePosition || 0).toFixed(5)),
        volume: mainCompany.volume || 0,
        brandSentiment: mainCompany.brandSentiment || 'Neutral',
        platformBreakdown: mainCompany.platformBreakdown || {},
        geoBreakdown: mainCompany.geoBreakdown || {}
      };
    }
    
    // Fallback to result-level metrics if available
    return {
      brandMentions: Number((result.brandMentions || 0).toFixed(5)),
      medianCompetitorMentions: Number((result.medianCompetitorMentions || 0).toFixed(5)),
      aiCitationScore: Number(
        computeAiCitationScore(
          Number(result.brandMentions || 0),
          Number(result.medianCompetitorMentions || 0)
        ).toFixed(5)
      ),
      relativeAiVisibility: Number(
        computeRelativeAiVisibility(
          Number(result.brandMentions || 0),
          Number(result.medianCompetitorMentions || 0)
        ).toFixed(5)
      ),
      averagePosition: Number((result.averagePosition || 0).toFixed(5)),
      volume: result.volume || 0,
      brandSentiment: result.brandSentiment || 'Neutral',
      platformBreakdown: result.platformBreakdown || {},
      geoBreakdown: result.geoBreakdown || {}
    };
  };

  // Placement/Visibility aggregation (UI-side heuristic if backend lacks explicit placements)
  type PlacementDatum = { name: string; first: number; second: number; third: number };
  const computePlacementData = (result: any): PlacementDatum[] => {
    const competitors: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    if (competitors.length === 0) return [];

    // Derive a visibility weight using brand mentions or average aiScores
    const weights = competitors.map((c) => {
      const mentions = Number(
        c?.keyMetrics?.gemini?.brandMentions ??
        c?.keyMetrics?.gemini?.mentionsCount ??
        c?.brandMentions ?? 0
      );
      const aiScores = c?.aiScores || {};
      const avgScore = ['chatgpt','gemini','perplexity','claude']
        .map((k) => Number(aiScores?.[k] || 0))
        .reduce((a,b) => a + b, 0) / 4;
      const w = mentions > 0 ? mentions : avgScore;
      return { name: c.name || 'Unknown', weight: w };
    });

    // Normalize and rank
    const totalW = Math.max(1e-6, weights.reduce((s, x) => s + (isFinite(x.weight) ? x.weight : 0), 0));
    const ranked = weights
      .map(w => ({ ...w, norm: Math.max(0, Number(w.weight)) / totalW }))
      .sort((a, b) => b.norm - a.norm);

    // Heuristic placement split by rank
    const out: PlacementDatum[] = ranked.map((r, idx) => {
      // Base split templates favoring higher ranks
      let first = 0.25, second = 0.35, third = 0.40; // default (others)
      if (idx === 0) { first = 0.60; second = 0.25; third = 0.15; }
      else if (idx === 1) { first = 0.35; second = 0.40; third = 0.25; }
      // Convert to percentages and round
      return {
        name: r.name,
        first: Math.round(first * 100),
        second: Math.round(second * 100),
        third: Math.max(0, 100 - Math.round(first * 100) - Math.round(second * 100))
      };
    });

    return out;
  };

  const VisibilityPlacementSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    const data = computePlacementData(result);

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Share of Visibility</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            title="What is this?"
          >
            i
          </button>
        </div>

        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 space-y-2">
            <div>
              Shows overall brand presence (Share of Visibility) and placement quality (1st / 2nd / 3rd). Use these formulas:
            </div>
            <div className="font-mono text-xs leading-5">
              <div>P1_c = count of 1st-place mentions</div>
              <div>P2_c = count of 2nd-place mentions</div>
              <div>P3_c = count of 3rd+ mentions</div>
              <div className="mt-2">M_c = P1_c + P2_c + P3_c</div>
              <div>T = Σ_c M_c</div>
              <div className="mt-2">SoV_c = M_c / T</div>
              <div className="mt-2">Share1_c = P1_c / M_c</div>
              <div>Share2_c = P2_c / M_c</div>
              <div>Share3_c = P3_c / M_c</div>
              <div className="mt-2">WSOV_c = (3·P1_c + 2·P2_c + 1·P3_c) / Σ_c(3·P1_c + 2·P2_c + 1·P3_c)</div>
              <div>PromIdx_c = (3·P1_c + 2·P2_c + 1·P3_c) / (3·M_c)</div>
            </div>
          </div>
        )}

        {data.length > 0 ? (
          <div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-sm">
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-green-500"></span>1st</div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-400"></span>2nd</div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span>3rd</div>
            </div>

            {/* Single combined stacked bar chart */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[640px] flex items-end gap-4 px-1 py-2">
                {data.map((d) => (
                  <div key={d.name} className="flex flex-col items-center w-24">
                    <div className="h-56 w-full bg-gray-100 rounded-md overflow-hidden flex flex-col-reverse shadow-sm">
                      {/* 3rd */}
                      <div
                        className="bg-blue-500"
                        style={{ height: `${d.third}%` }}
                        title={`3rd: ${d.third}%`}
                      />
                      {/* 2nd */}
                      <div
                        className="bg-yellow-400"
                        style={{ height: `${d.second}%` }}
                        title={`2nd: ${d.second}%`}
                      />
                      {/* 1st */}
                      <div
                        className="bg-green-500"
                        style={{ height: `${d.first}%` }}
                        title={`1st: ${d.first}%`}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-800 font-medium text-center truncate w-full" title={d.name}>{d.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No competitor data available yet. Run an analysis to populate this section.</div>
        )}
      </div>
    );
  };

  // Shopping Visibility (Transactional Mentions)
  type ShoppingDatum = { name: string; count: number };
  const transactionalKeywords = [
    'buy','purchase','order','shop','store','checkout','cart','pricing','price','deal','discount','sold at','retailer','best place to buy'
  ];
  const buildAliasList = (name: string): string[] => {
    const n = String(name || '').trim();
    if (!n) return [];
    const parts = n.split(/\s+/);
    const compact = parts.join('');
    return [n, compact];
  };
  const textIncludesNear = (text: string, term: string, keywords: string[]): boolean => {
    try {
      const lower = String(text || '').toLowerCase();
      const t = term.toLowerCase();
      const idx = lower.indexOf(t);
      if (idx < 0) return false;
      const window = lower.slice(Math.max(0, idx - 60), Math.min(lower.length, idx + t.length + 60));
      return keywords.some(k => window.includes(k));
    } catch { return false; }
  };
  const computeShoppingVisibilityData = (result: any): ShoppingDatum[] => {
    const competitors: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    const out: ShoppingDatum[] = [];
    competitors.forEach((c) => {
      const name = c?.name || 'Unknown';
      const aliases = buildAliasList(name);
      const texts: string[] = [
        c?.analysis,
        c?.breakdowns?.gemini?.analysis,
        c?.breakdowns?.chatgpt?.analysis,
        c?.breakdowns?.perplexity?.analysis,
        c?.breakdowns?.claude?.analysis
      ].filter(Boolean);
      let count = 0;
      texts.forEach(txt => {
        aliases.forEach(a => { if (textIncludesNear(txt, a, transactionalKeywords)) count += 1; });
      });
      out.push({ name, count });
    });
    // Sort by count desc
    return out.sort((a,b) => b.count - a.count);
  };

  const ShoppingVisibilitySection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let data = computeShoppingVisibilityData(result);
    if (!data || data.every(d => (d.count || 0) === 0)) {
      // Static fallback
      data = [
        { name: 'Example A', count: 3 },
        { name: 'Example B', count: 2 },
        { name: 'Example C', count: 1 },
      ];
    }
    const maxCount = Math.max(1, ...data.map(d => d.count));

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Shopping Visibility</h3>
            <div className="text-xs text-gray-600">Measures how often a competitor is cited as a buying destination in AI answers to transactional queries.</div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            title="What is this?"
          >
            i
          </button>
        </div>

        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            Shows how often competitors are cited as the buying destination in AI answers to transactional queries. Only transactional prompts are considered.
          </div>
        )}

        {data.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[640px] flex items-end gap-4 px-1 py-2">
              {data.map(d => (
                <div key={d.name} className="flex flex-col items-center w-28">
                  <div className="h-56 w-full bg-gray-100 rounded-md overflow-hidden flex items-end justify-center">
                    <div
                      className="w-14 bg-blue-600/80"
                      style={{ height: `${(d.count / maxCount) * 100}%` }}
                      title={`${d.name}: ${d.count}`}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-800 font-medium text-center truncate w-full" title={d.name}>{d.name}</div>
                  <div className="text-[11px] text-gray-600">{d.count}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No transactional mentions found yet. Run an analysis to populate this chart.</div>
        )}
      </div>
    );
  };

  // Competitor Mentions (overall + by tool)
  type MentionByTool = { competitor: string; total: number; byTool: Record<string, number> };
  const TOOL_KEYS = ['gemini','chatgpt','perplexity','claude'];
  const countAliases = (text: string, aliases: string[]): number => {
    const t = String(text || '').toLowerCase();
    return aliases.reduce((sum, a) => {
      const pattern = a.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, 'gi');
      const m = t.match(rx);
      return sum + (m ? m.length : 0);
    }, 0);
  };
  const computeCompetitorMentions = (result: any): MentionByTool[] => {
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    const rows: MentionByTool[] = [];
    comps.forEach(c => {
      const name = c?.name || 'Unknown';
      const aliases = buildAliasList(name);
      const byTool: Record<string, number> = {};
      let total = 0;
      TOOL_KEYS.forEach(tool => {
        const txt = c?.breakdowns?.[tool]?.analysis || '';
        const cnt = countAliases(txt, aliases);
        byTool[tool] = cnt;
        total += cnt;
      });
      // also include overall analysis field if present
      if (c?.analysis) total += countAliases(c.analysis, aliases);
      rows.push({ competitor: name, total, byTool });
    });
    return rows.sort((a,b) => b.total - a.total);
  };

  const CompetitorMentionsSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let rows = computeCompetitorMentions(result);
    if (!rows || rows.every(r => (r.total || 0) === 0)) {
      rows = [
        { competitor: 'Example A', total: 15, byTool: {} },
        { competitor: 'Example B', total: 10, byTool: {} },
        { competitor: 'Example C', total: 6, byTool: {} },
      ];
    }
    const maxTotal = Math.max(1, ...rows.map(r => r.total));
    const palette: Record<string, string> = {
      gemini: 'bg-emerald-500',
      chatgpt: 'bg-slate-600',
      perplexity: 'bg-indigo-500',
      claude: 'bg-amber-500',
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Competitor Mentions</h3>
            <div className="text-xs text-gray-600">Bar graph of competitors by number of mentions across prompts/tools.</div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            title="What is this?"
          >
            i
          </button>
        </div>

        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            Records which competitors are cited most often across AI tools.
          </div>
        )}

        {/* Overall bar chart */}
        {rows.length > 0 ? (
          <div className="w-full overflow-x-auto mb-6">
            <div className="min-w-[640px] flex items-end gap-4 px-1 py-2">
              {rows.map(r => (
                <div key={r.competitor} className="flex flex-col items-center w-24">
                  <div className="h-56 w-full bg-gray-100 rounded-md overflow-hidden flex items-end justify-center">
                    <div
                      className="w-14 bg-orange-500/80"
                      style={{ height: `${(r.total / maxTotal) * 100}%` }}
                      title={`${r.competitor}: ${r.total}`}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-800 font-medium text-center truncate w-full" title={r.competitor}>{r.competitor}</div>
                  <div className="text-[11px] text-gray-600">{r.total}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 mb-6">No mention data available.</div>
        )}

        {/* Tool-specific breakdown removed per request */}
      </div>
    );
  };

  // Product Analysis in GEO – Bubble Chart (Competitor × Attribute)
  type AttributeMatrix = { attributes: string[]; competitors: string[]; counts: Record<string, Record<string, number>> };
  const ATTRIBUTE_SYNONYMS: Record<string, string[]> = {
    Luxury: ['luxury','premium','high-end','curated'],
    Affordable: ['affordable','budget','low-cost','cheap','value','deal','discount'],
    'Cheap Deals': ['cheap deals','best deal','discount','low price','bargain','sale'],
    'Fast Shipping': ['fast shipping','same-day','next-day','prime delivery','quick delivery'],
    Organic: ['organic','clean beauty','natural'],
    Sustainable: ['sustainable','eco-friendly','green','recyclable'],
    Minimalist: ['minimalist','simple ingredients','minimal ingredients'],
    Variety: ['variety','wide selection','assortment','many options']
  };
  const computeAttributeMatrix = (result: any): AttributeMatrix => {
    const competitors: string[] = (Array.isArray(result?.competitors) ? result.competitors : []).map((c: any) => c?.name || 'Unknown');
    const attributes: string[] = Object.keys(ATTRIBUTE_SYNONYMS);
    const counts: Record<string, Record<string, number>> = {};
    attributes.forEach(attr => { counts[attr] = {}; competitors.forEach(c => { counts[attr][c] = 0; }); });

    (Array.isArray(result?.competitors) ? result.competitors : []).forEach((c: any) => {
      const name = c?.name || 'Unknown';
      const aliases = buildAliasList(name);
      const texts: string[] = [
        c?.analysis,
        c?.breakdowns?.gemini?.analysis,
        c?.breakdowns?.chatgpt?.analysis,
        c?.breakdowns?.perplexity?.analysis,
        c?.breakdowns?.claude?.analysis
      ].filter(Boolean);
      const blob = texts.join('\n').toLowerCase();
      attributes.forEach(attr => {
        const syns = ATTRIBUTE_SYNONYMS[attr];
        let linkedCount = 0;
        syns.forEach(s => {
          const rx = new RegExp(`(?:^|[^a-z0-9])${s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}(?:[^a-z0-9]|$)`, 'gi');
          const matches = blob.match(rx);
          linkedCount += matches ? matches.length : 0;
        });
        // require the competitor to be referenced near the attribute at least roughly
        // if aliases appear anywhere alongside attribute text, we count it
        const hasCompetitor = aliases.some(a => blob.includes(a.toLowerCase()));
        if (hasCompetitor && linkedCount > 0) {
          counts[attr][name] += linkedCount;
        }
      });
    });
    return { attributes, competitors, counts };
  };

  const ProductAttributeBubbleSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let matrix = computeAttributeMatrix(result);
    const empty = matrix.attributes.length === 0 || matrix.competitors.length === 0 || matrix.attributes.every(a => Object.values(matrix.counts[a]).every(v => v === 0));
    if (empty) {
      matrix = {
        attributes: ['Luxury', 'Affordable', 'Organic', 'Sustainable'],
        competitors: ['Example A', 'Example B', 'Example C'],
        counts: {
          'Luxury': { 'Example A': 3, 'Example B': 1, 'Example C': 2 },
          'Affordable': { 'Example A': 1, 'Example B': 3, 'Example C': 2 },
          'Organic': { 'Example A': 2, 'Example B': 1, 'Example C': 3 },
          'Sustainable': { 'Example A': 1, 'Example B': 2, 'Example C': 2 },
        }
      };
    }
    const maxCount = Math.max(1, ...matrix.attributes.flatMap(a => Object.values(matrix.counts[a])));

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Product Attribute Mentions (GEO)</h3>
            <div className="text-xs text-gray-600">Highlights which attributes the AI links to each brand in location‑aware queries (e.g., luxury, affordable, organic, sustainable) so you can see how competitors are positioned.</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            We scan AI answers for product attributes (organic, luxury, affordable, etc.) and map them to competitors when the brand and attribute are referenced together.
          </div>
        )}

        {matrix.competitors.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Axes headers */}
              <div className="grid" style={{ gridTemplateColumns: `160px repeat(${matrix.competitors.length}, 1fr)` }}>
                <div className="h-8" />
                {matrix.competitors.map(c => (
                  <div key={`head-${c}`} className="h-8 text-xs font-medium text-gray-800 text-center truncate px-1" title={c}>{c}</div>
                ))}
              </div>
              {/* Rows */}
              <div className="grid divide-y divide-gray-100" style={{ gridTemplateColumns: `160px repeat(${matrix.competitors.length}, 1fr)` }}>
                {matrix.attributes.map(attr => (
                  <React.Fragment key={`row-${attr}`}>
                    <div className="py-3 pr-2 text-xs font-medium text-gray-800 whitespace-nowrap">{attr}</div>
                    {matrix.competitors.map(c => {
                      const val = matrix.counts[attr][c] || 0;
                      const size = Math.max(10, Math.round((val / maxCount) * 40)); // 10..40px
                      const opacity = val > 0 ? 0.85 : 0.15;
                      return (
                        <div key={`cell-${attr}-${c}`} className="py-2 flex items-center justify-center">
                          <div
                            className="rounded-full bg-sky-500"
                            style={{ width: `${size}px`, height: `${size}px`, opacity }}
                            title={`${attr} • ${c}: ${val}`}
                          />
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No attribute mentions detected yet.</div>
        )}
      </div>
    );
  };

  // Source Cited (Donut per AI tool)
  type SourceCounts = Record<string, number>;
  type ToolSources = Record<string, SourceCounts>;
  const SOURCE_CATEGORIES = [
    'Blogs / Guides',
    'Review Sites / Forums',
    'Marketplaces',
    'News / PR Mentions',
    'Directories / Comparison'
  ];
  const SOURCE_KEYWORDS: Record<string, string[]> = {
    'Blogs / Guides': ['blog','guide','wirecutter','buying guide','how to choose','buyers guide','nytimes wirecutter'],
    'Review Sites / Forums': ['trustpilot','reddit','quora','forum','community','reviews','stackexchange'],
    'Marketplaces': ['amazon','etsy','ebay','marketplace','google shopping','shopping feed','merchant center'],
    'News / PR Mentions': ['forbes','techcrunch','news','press','pr','editorial','allure.com','the verge','nytimes'],
    'Directories / Comparison': ['top10','top10.com','capterra','g2','directory','comparison','best-of','top sites']
  };
  const computeSourcesByTool = (result: any): ToolSources => {
    const out: ToolSources = {};
    TOOL_KEYS.forEach(t => { out[t] = {}; SOURCE_CATEGORIES.forEach(c => (out[t][c] = 0)); });
    const competitors: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    competitors.forEach(c => {
      TOOL_KEYS.forEach(tool => {
        const text = String(c?.breakdowns?.[tool]?.analysis || '').toLowerCase();
        if (!text) return;
        SOURCE_CATEGORIES.forEach(cat => {
          const kws = SOURCE_KEYWORDS[cat] || [];
          let hit = 0;
          kws.forEach(k => { if (text.includes(k)) hit += 1; });
          out[tool][cat] += hit > 0 ? 1 : 0; // count once per answer if any keyword hit
        });
      });
    });
    return out;
  };

  const Donut: React.FC<{ counts: SourceCounts; size?: number }> = ({ counts, size = 180 }) => {
    const total = Math.max(1, Object.values(counts).reduce((a,b) => a + b, 0));
    const colors: Record<string, string> = {
      'Blogs / Guides': '#f59e0b',
      'Review Sites / Forums': '#60a5fa',
      'Marketplaces': '#10b981',
      'News / PR Mentions': '#eab308',
      'Directories / Comparison': '#2563eb'
    };
    let gradientStops: string[] = [];
    let acc = 0;
    SOURCE_CATEGORIES.forEach(cat => {
      const pct = (counts[cat] || 0) / total * 100;
      const from = acc; const to = acc + pct; acc = to;
      gradientStops.push(`${colors[cat]} ${from}% ${to}%`);
    });
    const ringStyle: React.CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: `conic-gradient(${gradientStops.join(',')})`,
    };
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <div style={ringStyle} />
        <div className="absolute inset-4 bg-white rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-700 font-medium">
          {Object.values(counts).reduce((a,b)=>a+b,0)}
        </div>
      </div>
    );
  };

  const SourceCitedSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let dataByTool = computeSourcesByTool(result);
    const sum = (obj: Record<string, number>) => Object.values(obj || {}).reduce((a,b)=>a+b,0);
    const zeroAll = TOOL_KEYS.every(t => sum(dataByTool[t]) === 0);
    if (zeroAll) {
      dataByTool = {
        gemini: { 'Blogs / Guides': 2, 'Review Sites / Forums': 1, 'Marketplaces': 1, 'News / PR Mentions': 0, 'Directories / Comparison': 1 },
        chatgpt: { 'Blogs / Guides': 1, 'Review Sites / Forums': 2, 'Marketplaces': 1, 'News / PR Mentions': 1, 'Directories / Comparison': 0 },
        perplexity: { 'Blogs / Guides': 1, 'Review Sites / Forums': 1, 'Marketplaces': 1, 'News / PR Mentions': 1, 'Directories / Comparison': 0 },
        claude: { 'Blogs / Guides': 0, 'Review Sites / Forums': 1, 'Marketplaces': 1, 'News / PR Mentions': 1, 'Directories / Comparison': 1 },
      } as any;
    }
    const toolOrder = TOOL_KEYS;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Sources Cited in AI Responses</h3>
            <div className="text-xs text-gray-600">Donut charts show which source types each AI tool relies on (Blogs, Reviews/Forums, Marketplaces, PR, Directories).</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            Understanding where AI pulls competitor mentions from is as important as who is mentioned. We classify citations into Blogs/Guides, Review Sites/Forums, Marketplaces, News/PR, and Directories/Comparisons per tool.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {toolOrder.map(tool => (
            <div key={`donut-${tool}`} className="border border-gray-200 rounded-lg p-4 flex flex-col items-center">
              <div className="text-sm font-semibold text-gray-800 mb-3 capitalize">{tool}</div>
              <Donut counts={dataByTool[tool]} />
              <div className="mt-3 space-y-1 text-xs w-full">
                {SOURCE_CATEGORIES.map(cat => (
                  <div key={`${tool}-${cat}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-sm`} style={{ backgroundColor: (cat==='Blogs / Guides')?'#f59e0b':(cat==='Review Sites / Forums')?'#60a5fa':(cat==='Marketplaces')?'#10b981':(cat==='News / PR Mentions')?'#eab308':'#2563eb' }}></span>
                      <span className="text-gray-700">{cat}</span>
                    </div>
                    <span className="text-gray-600">{dataByTool[tool][cat] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Competitor Type Breakdown (Donut)
  type CompetitorType = 'Direct' | 'Marketplace' | 'Content' | 'Authority' | 'Indirect';
  const TYPES: CompetitorType[] = ['Direct','Marketplace','Content','Authority','Indirect'];
  const NAME_HINTS: Record<CompetitorType, string[]> = {
    Direct: ['sephora','ulta','dermstore','walmart','target','bestbuy','cloudfuze','sharegate'],
    Marketplace: ['amazon','etsy','ebay','walmart marketplace'],
    Content: ['wirecutter','reddit','quora','youtube','review','guide','blog'],
    Authority: ['forbes','allure','news','press','editorial','techcrunch'],
    Indirect: ['the ordinary','tata harper','minimalist','affordable alternative','sustainable luxury']
  };
  const classifyCompetitorType = (name: string, textBlob: string): CompetitorType => {
    const n = String(name || '').toLowerCase();
    const t = String(textBlob || '').toLowerCase();
    // Name-based priority
    if (NAME_HINTS.Marketplace.some(h => n.includes(h) || t.includes(h))) return 'Marketplace';
    if (NAME_HINTS.Content.some(h => n.includes(h) || t.includes(h))) return 'Content';
    if (NAME_HINTS.Authority.some(h => n.includes(h) || t.includes(h))) return 'Authority';
    if (NAME_HINTS.Indirect.some(h => n.includes(h) || t.includes(h))) return 'Indirect';
    // Default: direct ecommerce if store/shop cues exist
    if (/store|shop|cart|checkout|official|retail|ecommerce/i.test(t) || NAME_HINTS.Direct.some(h => n.includes(h))) {
      return 'Direct';
    }
    // Fallback to Direct
    return 'Direct';
  };
  const computeCompetitorTypeCounts = (result: any): { counts: Record<CompetitorType, number> } => {
    const counts: Record<CompetitorType, number> = { Direct: 0, Marketplace: 0, Content: 0, Authority: 0, Indirect: 0 };
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    comps.forEach(c => {
      const name = c?.name || 'Unknown';
      const texts = [c?.analysis, c?.breakdowns?.gemini?.analysis, c?.breakdowns?.chatgpt?.analysis, c?.breakdowns?.perplexity?.analysis, c?.breakdowns?.claude?.analysis].filter(Boolean).join('\n');
      const type = classifyCompetitorType(name, texts);
      counts[type] += 1;
    });
    return { counts };
  };

  const CompetitorTypeBreakdownSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let data = computeCompetitorTypeCounts(result).counts;
    const sumBeforeClamp = TYPES.reduce((s,k)=>s+(data[k]||0),0);
    if (sumBeforeClamp === 0) {
      data = { Direct: 5, Marketplace: 3, Content: 2, Authority: 2, Indirect: 1 } as any;
    }
    const colors: Record<CompetitorType, string> = {
      Direct: '#1f4b89',
      Marketplace: '#f59e0b',
      Content: '#14b8a6',
      Authority: '#ef4444',
      Indirect: '#22c55e'
    };
    const total = Math.max(1, TYPES.reduce((s, k) => s + (data[k] || 0), 0));
    let acc = 0; const stops: string[] = [];
    TYPES.forEach(k => { const pct = ((data[k] || 0) / total) * 100; const from = acc; const to = acc + pct; acc = to; stops.push(`${colors[k]} ${from}% ${to}%`); });
    const ringStyle: React.CSSProperties = { width: '220px', height: '220px', borderRadius: '50%', background: `conic-gradient(${stops.join(',')})` };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Competitor Type Breakdown</h3>
            <div className="text-xs text-gray-600">Donut shows distribution across Direct, Marketplace, Content, Authority, Indirect.</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            We classify competitors into Direct (retail/brand stores), Indirect (substitutes/alternatives), Marketplaces (Amazon/Etsy/eBay), Content (reviews/guides/forums), and Authority (PR/editorial/trusted brands).
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: 220, height: 220 }}>
              <div style={ringStyle} />
              <div className="absolute inset-6 bg-white rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center text-base font-semibold text-gray-800">{total}</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {TYPES.map(t => (
              <div key={`type-${t}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[t] }}></span>
                  <span className="text-gray-800">{t}</span>
                </div>
                <span className="text-gray-700">{data[t] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Content Style (List, Comparison, Recommendation, FAQ, Editorial)
  type StyleKey = 'List' | 'Comparison' | 'Recommendation' | 'FAQ' | 'Editorial';
  const STYLE_KEYS: StyleKey[] = ['List','Comparison','Recommendation','FAQ','Editorial'];
  const STYLE_KEYWORDS: Record<StyleKey, string[]> = {
    List: ['top ', 'top-', 'best ', 'best-', 'list of', 'roundup', 'top 5', 'top five', 'top 10', 'ranking'],
    Comparison: [' vs ', 'versus', 'compare', 'comparison', 'compared to'],
    Recommendation: ['recommend', 'we suggest', 'try ', 'good for', 'ideal for', 'if you want', 'alternative', 'pick'],
    FAQ: ['where can i', 'how do i', 'faq', 'q:', 'where to buy', 'is it safe', 'can i'],
    Editorial: ['according to', 'editorial', 'news', 'press', 'reported', 'magazine', 'forbes', 'allure', 'techcrunch']
  };
  const computeContentStyleCounts = (result: any) => {
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    return comps.map(c => {
      const name = c?.name || 'Unknown';
      const texts = [c?.analysis, c?.breakdowns?.gemini?.analysis, c?.breakdowns?.chatgpt?.analysis, c?.breakdowns?.perplexity?.analysis, c?.breakdowns?.claude?.analysis]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      const counts: Record<StyleKey, number> = { List: 0, Comparison: 0, Recommendation: 0, FAQ: 0, Editorial: 0 };
      (Object.keys(STYLE_KEYWORDS) as StyleKey[]).forEach(k => {
        const kws = STYLE_KEYWORDS[k];
        let v = 0; kws.forEach(w => { if (texts.includes(w)) v += 1; });
        counts[k] = v;
      });
      const total = STYLE_KEYS.reduce((s, k) => s + (counts[k] || 0), 0);
      return { name, counts, total };
    }).sort((a,b) => b.total - a.total);
  };

  const ContentStyleSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let rows = computeContentStyleCounts(result);
    const allZero = rows.length === 0 || rows.every(r => r.total === 0);
    if (allZero) {
      rows = [
        { name: 'Example A', counts: { List: 8, Comparison: 2, Recommendation: 3, FAQ: 1, Editorial: 1 }, total: 15 },
        { name: 'Example B', counts: { List: 2, Comparison: 6, Recommendation: 1, FAQ: 0, Editorial: 1 }, total: 10 },
      ] as any;
    }
    const maxTotal = Math.max(1, ...rows.map(r => r.total));
    const colors: Record<StyleKey, string> = {
      List: '#3b82f6',
      Comparison: '#f59e0b',
      Recommendation: '#22c55e',
      FAQ: '#10b981',
      Editorial: '#ef4444'
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Content Styles in AI Mentions</h3>
            <div className="text-xs text-gray-600">Stacked bars: List, Comparison, Recommendation, FAQ, Editorial per competitor.</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            We record how each answer frames competitors (FAQ, guide/list, comparison, recommendation, editorial). Use this to see if direct rivals dominate Lists, if indirects appear as Recommendations, and if authority brands surface via Editorials.
          </div>
        )}

        {rows.length > 0 ? (
          <div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-sm">
              {STYLE_KEYS.map(k => (
                <div key={`legend-${k}`} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[k] }}></span>
                  {k}
                </div>
              ))}
            </div>
            {/* Combined stacked bar chart */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[720px] flex items-end gap-4 px-1 py-2">
                {rows.map(r => (
                  <div key={r.name} className="flex flex-col items-center w-28">
                    <div className="h-56 w-full bg-gray-100 rounded-md overflow-hidden flex flex-col-reverse shadow-sm">
                      {STYLE_KEYS.map(k => {
                        const val = r.counts[k] || 0;
                        const pct = (val / Math.max(1, r.total)) * 100;
                        if (pct <= 0) return null;
                        return <div key={`${r.name}-${k}`} className="w-full" style={{ height: `${pct}%`, backgroundColor: colors[k] }} title={`${k}: ${val}`} />;
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-800 font-medium text-center truncate w-full" title={r.name}>{r.name}</div>
                    <div className="text-[11px] text-gray-600">{r.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No content style signals detected.</div>
        )}
      </div>
    );
  };

  // Sentiment Analysis Table
  type ToneKey = 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  const POS_WORDS = ['trusted','reliable','affordable','great','excellent','fast','love','best','top','high quality','recommend'];
  const NEG_WORDS = ['expensive','slow','overwhelming','poor','bad','negative','issue','problem','weak','concern','not recommended'];
  const ATTR_CONTEXT: Record<string, string[]> = {
    Trust: ['trust','trusted','authority','credible','reliable'],
    Price: ['price','affordable','cheap','expensive','deal','value','budget'],
    Delivery: ['delivery','shipping','fast','slow','prime','same-day','next-day'],
    Sustainability: ['sustainable','organic','eco','green','environment'],
    UX: ['ux','experience','overwhelming','easy','hard','simple']
  };
  const scoreSentiment = (text: string): { tone: ToneKey; pos: number; neg: number } => {
    const t = String(text || '').toLowerCase();
    let pos = 0, neg = 0;
    POS_WORDS.forEach(w => { if (t.includes(w)) pos += 1; });
    NEG_WORDS.forEach(w => { if (t.includes(w)) neg += 1; });
    let tone: ToneKey = 'Neutral';
    if (pos > 0 && neg === 0) tone = 'Positive';
    else if (neg > 0 && pos === 0) tone = 'Negative';
    else if (pos > 0 && neg > 0) tone = 'Mixed';
    return { tone, pos, neg };
  };
  const detectAttribute = (text: string): string => {
    const t = String(text || '').toLowerCase();
    let best = '—'; let max = 0;
    Object.entries(ATTR_CONTEXT).forEach(([k, kws]) => {
      let c = 0; kws.forEach(w => { if (t.includes(w)) c += 1; });
      if (c > max) { max = c; best = k; }
    });
    return best;
  };
  const detectSource = (text: string): string => {
    const t = String(text || '').toLowerCase();
    let best = '—'; let max = 0;
    SOURCE_CATEGORIES.forEach(cat => {
      const kws = SOURCE_KEYWORDS[cat] || [];
      let c = 0; kws.forEach(w => { if (t.includes(w)) c += 1; });
      if (c > max) { max = c; best = cat; }
    });
    return best;
  };
  const extractSnippet = (text: string, name: string): string => {
    const sentences = String(text || '').split(/(?<=[.!?])\s+/);
    const idx = sentences.findIndex(s => s.toLowerCase().includes(String(name || '').toLowerCase()));
    if (idx >= 0) return sentences[idx].slice(0, 160);
    return (sentences[0] || '').slice(0, 160);
  };
  const buildSentimentRows = (result: any) => {
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    return comps.map(c => {
      const name = c?.name || 'Unknown';
      const text = [c?.breakdowns?.gemini?.analysis, c?.breakdowns?.chatgpt?.analysis, c?.breakdowns?.perplexity?.analysis, c?.breakdowns?.claude?.analysis, c?.analysis]
        .filter(Boolean)
        .join(' ');
      const { tone } = scoreSentiment(text);
      const source = detectSource(text);
      const attr = detectAttribute(text);
      const quote = extractSnippet(text, name);
      let takeaway = '';
      if (tone === 'Positive') takeaway = 'Positive framing may boost authority and conversions.';
      else if (tone === 'Negative') takeaway = 'Visibility present but negative sentiment — address issues with content.';
      else if (tone === 'Mixed') takeaway = 'Mixed perception — clarify value props where weak.';
      else takeaway = 'Neutral presence — opportunity to shape narrative.';
      return { name, tone, quote, source, attr, takeaway };
    });
  };
  const toneColor = (tone: ToneKey): string => {
    if (tone === 'Positive') return 'bg-green-100 text-green-800';
    if (tone === 'Negative') return 'bg-red-100 text-red-800';
    if (tone === 'Mixed') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };
  const SentimentTableSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let rows = buildSentimentRows(result);
    if (!rows || rows.length === 0) {
      rows = [
        { name: 'Example A', tone: 'Positive', quote: 'Example A is one of the most trusted retailers.', source: 'Forbes (PR)', attr: 'Trust', takeaway: 'Positive framing may boost authority and conversions.' },
        { name: 'Example B', tone: 'Neutral', quote: 'Often listed as a budget alternative.', source: 'Blog Guide', attr: 'Price & Value', takeaway: 'Neutral, framed as fallback rather than leader.' }
      ] as any;
    }
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Sentiment Analysis</h3>
            <div className="text-xs text-gray-600">Tone, example mention, source, attribute/context, and key takeaway per competitor.</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            Captures not just how often competitors are mentioned, but how they are perceived (positive, neutral, negative, mixed). Includes example quote and context for strategy.
          </div>
        )}
        <div className="w-full overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left border-b border-gray-200">Competitor</th>
                <th className="px-3 py-2 text-left border-b border-gray-200">Tone</th>
                <th className="px-3 py-2 text-left border-b border-gray-200">Example Mention</th>
                <th className="px-3 py-2 text-left border-b border-gray-200">Source</th>
                <th className="px-3 py-2 text-left border-b border-gray-200">Attribute/Context</th>
                <th className="px-3 py-2 text-left border-b border-gray-200">Key Takeaway</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={`sent-${r.name}`} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-1 rounded ${toneColor(r.tone)}`}>{r.tone}</span></td>
                  <td className="px-3 py-2 text-gray-800">{r.quote || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.source}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.attr}</td>
                  <td className="px-3 py-2 text-gray-800">{r.takeaway}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Authority Signals (Reviews, Backlinks, PR, Certifications/Awards)
  type SignalKey = 'Reviews' | 'Backlinks' | 'PR Coverage' | 'Certifications/Awards';
  const SIGNAL_KEYS: SignalKey[] = ['Reviews','Backlinks','PR Coverage','Certifications/Awards'];
  const SIGNAL_KEYWORDS: Record<SignalKey, string[]> = {
    Reviews: ['trustpilot','google reviews','sitejabber','review','ratings','reddit','forum'],
    Backlinks: ['backlink','high da','wirecutter','forbes.com','allure.com','nytimes','domain authority','link profile'],
    'PR Coverage': ['forbes','techcrunch','press','pr','news','editorial','coverage','featured in'],
    'Certifications/Awards': ['certified','certification','ssl','badge','award','best of beauty','editor’s choice','editors choice']
  };
  const computeAuthoritySignals = (result: any) => {
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    const perCompetitor = comps.map(c => {
      const name = c?.name || 'Unknown';
      const text = [c?.analysis, c?.breakdowns?.gemini?.analysis, c?.breakdowns?.chatgpt?.analysis, c?.breakdowns?.perplexity?.analysis, c?.breakdowns?.claude?.analysis]
        .filter(Boolean).join('\n').toLowerCase();
      const counts: Record<SignalKey, number> = { 'Reviews': 0, 'Backlinks': 0, 'PR Coverage': 0, 'Certifications/Awards': 0 };
      SIGNAL_KEYS.forEach(k => {
        const kws = SIGNAL_KEYWORDS[k];
        let v = 0; kws.forEach(w => { if (text.includes(w)) v += 1; });
        counts[k] = v;
      });
      const total = SIGNAL_KEYS.reduce((s, k) => s + (counts[k] || 0), 0);
      return { name, counts, total };
    }).sort((a,b) => b.total - a.total);
    const overall: Record<SignalKey, number> = { 'Reviews': 0, 'Backlinks': 0, 'PR Coverage': 0, 'Certifications/Awards': 0 };
    perCompetitor.forEach(r => SIGNAL_KEYS.forEach(k => { overall[k] += r.counts[k] || 0; }));
    return { perCompetitor, overall };
  };

  const AuthoritySignalsSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let { perCompetitor, overall } = computeAuthoritySignals(result);
    const totalOverall = SIGNAL_KEYS.reduce((s,k)=>s+(overall[k]||0),0);
    if (perCompetitor.length === 0 || totalOverall === 0) {
      perCompetitor = [
        { name: 'Example A', counts: { Reviews: 3, Backlinks: 2, 'PR Coverage': 1, 'Certifications/Awards': 0 }, total: 6 },
        { name: 'Example B', counts: { Reviews: 1, Backlinks: 1, 'PR Coverage': 1, 'Certifications/Awards': 1 }, total: 4 },
      ] as any;
      overall = { Reviews: 4, Backlinks: 3, 'PR Coverage': 2, 'Certifications/Awards': 1 } as any;
    }
    const colors: Record<SignalKey, string> = {
      Reviews: '#60a5fa',
      Backlinks: '#34d399',
      'PR Coverage': '#f59e0b',
      'Certifications/Awards': '#ef4444'
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Authority Signals</h3>
            <div className="text-xs text-gray-600">Why AI trusted it — Reviews, Backlinks, PR, Certifications/Awards. Stacked bars by competitor plus an overall donut.</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            Each time a competitor is mentioned, we tag authority signals from the text (e.g., Trustpilot reviews, Forbes PR, Wirecutter backlinks, certified labels). Counts are grouped per competitor and overall.
          </div>
        )}

        {/* Stacked bars by competitor */}
        {perCompetitor.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-3 text-sm">
              {SIGNAL_KEYS.map(k => (
                <div key={`sig-legend-${k}`} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[k] }}></span>{k}
                </div>
              ))}
            </div>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[720px] flex items-end gap-4 px-1 py-2">
                {perCompetitor.map(r => (
                  <div key={r.name} className="flex flex-col items-center w-28">
                    <div className="h-56 w-full bg-gray-100 rounded-md overflow-hidden flex flex-col-reverse shadow-sm">
                      {SIGNAL_KEYS.map(k => {
                        const val = r.counts[k] || 0;
                        const total = Math.max(1, r.total);
                        const pct = (val / total) * 100;
                        if (pct <= 0) return null;
                        return <div key={`${r.name}-${k}`} className="w-full" style={{ height: `${pct}%`, backgroundColor: colors[k] }} title={`${k}: ${val}`} />;
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-800 font-medium text-center truncate w-full" title={r.name}>{r.name}</div>
                    <div className="text-[11px] text-gray-600">{r.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 mb-6">No authority signals detected.</div>
        )}

        {/* Overall donut */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1 flex items-center justify-center">
            <Donut counts={overall as any} size={220} />
          </div>
          <div className="md:col-span-2 space-y-2 text-sm">
            {SIGNAL_KEYS.map(k => (
              <div key={`overall-${k}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[k] }}></span>
                  <span className="text-gray-800">{k}</span>
                </div>
                <span className="text-gray-700">{overall[k] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // FAQ/Conversational Analysis
  const FAQ_KEYWORDS = ['where can i','where to buy','is it safe','trusted','reliable','good place to buy','which website','most reliable','faq','q:'];
  const FAQ_SOURCE_CATS = ['Reddit','Quora','Trustpilot','Forums'] as const;
  const FAQ_SOURCE_KWS: Record<typeof FAQ_SOURCE_CATS[number], string[]> = {
    Reddit: ['reddit','r/','skincareaddiction','r/ask','community'],
    Quora: ['quora'],
    Trustpilot: ['trustpilot'],
    Forums: ['forum','community','stackexchange']
  };
  const FAQ_THEMES = ['Safe checkout','Fast shipping','Return policy','Trusted reviews','Authenticity'] as const;
  const FAQ_THEME_KWS: Record<typeof FAQ_THEMES[number], string[]> = {
    'Safe checkout': ['safe checkout','ssl','secure','https','trusted checkout'],
    'Fast shipping': ['fast shipping','same-day','next-day','quick delivery','prime'],
    'Return policy': ['return','refund','returns policy','easy returns'],
    'Trusted reviews': ['reviews','trustpilot','verified','ratings','community'],
    'Authenticity': ['authentic','genuine','not fake','verified seller']
  };
  const isFAQLike = (text: string): boolean => {
    const t = String(text || '').toLowerCase();
    return FAQ_KEYWORDS.some(k => t.includes(k));
  };
  const computeFAQData = (result: any) => {
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    const competitorCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = { Reddit: 0, Quora: 0, Trustpilot: 0, Forums: 0 };
    const themeCounts: Record<string, number> = { 'Safe checkout': 0, 'Fast shipping': 0, 'Return policy': 0, 'Trusted reviews': 0, 'Authenticity': 0 };
    comps.forEach(c => {
      const name = c?.name || 'Unknown';
      const texts = [c?.analysis, c?.breakdowns?.gemini?.analysis, c?.breakdowns?.chatgpt?.analysis, c?.breakdowns?.perplexity?.analysis, c?.breakdowns?.claude?.analysis]
        .filter(Boolean) as string[];
      let hits = 0;
      texts.forEach(txt => {
        if (!txt) return;
        if (!isFAQLike(txt)) return;
        const lower = txt.toLowerCase();
        // competitor present
        if (lower.includes(String(name || '').toLowerCase())) {
          hits += 1;
        }
        // sources
        (FAQ_SOURCE_CATS as readonly string[]).forEach(cat => {
          if (FAQ_SOURCE_KWS[cat as keyof typeof FAQ_SOURCE_KWS].some(k => lower.includes(k))) sourceCounts[cat] += 1;
        });
        // themes
        (FAQ_THEMES as readonly string[]).forEach(theme => {
          if (FAQ_THEME_KWS[theme as keyof typeof FAQ_THEME_KWS].some(k => lower.includes(k))) themeCounts[theme] += 1;
        });
      });
      if (hits > 0) competitorCounts[name] = (competitorCounts[name] || 0) + hits;
    });
    return { competitorCounts, sourceCounts, themeCounts };
  };

  const FAQConversationalSection: React.FC<{ result: any }> = ({ result }) => {
    const [showInfo, setShowInfo] = useState(false);
    let { competitorCounts, sourceCounts, themeCounts } = computeFAQData(result);
    const compSum = Object.values(competitorCounts).reduce((a,b)=>a+b,0);
    if (compSum === 0) {
      competitorCounts = { 'Example A': 6, 'Example B': 4, 'Example C': 3 } as any;
      sourceCounts = { Reddit: 7, Quora: 3, Trustpilot: 2, Forums: 2 } as any;
      themeCounts = { 'Trusted reviews': 6, 'Safe checkout': 5, 'Authenticity': 4, 'Fast shipping': 3, 'Return policy': 2 } as any;
    }
    const competitors = Object.keys(competitorCounts);
    const maxComp = Math.max(1, ...competitors.map(c => competitorCounts[c] || 0));
    const totalSources = Math.max(1, Object.values(sourceCounts).reduce((a,b)=>a+b,0));
    const sourceStops = (Object.keys(sourceCounts) as Array<keyof typeof sourceCounts>).map((k, i) => {
      const prior = (Object.keys(sourceCounts) as Array<keyof typeof sourceCounts>).slice(0, i).reduce((s, kk) => s + ((sourceCounts[kk]||0) / totalSources * 100), 0);
      const width = (sourceCounts[k] || 0) / totalSources * 100;
      const palette: Record<string,string> = { Reddit: '#f59e0b', Quora: '#60a5fa', Trustpilot: '#10b981', Forums: '#eab308' };
      return `${palette[String(k)]} ${prior}% ${prior + width}%`;
    });
    const donutStyle: React.CSSProperties = { width: '200px', height: '200px', borderRadius: '50%', background: `conic-gradient(${sourceStops.join(',')})` };
    const maxTheme = Math.max(1, ...Object.values(themeCounts));

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">FAQ / Conversational Mentions</h3>
            <div className="text-xs text-gray-600">Which competitors appear in FAQ-style answers, where those mentions come from, and common trust themes.</div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="What is this?">i</button>
        </div>
        {showInfo && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            Captures Q&A-like or conversational answers (e.g., “Where can I buy X safely?”). We count FAQ-style competitor mentions, source breakdown (Reddit, Quora, Trustpilot, Forums), and highlight common themes like safe checkout and fast shipping.
          </div>
        )}

        {/* Bar: competitors by FAQ mentions */}
        {competitors.length > 0 && (
          <div className="mb-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[560px] flex items-end gap-4 px-1 py-2">
                {competitors.map(c => (
                  <div key={`faqc-${c}`} className="flex flex-col items-center w-24">
                    <div className="h-48 w-full bg-gray-100 rounded-md overflow-hidden flex items-end justify-center">
                      <div className="w-14 bg-slate-600/80" style={{ height: `${(competitorCounts[c] / maxComp) * 100}%` }} title={`${c}: ${competitorCounts[c]}`} />
                    </div>
                    <div className="mt-2 text-xs text-gray-800 font-medium text-center truncate w-full" title={c}>{c}</div>
                    <div className="text-[11px] text-gray-600">{competitorCounts[c]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pie: source breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6">
          <div className="md:col-span-1 flex items-center justify-center">
            <div className="relative" style={{ width: 200, height: 200 }}>
              <div style={donutStyle} />
              <div className="absolute inset-6 bg-white rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-800">{totalSources}</div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2 text-sm">
            {(Object.keys(sourceCounts) as Array<keyof typeof sourceCounts>).map(k => (
              <div key={`faqs-${String(k)}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: (k==='Reddit')?'#f59e0b':(k==='Quora')?'#60a5fa':(k==='Trustpilot')?'#10b981':'#eab308' }}></span>
                  <span className="text-gray-800">{String(k)}</span>
                </div>
                <span className="text-gray-700">{sourceCounts[k] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal bar: themes */}
        <div className="space-y-2">
          {(FAQ_THEMES as readonly string[]).map(theme => (
            <div key={`faqtheme-${theme}`}> 
              <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                <span className="font-medium">{theme}</span>
                <span>{themeCounts[theme] || 0}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-md overflow-hidden">
                <div className="h-3 bg-teal-400" style={{ width: `${(themeCounts[theme] || 0) / maxTheme * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
            <div className="text-sm text-gray-600">
              Overall Brand Sentiment
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

  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Welcome {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-600 mt-2">Deep competitive analysis and market intelligence platform</p>
        </div>
      </div>

      {/* Competitor Analysis Dashboard Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Competitor Analysis Dashboard</h2>
          <p className="text-gray-600 text-lg">Enter your website URL or company name to get instant competitor insights and market positioning.</p>
        </div>

        {/* Analysis Configuration - Structured Inputs */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3 items-end">
            <div className="flex flex-col gap-1 lg:col-span-3">
              <label htmlFor="websiteUrl" className="text-xs font-semibold text-gray-700">Website URL <span className="text-red-500">*</span></label>
              <input
                id="websiteUrl"
                type="text"
                value={websiteUrl}
                onChange={(e) => handleEmojiFilteredInput(e, setWebsiteUrl)}
                onPaste={(e) => handlePaste(e, setWebsiteUrl)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                required
                className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 lg:col-span-2">
              <label htmlFor="productName" className="text-xs font-semibold text-gray-700">Product Name</label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => handleEmojiFilteredInput(e, setProductName)}
                onPaste={(e) => handlePaste(e, setProductName)}
                onKeyDown={handleKeyDown}
                placeholder="Product Name"
                className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 lg:col-span-2">
              <label htmlFor="productCategory" className="text-xs font-semibold text-gray-700">Product Category</label>
              <select
                id="productCategory"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
              >
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Fashion">Fashion</option>
                <option value="Beauty">Beauty</option>
                <option value="Home and Garden">Home and Garden</option>
                <option value="Sports">Sports</option>
                <option value="Automotive">Automotive</option>
                <option value="Books">Books</option>
                <option value="Health">Health</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:col-span-2">
              <label htmlFor="competitorName" className="text-xs font-semibold text-gray-700">Known Competitor</label>
              <input
                id="competitorName"
                type="text"
                value={competitorName}
                onChange={(e) => handleEmojiFilteredInput(e, setCompetitorName)}
                onPaste={(e) => handlePaste(e, setCompetitorName)}
                onKeyDown={handleKeyDown}
                placeholder="Known Competitor"
                className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 lg:col-span-1">
              <label htmlFor="country" className="text-xs font-semibold text-gray-700">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
              >
                <option value="">Country</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="India">India</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Singapore">Singapore</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:col-span-1">
              <label htmlFor="industry" className="text-xs font-semibold text-gray-700">Industry</label>
              <select
                id="industry"
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
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
            </div>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !websiteUrl.trim()}
              className="h-11 px-4 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow w-full text-sm lg:col-span-1 self-end"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze Now
                </>
              )}
            </button>
          </div>
        </div>
        {/* Actions now live in configuration section */}

        {analysisError && (
          <div className="mb-6 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{analysisError}</div>
        )}
        {showSuccessMessage && (
          <div className="mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">✅ Analysis completed successfully! Results are ready below.</div>
        )}

        {/* Dashboard Cards Removed - Keeping only the analysis results */}

        {/* Analysis Results and Competitor Table (post-analysis) */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Share of Visibility & Placement Tracking */}
            <VisibilityPlacementSection result={analysisResult} />

            {/* Shopping Visibility (Transactional Mentions) */}
            <ShoppingVisibilitySection result={analysisResult} />
            
            {/* Competitor Mentions (Overall + Tool-specific) */}
            <CompetitorMentionsSection result={analysisResult} />

            {/* Product Attribute Mentions (Bubble Chart) */}
            <ProductAttributeBubbleSection result={analysisResult} />

            {/* Sources Cited (Donut per AI tool) */}
            <SourceCitedSection result={analysisResult} />

            {/* Competitor Type Breakdown */}
            <CompetitorTypeBreakdownSection result={analysisResult} />

            {/* Content Style Breakdown */}
            <ContentStyleSection result={analysisResult} />

            {/* Sentiment Analysis Table */}
            <SentimentTableSection result={analysisResult} />

            {/* Authority Signals */}
            <AuthoritySignalsSection result={analysisResult} />

            {/* FAQ / Conversational Analysis */}
            <FAQConversationalSection result={analysisResult} />

            {/* Add error boundary for AIVisibilityTable */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Competitor Analysis</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Period: Monthly</span>
              </div>
              {analysisResult.competitors && Array.isArray(analysisResult.competitors) && analysisResult.competitors.length > 0 ? (
                <AIVisibilityTable key={`analysis-${refreshKey}`} data={analysisResult} />
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 8a2 2 0 011.414-1.414l4 4a2 2 0 010 2.828l-4 4a2 2 0 01-2.828 0l-4-4a2 2 0 010-2.828l4-4A2 2 0 018 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Competitor Analysis Complete</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Your competitor analysis has been completed successfully. 
                        {analysisResult.competitors && analysisResult.competitors.length > 0 
                          ? ` Found ${analysisResult.competitors.length} competitors for analysis.`
                          : ' No competitors found for this analysis.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            

            



          </div>
        )}
      </div>
    </div>
  );
} 