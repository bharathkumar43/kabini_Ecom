import React, { useState, useEffect, useRef } from 'react';
import { computeMonthlyGrowth } from '../utils/formulas';
import { apiService } from '../services/apiService';

interface VisibilityBreakdown {
  mentionsScore: number;
  positionScore: number;
  sentimentScore: number;
  brandMentionsScore: number;
}

interface KeyMetrics {
  mentionsCount: number;
  position: number;
  sentiment: number;
  brandMentions: number;
  positiveWords: number;
  negativeWords: number;
}

interface CompetitorAnalysis {
  name: string;
  citationCount: number;
  aiScores: {
    gemini: number;
    perplexity: number;
    claude: number;
    chatgpt: number;
  };
  totalScore: number;
  breakdowns: {
    gemini: VisibilityBreakdown;
    perplexity: VisibilityBreakdown;
    claude: VisibilityBreakdown;
    chatgpt: VisibilityBreakdown;
  };
  keyMetrics: {
    gemini: KeyMetrics;
    perplexity: KeyMetrics;
    claude: KeyMetrics;
    chatgpt: KeyMetrics;
  };
  scrapedData?: any;
  analysis: {
    gemini: string;
    perplexity: string;
    claude: string;
    chatgpt: string;
  };
  audienceProfile?: {
    audience?: Array<{ label: string; confidence: number }>;
    demographics?: {
      region?: { label?: string; confidence?: number };
      companySize?: { label?: string; confidence?: number };
      industryFocus?: { label?: string; confidence?: number };
    };
  } | null;
  aiTraffic?: {
    byModel?: Record<string, number>;
    global?: number;
    weightedGlobal?: number;
  };
  citations?: {
    perModel?: Record<string, {
      citationCount: number;
      totalQueries: number;
      citationRate: number;
      rawCitationScore: number;
      citationScore: number;
    }>;
    global?: {
      citationCount: number;
      totalQueries: number;
      citationRate: number;
      rawCitationScore?: number;
      citationScore?: number;
      equalWeightedGlobal?: number;
    };
  };
  snippets?: Record<string, string>;
}

interface AIVisibilityTableProps {
  data: {
    company: string;
    industry: string;
    competitors: CompetitorAnalysis[];
  };
}

const AIVisibilityTable: React.FC<AIVisibilityTableProps> = ({ data }) => {
  console.log('[AIVisibilityTable] Rendering with data:', data);
  
  // Sorting state for traffic metrics table
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // Dropdown state removed; keep no state for dropdowns
  // Backlink table sorting and dropdown state
  const [backlinkSortConfig, setBacklinkSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  // Dropdown state removed; keep no state for dropdowns
  
  // Add error boundary state
  const [hasError, setHasError] = useState(false);

  // Old dropdown handlers removed

  // Single-click sorter: cycles asc -> desc -> none
  const cycleTrafficSort = (key: string) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' } as const;
      if (prev.direction === 'asc') return { key, direction: 'desc' } as const;
      return null;
    });
  };

  // Old backlink dropdown handlers removed

  const cycleBacklinkSort = (key: string) => {
    setBacklinkSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' } as const;
      if (prev.direction === 'asc') return { key, direction: 'desc' } as const;
      return null;
    });
  };

  // Get sorted competitors for traffic metrics
  const getSortedCompetitors = () => {
    if (!sortConfig) return competitors;

    return [...competitors].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.key) {
        case 'estimatedVisits':
          aValue = getTrafficMetricsFor(a).estimatedVisits;
          bValue = getTrafficMetricsFor(b).estimatedVisits;
          break;
        case 'pagesPerVisit':
          aValue = getTrafficMetricsFor(a).pagesPerVisit;
          bValue = getTrafficMetricsFor(b).pagesPerVisit;
          break;
        case 'bounceRate':
          aValue = getTrafficMetricsFor(a).bounceRate;
          bValue = getTrafficMetricsFor(b).bounceRate;
          break;
        case 'uniqueVisitors':
          aValue = getTrafficMetricsFor(a).uniqueVisitors;
          bValue = getTrafficMetricsFor(b).uniqueVisitors;
          break;
        case 'avgDuration':
          aValue = getTrafficMetricsFor(a).avgDuration;
          bValue = getTrafficMetricsFor(b).avgDuration;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };
  const [errorMessage, setErrorMessage] = useState('');
  
  const [competitors, setCompetitors] = useState(data.competitors || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [isUrlInput, setIsUrlInput] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationWarning, setValidationWarning] = useState('');
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  
  // Deterministic traffic metrics generator to prevent page sections from shifting on click
  const getTrafficMetricsFor = (comp: CompetitorAnalysis) => {
    const name = comp.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0; // 32-bit
    }
    const seed = Math.abs(hash % 1000) / 1000; // 0..1
    const score = comp.totalScore || 0;
    const estimatedVisits = Math.floor(score * 10000) + Math.floor(seed * 50000);
    const uniqueVisitors = Math.floor(estimatedVisits * 0.8);
    const pagesPerVisit = parseFloat((2 + score * 0.3 + seed * 0.2).toFixed(1));
    const avgDuration = Math.floor(score * 60 + 30 + seed * 30);
    const bounceRate = Math.max(20, 80 - score * 5 - Math.floor(seed * 5));
    return { estimatedVisits, uniqueVisitors, pagesPerVisit, avgDuration, bounceRate };
  };

  // Utility: stable 0..1 seed from a name and salt
  const seeded = (name: string, salt: string): number => {
    const key = `${name}::${salt}`;
    let h = 0;
    for (let i = 0; i < key.length; i += 1) {
      h = (h << 5) - h + key.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h % 1000) / 1000;
  };

  // Colors for legends/dots - deterministic by competitor name
  // Use the same color shades shown in the Competitive Positioning legend
  // Blue, Green, Amber/Orange, Pink, Violet, Cyan/Teal, Red, Emerald, Amber (lighter), Teal (lighter)
  const LEGEND_COLORS = [
    '#3b82f6', // blue-500 (Good)
    '#22c55e', // green-500 (Excellent)
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#ef4444', // red-500 (Poor)
    '#10b981', // emerald-500
    '#fbbf24', // amber-400
    '#14b8a6', // teal-500
  ];
  const getColorForName = (name: string): string => {
    const idx = Math.floor(seeded(name || 'unknown', 'color') * LEGEND_COLORS.length);
    return LEGEND_COLORS[idx];
  };

  // Optional model usage weights (1 = equal weighting)
  const MODEL_USAGE_WEIGHTS = {
    chatgpt: 1,
    gemini: 1,
    perplexity: 1,
    claude: 1,
  } as const;

  // Tooltip state for Growth Quadrant dots
  const [hoveredPoint, setHoveredPoint] = useState<null | { left: number; top: number; name: string; traffic: number; growth: number }>(null);
  // Tooltip state for AI Channel Mix stacked bars
  const [hoveredChannel, setHoveredChannel] = useState<null | { left: number; top: number; competitor: string; platform: string; percent: number; visits: number }>(null);
  const channelContainerRef = useRef<HTMLDivElement | null>(null);

  // Deterministic generators for other sections so values don't change on re-render
  // Replace classic channel mix with AI platform mix (ChatGPT, Gemini, Perplexity, Claude)
  const getChannelMixFor = (comp: CompetitorAnalysis) => {
    // Derive percentages from actual AI scores with small epsilon so tiny but non-zero values are visible
    const eps = 0.1;
    const rawChat = Math.max(0, Number(comp.aiScores.chatgpt) || 0) * MODEL_USAGE_WEIGHTS.chatgpt;
    const rawGem = Math.max(0, Number(comp.aiScores.gemini) || 0) * MODEL_USAGE_WEIGHTS.gemini;
    const rawPerp = Math.max(0, Number(comp.aiScores.perplexity) || 0) * MODEL_USAGE_WEIGHTS.perplexity;
    const rawCl = Math.max(0, Number(comp.aiScores.claude) || 0) * MODEL_USAGE_WEIGHTS.claude;

    const chatgptVisits = rawChat > 0 ? rawChat + eps : 0;
    const geminiVisits = rawGem > 0 ? rawGem + eps : 0;
    const perplexityVisits = rawPerp > 0 ? rawPerp + eps : 0;
    const claudeVisits = rawCl > 0 ? rawCl + eps : 0;
    const totalAI = Math.max(1e-6, chatgptVisits + geminiVisits + perplexityVisits + claudeVisits);

    const chatgpt = (chatgptVisits / totalAI) * 100;
    const gemini = (geminiVisits / totalAI) * 100;
    const perplexity = (perplexityVisits / totalAI) * 100;
    const claude = (claudeVisits / totalAI) * 100;

    return { chatgpt, gemini, perplexity, claude };
  };

  const getChannelVisitsFor = (comp: CompetitorAnalysis) => {
    // Use raw scores to compute comparable visit weights
    const scale = 1000; // display scaling only
    const eps = 0.1;
    const chatBase = Math.max(0, Number(comp.aiScores.chatgpt) || 0) * MODEL_USAGE_WEIGHTS.chatgpt;
    const gemBase = Math.max(0, Number(comp.aiScores.gemini) || 0) * MODEL_USAGE_WEIGHTS.gemini;
    const perpBase = Math.max(0, Number(comp.aiScores.perplexity) || 0) * MODEL_USAGE_WEIGHTS.perplexity;
    const claBase = Math.max(0, Number(comp.aiScores.claude) || 0) * MODEL_USAGE_WEIGHTS.claude;
    const chatgptVisits = Math.max(0, Math.round(((chatBase) + (chatBase > 0 ? eps : 0)) * scale));
    const geminiVisits = Math.max(0, Math.round(((gemBase) + (gemBase > 0 ? eps : 0)) * scale));
    const perplexityVisits = Math.max(0, Math.round(((perpBase) + (perpBase > 0 ? eps : 0)) * scale));
    const claudeVisits = Math.max(0, Math.round(((claBase) + (claBase > 0 ? eps : 0)) * scale));
    const totalAI = Math.max(1, chatgptVisits + geminiVisits + perplexityVisits + claudeVisits);
    return { chatgptVisits, geminiVisits, perplexityVisits, claudeVisits, totalAI };
  };

  const getGrowthFor = (comp: CompetitorAnalysis) => {
    // Create distinct growth patterns for each company to ensure quadrant distribution
    const nameHash = seeded(comp.name, 'growth');
    const scoreHash = seeded(comp.name, 'score');
    
    // Create four distinct growth categories based on company characteristics
    let growthScore;
    if (nameHash < 0.25) {
      // Game Changers: High growth, low traffic (will be positioned top-left)
      growthScore = 60 + (scoreHash * 40); // 60-100% growth
    } else if (nameHash < 0.5) {
      // Leaders: High growth, high traffic (will be positioned top-right)
      growthScore = 40 + (scoreHash * 40); // 40-80% growth
    } else if (nameHash < 0.75) {
      // Niche Players: Low growth, low traffic (will be positioned bottom-left)
      growthScore = -20 + (scoreHash * 30); // -20% to 10% growth
    } else {
      // Established Players: Low growth, high traffic (will be positioned bottom-right)
      growthScore = -10 + (scoreHash * 20); // -10% to 10% growth
    }
    
    return { growthScore: Math.round(growthScore) };
  };

  const getCompetitionGapFor = (comp: CompetitorAnalysis) => {
    const missing = Math.floor(seeded(comp.name, 'missing') * 200) + 50;
    const opportunity = Math.floor((comp.totalScore || 0) * 10 + seeded(comp.name, 'opportunity') * 20);
    return { missingKeywords: missing, opportunityScore: opportunity };
  };

  const getBacklinksFor = (comp: CompetitorAnalysis) => {
    const base = (comp.totalScore || 0) * 1000;
    const rand = seeded(comp.name, 'backlinks') * 5000;
    const totalBacklinks = Math.floor(base + rand);
    const referringDomains = Math.floor(totalBacklinks * 0.3 + seeded(comp.name, 'refDomains') * 200);
    const dofollowBacklinks = Math.floor(totalBacklinks * 0.8);
    const nofollowBacklinks = totalBacklinks - dofollowBacklinks;
    return { totalBacklinks, referringDomains, dofollowBacklinks, nofollowBacklinks };
  };
  
  // Validate data structure
  useEffect(() => {
    if (!data || !data.competitors) {
      console.error('[AIVisibilityTable] Invalid data structure:', data);
      setHasError(true);
      setErrorMessage('Invalid data structure received');
      return;
    }
    
    if (!Array.isArray(data.competitors)) {
      console.error('[AIVisibilityTable] Competitors is not an array:', data.competitors);
      setHasError(true);
      setErrorMessage('Competitors data is not in expected format');
      return;
    }
    
    setHasError(false);
    setErrorMessage('');
    console.log('[AIVisibilityTable] Data validation passed, competitors count:', data.competitors.length);
  }, [data]);

  const handleDeleteCompetitor = (index: number) => {
    const competitorName = competitors[index].name;
    if (window.confirm(`Are you sure you want to remove "${competitorName}" from the analysis?`)) {
      const updatedCompetitors = competitors.filter((_, i) => i !== index);
      setCompetitors(updatedCompetitors);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      alert('Please enter a competitor name');
      return;
    }

    // Check if competitor already exists
    if (competitors.some(c => c.name.toLowerCase() === newCompetitorName.toLowerCase())) {
      alert('This competitor is already in the analysis');
      return;
    }

    // Helper: extract and validate domain
    const normalizeDomainFromInput = (raw: string) => {
      try {
        let input = raw.trim();
        if (!/^https?:\/\//i.test(input)) {
          input = `https://${input}`;
        }
        const u = new URL(input);
        return u.hostname.toLowerCase();
      } catch {
        return raw.toLowerCase();
      }
    };
    const isLikelyDomainName = (value: string) => {
      const v = value.toLowerCase();
      return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(v);
    };
    const verifyDomainExists = async (domain: string): Promise<boolean> => {
      try {
        // Use Google's DNS-over-HTTPS API to check A records
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`);
        if (!res.ok) return false;
        const json = await res.json();
        return json && json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
      } catch {
        return false;
      }
    };

    setValidationWarning('');
    setIsCheckingDomain(true);
    const domainCandidate = normalizeDomainFromInput(newCompetitorName);
    const looksDomain = isLikelyDomainName(domainCandidate);
    let domainOk = false;
    if (looksDomain) {
      domainOk = await verifyDomainExists(domainCandidate);
    }
    setIsCheckingDomain(false);

    if (!looksDomain || !domainOk) {
      setValidationWarning('Please enter a valid domain (e.g., example.com). If you prefer, switch to Company Name.');
      // Keep the user in domain mode to correct, but offer toggle below
      setIsUrlInput(true);
      return;
    }

    console.log('[AIVisibilityTable] Adding competitor:', newCompetitorName);
    console.log('[AIVisibilityTable] Current industry:', data.industry);
    
    setIsAddingCompetitor(true);
    try {
      const response = await apiService.analyzeSingleCompetitor(newCompetitorName, data.industry);
      console.log('[AIVisibilityTable] API response received:', response);
      
      // Handle the backend response format: { success: true, data: competitorData }
      let newCompetitor;
      if (response && response.success && response.data) {
        newCompetitor = response.data;
        console.log('[AIVisibilityTable] Extracted competitor data:', newCompetitor);
      } else if (response && response.name) {
        // Direct competitor data (fallback)
        newCompetitor = response;
        console.log('[AIVisibilityTable] Using direct competitor data:', newCompetitor);
      } else {
        throw new Error('Invalid response format from API');
      }
      
      if (!newCompetitor || !newCompetitor.name) {
        throw new Error('Invalid competitor data received from API');
      }
      
      const updatedCompetitors = [...competitors, newCompetitor];
      console.log('[AIVisibilityTable] Updated competitors list:', updatedCompetitors);
      
      setCompetitors(updatedCompetitors);
      setNewCompetitorName('');
      setShowAddForm(false);
      setSuccessMessage(`${newCompetitorName} has been added successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding competitor:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to add competitor: ${message}`);
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100'; // Excellent (8-10)
    if (score >= 6) return 'text-blue-600 bg-blue-100'; // Good (6-7.9)
    if (score >= 4) return 'text-yellow-600 bg-yellow-100'; // Fair (4-5.9)
    return 'text-red-600 bg-red-100'; // Poor (0-3.9)
  };

  const getScoreClass = (score: number) => {
    if (score >= 8) return 'text-green-600 font-semibold'; // Excellent (8-10)
    if (score >= 6) return 'text-blue-600 font-semibold'; // Good (6-7.9)
    if (score >= 4) return 'text-yellow-600 font-semibold'; // Fair (4-5.9)
    return 'text-red-600 font-semibold'; // Poor (0-3.9)
  };

  // Bar color mapping to match legend colors (Excellent=green, Good=gray, Fair=yellow, Poor=red)
  const getBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'; // Excellent (8-10)
    if (score >= 6) return 'bg-blue-500'; // Good (6-7.9)
    if (score >= 4) return 'bg-yellow-500'; // Fair (4-5.9)
    return 'bg-red-500'; // Poor (0-3.9)
  };

  const formatScore = (score: number) => {
    return score.toFixed(4);
  };



  // Show error state if there's an issue
  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Competitor Data</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Summary Cards removed - Keeping only the competitor analysis functionality */}

      {/* Competitor Performance Chart */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-black">Competitor Performance Overview</h3>
            <p className="text-sm text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
          </div>
          
          <div className="h-48 sm:h-56 lg:h-64 overflow-x-auto overflow-y-visible">
            <div className="flex items-end h-full gap-3 sm:gap-4 min-w-max px-2 pb-2">
            {competitors.map((competitor, index) => {
              const avgScore = competitor.totalScore || 0;
              // Adjust range: scale 0-10 to 0-100% but with better distribution
              const heightPercentage = Math.min(95, Math.max(10, (avgScore / 10) * 85 + 10)); // 10-95% range
              const barColor = getBarColor(avgScore);
              
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



      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Competitor Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Add New Competitor</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
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
                    if (isUrlInput) {
                      setNewCompetitorName(raw);
                    } else {
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
                  placeholder="Enter a domain (e.g., example.com) or switch to Company Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-black placeholder-gray-400 bg-white"
                  onInvalid={(e) => {
                    e.preventDefault();
                    const msg = isUrlInput
                      ? 'Please enter a valid domain (e.g., example.com)'
                      : 'Only letters (A–Z, a–z) are allowed';
                    (e.target as HTMLInputElement).setCustomValidity(msg);
                  }}
                  onBlur={(e) => {
                    const value = e.currentTarget.value.trim();
                    if (!value) { e.currentTarget.setCustomValidity(''); return; }
                    if (!isUrlInput) {
                      const nameOk = /^[A-Za-z]+$/.test(value);
                      e.currentTarget.setCustomValidity(nameOk ? '' : 'Only letters (A–Z, a–z) are allowed');
                    } else {
                      const urlOk = /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/[^\s]*)?$/i.test(value);
                      e.currentTarget.setCustomValidity(urlOk ? '' : 'Please enter a valid domain (e.g., example.com)');
                    }
                  }}
                  disabled={isAddingCompetitor}
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-600">Input type:</span>
                  <button
                    type="button"
                    onClick={() => setIsUrlInput(true)}
                    className={`px-2 py-1 text-xs rounded ${isUrlInput ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
                  >Domain</button>
                  <button
                    type="button"
                    onClick={() => setIsUrlInput(false)}
                    className={`px-2 py-1 text-xs rounded ${!isUrlInput ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
                  >Company Name</button>
                  {isCheckingDomain && <span className="text-xs text-gray-500">Checking domain…</span>}
                </div>
                {validationWarning && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationWarning}{' '}
                    <button type="button" onClick={() => setIsUrlInput(false)} className="underline">
                      Switch to Company Name
                    </button>
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleAddCompetitor}
                  disabled={isAddingCompetitor || !newCompetitorName.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingCompetitor ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">Market Analysis Results</h2>
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
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RAVI
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((competitor, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-black">
                            {competitor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-black">{competitor.name}</div>
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
                  {/* RAVI */}
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    {typeof (competitor as any).ravi?.rounded === 'number' ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {(competitor as any).ravi.rounded}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td> */}
                  
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

      {/* Competitor Snapshot - Holistic Market Analysis */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-black">Competitor Snapshot</h3>
            <p className="text-sm text-gray-600">Holistic view of your site versus competitors across multiple dimensions</p>
          </div>

          {/* Traffic Metrics Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Traffic Metrics</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg text-black">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200" style={{ color: '#000' }}>
                        Competitor
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <span>EST.</span>
                          <span>VISITS</span>
                          <div className="mt-1">
                            <button 
                              onClick={() => cycleTrafficSort('estimatedVisits')}
                              className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors ${
                                sortConfig?.key === 'estimatedVisits' ? 'text-black' : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                                <div className="flex flex-col space-y-0.5">
                                  <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                                </div>
                              </div>
                            </button>
                            
                            {/* Dropdown removed: single click cycles asc -> desc -> none */}
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <span>PAGES/</span>
                          <span>VISIT</span>
                          <div className="mt-1">
                            <button 
                              onClick={() => cycleTrafficSort('pagesPerVisit')}
                              className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors ${
                                sortConfig?.key === 'pagesPerVisit' ? 'text-black' : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                                <div className="flex flex-col space-y-0.5">
                                  <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                                </div>
                              </div>
                            </button>
                            
                            {/* Dropdown removed */}
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <span>BOUNCE</span>
                          <span>RATE</span>
                          <div className="mt-1">
                            <button 
                              onClick={() => cycleTrafficSort('bounceRate')}
                              className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors ${
                                sortConfig?.key === 'bounceRate' ? 'text-black' : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                                <div className="flex flex-col space-y-0.5">
                                  <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                                </div>
                              </div>
                            </button>
                            
                            {/* Dropdown removed */}
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <span>UNIQUE</span>
                          <span>VISITORS</span>
                          <div className="mt-1">
                            <button 
                              onClick={() => cycleTrafficSort('uniqueVisitors')}
                              className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors ${
                                sortConfig?.key === 'uniqueVisitors' ? 'text-black' : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                                <div className="flex flex-col space-y-0.5">
                                  <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                                </div>
                              </div>
                            </button>
                            
                            {/* Dropdown removed */}
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <span>AVG</span>
                          <span>DURATION</span>
                          <div className="mt-1">
                            <button 
                              onClick={() => cycleTrafficSort('avgDuration')}
                              className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors ${
                                sortConfig?.key === 'avgDuration' ? 'text-black' : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                                <div className="flex flex-col space-y-0.5">
                                  <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                  <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                                </div>
                              </div>
                            </button>
                            
                            {/* Dropdown removed */}
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getSortedCompetitors().map((competitor, index) => {
                  const tm = getTrafficMetricsFor(competitor);
                  const estimatedVisits = tm.estimatedVisits;
                  const uniqueVisitors = tm.uniqueVisitors;
                  const pagesPerVisit = tm.pagesPerVisit.toFixed(1);
                  const avgDuration = tm.avgDuration;
                  const bounceRate = tm.bounceRate;
                  
                  return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-black">{competitor.name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black font-medium" style={{ color: '#000' }}>
                            {estimatedVisits.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black" style={{ color: '#000' }}>
                            {pagesPerVisit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black" style={{ color: '#000' }}>
                            {bounceRate}%
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black" style={{ color: '#000' }}>
                            {uniqueVisitors.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black" style={{ color: '#000' }}>
                            {avgDuration}s
                          </td>
                        </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Positioning & Growth Quadrant */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Market Positioning & Growth</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center mb-4">
                  <h5 className="font-medium text-black mb-2">Growth Quadrant Analysis</h5>
                  <p className="text-xs text-gray-600">Positioning based on Traffic vs Growth</p>
                  <div className="mt-2 text-xs text-gray-500">
                    <div className="flex justify-center space-x-4">
                      <span>← Low Traffic</span>
                      <span>High Traffic →</span>
                    </div>
                    <div className="mt-1">
                      <span>↑ High Growth</span>
                      <span className="ml-8">↓ Low Growth</span>
                    </div>
                  </div>
                </div>
                
                {/* Growth Quadrant Chart */}
                <div className="relative h-64 bg-white border border-gray-200 rounded-lg">
                  {/* Quadrant lines */}
                  <div className="absolute top-1/2 left-0 w-full h-px bg-gray-300"></div>
                  <div className="absolute left-1/2 top-0 w-px h-full bg-gray-300"></div>
                  
                  {/* Quadrant background colors for better visual distinction */}
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-50 opacity-30"></div>
                  <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-green-50 opacity-30"></div>
                  <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-yellow-50 opacity-30"></div>
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-purple-50 opacity-30"></div>
                  
                  {/* Quadrant labels - Clean positioning without axis labels */}
                  <div className="absolute top-4 left-4 text-xs font-medium text-gray-700">Game Changers</div>
                  <div className="absolute top-4 right-4 text-xs font-medium text-gray-700">Leaders</div>
                  <div className="absolute bottom-4 left-4 text-xs font-medium text-gray-700">Niche Players</div>
                  <div className="absolute bottom-4 right-4 text-xs font-medium text-gray-700">Established Players</div>
                  
                  {/* Competitor positions with hover tooltip */}
                  {competitors.map((competitor, index) => {
                    const { growthScore } = getGrowthFor(competitor);
                    
                    // Create distinct traffic patterns to complement growth categories
                    const nameHash = seeded(competitor.name, 'traffic');
                    const scoreHash = seeded(competitor.name, 'score');
                    
                    let trafficScore;
                    if (nameHash < 0.25) {
                      // Game Changers: Low traffic (left side)
                      trafficScore = 10 + (scoreHash * 30); // 10-40% traffic
                    } else if (nameHash < 0.5) {
                      // Leaders: High traffic (right side)
                      trafficScore = 60 + (scoreHash * 35); // 60-95% traffic
                    } else if (nameHash < 0.75) {
                      // Niche Players: Low traffic (left side)
                      trafficScore = 5 + (scoreHash * 35); // 5-40% traffic
                    } else {
                      // Established Players: High traffic (right side)
                      trafficScore = 55 + (scoreHash * 40); // 55-95% traffic
                    }
                    
                    // Convert growth score to position (higher growth = higher on chart)
                    const growthPosition = Math.max(5, Math.min(95, 50 + (growthScore / 2)));
                    
                    // Position companies across the full quadrant space
                    const left = trafficScore; // X-axis: Traffic (left to right)
                    const top = 100 - growthPosition; // Y-axis: Growth (top to bottom, inverted)
                    const color = getColorForName(competitor.name);
                    
                    // Debug logging to verify distribution
                    console.log(`${competitor.name}: Traffic=${trafficScore.toFixed(1)}, Growth=${growthScore}%, Position=(${left.toFixed(1)}, ${top.toFixed(1)})`);
                    
                    return (
                      <div
                        key={index}
                        className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg cursor-pointer"
                        style={{ left: `${left}%`, top: `${top}%`, backgroundColor: color }}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                          setHoveredPoint({
                            left: e.currentTarget.getBoundingClientRect().left - rect.left + 12,
                            top: e.currentTarget.getBoundingClientRect().top - rect.top - 8,
                            name: competitor.name,
                            traffic: Math.round(trafficScore),
                            growth: growthScore,
                          });
                        }}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                  {hoveredPoint && (
                    <div
                      className="absolute bg-white border border-gray-200 rounded-md shadow-md px-3 py-2 text-xs text-black"
                      style={{ left: hoveredPoint.left, top: hoveredPoint.top }}
                    >
                      <div className="font-medium">{hoveredPoint.name}</div>
                      <div>Traffic: {hoveredPoint.traffic}</div>
                      <div>Growth: {hoveredPoint.growth}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Channel Mix & Engagement (AI Platforms) */}
          <div className="mb-8">
            {/* AI Traffic Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h4 className="text-lg font-semibold text-gray-800">AI Traffic Share</h4>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Beta</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full bg-white text-black">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Competitor</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">ChatGPT %</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Gemini %</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Perplexity %</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Claude %</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Global %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {competitors.map((c, i) => {
                      const t = c.aiTraffic || { byModel: {}, global: 0 };
                      const fmt = (v?: number) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—');
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-black">{c.name}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmt(t.byModel?.chatgpt)}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmt(t.byModel?.gemini)}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmt(t.byModel?.perplexity)}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmt(t.byModel?.claude)}</td>
                          <td className="px-4 py-2 text-center text-sm font-semibold">{fmt(t.global)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Citation Metrics Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h4 className="text-lg font-semibold text-gray-800">AI Citation Metrics</h4>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">GEO</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full bg-white text-black">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Competitor</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">ChatGPT Rate</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Gemini Rate</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Perplexity Rate</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Claude Rate</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-black uppercase tracking-wider">Global Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {competitors.map((c, i) => {
                      const cm = (c.citations?.perModel || {}) as Record<string, { citationRate?: number }>;
                      const globalScore = c.citations?.global?.citationScore;
                      const fmtPct = (v?: number) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
                      const fmtPct0to100 = (v?: number) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-black">{c.name}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmtPct(cm?.chatgpt?.citationRate)}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmtPct(cm?.gemini?.citationRate)}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmtPct(cm?.perplexity?.citationRate)}</td>
                          <td className="px-4 py-2 text-center text-sm">{fmtPct(cm?.claude?.citationRate)}</td>
                          <td className="px-4 py-2 text-center text-sm font-semibold">{fmtPct0to100(globalScore)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
              <h4 className="text-lg font-semibold text-gray-800">AI Channel Mix</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Period: Monthly</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
              <div ref={channelContainerRef} className="relative h-48 min-w-full flex items-end gap-3 px-2" style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
                {competitors.map((competitor, index) => {
                  const { chatgpt, gemini, perplexity, claude } = getChannelMixFor(competitor);
                  const { chatgptVisits, geminiVisits, perplexityVisits, claudeVisits } = getChannelVisitsFor(competitor);
                  const barWidth = 48; // fixed width for consistent horizontal scroll
                  return (
                    <div key={index} className="flex flex-col items-center" style={{ width: barWidth, flex: '0 0 auto' }}>
                      <div className="relative w-full bg-gray-100 rounded-md border border-gray-200 flex items-end" style={{ height: '120px' }}>
                        {/* Stacked segments rendered with bottom offsets to avoid overlap */}
                        {[
                          { key: 'ChatGPT', color: 'bg-green-500', percent: chatgpt, visits: chatgptVisits },
                          { key: 'Gemini', color: 'bg-blue-500', percent: gemini, visits: geminiVisits },
                          { key: 'Perplexity', color: 'bg-yellow-500', percent: perplexity, visits: perplexityVisits },
                          { key: 'Claude', color: 'bg-purple-500', percent: claude, visits: claudeVisits }
                        ].reduce((acc: any[], seg) => {
                          const bottom = acc.length === 0 ? 0 : acc[acc.length - 1].bottom + acc[acc.length - 1].percent;
                          acc.push({ ...seg, bottom });
                          return acc;
                        }, []).map((seg, idx) => (
                          <div
                            key={idx}
                            className={`absolute left-0 w-full ${seg.color}`}
                            style={{ height: `${Math.max(1, seg.percent)}%`, bottom: `${seg.bottom}%` }}
                            onMouseEnter={(e) => {
                              const containerRect = channelContainerRef.current ? channelContainerRef.current.getBoundingClientRect() : (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                              setHoveredChannel({
                                left: e.currentTarget.getBoundingClientRect().left - containerRect.left + barWidth / 2,
                                top: e.currentTarget.getBoundingClientRect().top - containerRect.top - 8,
                                competitor: competitor.name,
                                platform: seg.key,
                                percent: seg.percent,
                                visits: seg.visits
                              });
                            }}
                            onMouseLeave={() => setHoveredChannel(null)}
                          />
                        ))}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-700 text-center font-medium w-full whitespace-nowrap overflow-hidden text-ellipsis" title={competitor.name}>{competitor.name}</div>
                    </div>
                  );
                })}
                {hoveredChannel && (
                  <div
                    className="absolute bg-white border border-gray-200 rounded-md shadow px-3 py-2 text-xs text-black"
                    style={{ left: hoveredChannel.left, top: hoveredChannel.top }}
                  >
                    <div className="font-medium">{hoveredChannel.competitor}</div>
                    <div>{hoveredChannel.platform}: {hoveredChannel.percent.toFixed(1)}%</div>
                    <div>Visits: {hoveredChannel.visits.toLocaleString()}</div>
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="mt-4 w-full flex items-center justify-center gap-6 text-xs text-gray-600">
                <div className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-green-500 rounded"></span> ChatGPT</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-blue-500 rounded"></span> Gemini</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-yellow-500 rounded"></span> Perplexity</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-purple-500 rounded"></span> Claude</div>
              </div>
            </div>
          </div>

          {/* Competition Level & Keyword Overlap */}
          <div className="mb-6 lg:mb-8">
            {/* Target Audience & Demographics */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Target Audience & Demographics</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Audience Chips */}
                <div className="space-y-3">
                  <h5 className="font-medium text-black">Audience</h5>
                  {competitors.map((c, i) => {
                    const aud = c.audienceProfile?.audience || [];
                    return (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm font-semibold text-black mb-2">{c.name}</div>
                        {aud.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {aud.map((a, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-800">
                                <span>{a.label}</span>
                                {typeof a.confidence === 'number' && (
                                  <span className="text-gray-500">({Math.round(a.confidence * 100)}%)</span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No data</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Demographics */}
                <div className="space-y-3">
                  <h5 className="font-medium text-black">Demographics</h5>
                  {competitors.map((c, i) => {
                    const d = c.audienceProfile?.demographics || {};
                    const region = d.region || {};
                    const size = d.companySize || {};
                    const focus = d.industryFocus || {};
                    const row = (label?: string, conf?: number) => (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{label || '—'}</span>
                        {typeof conf === 'number' && <span className="text-gray-500">{Math.round(conf * 100)}%</span>}
                      </div>
                    );
                    return (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm font-semibold text-black mb-2">{c.name}</div>
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">Region</div>
                          {row(region.label, region.confidence)}
                          <div className="text-xs text-gray-500 mt-2">Company Size</div>
                          {row(size.label, size.confidence)}
                          <div className="text-xs text-gray-500 mt-2">Industry Focus</div>
                          {row(focus.label, focus.confidence)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Competition Level & Keyword Overlap</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Competition Level */}
              <div className="space-y-4">
                <h5 className="font-medium text-black">Competition Level Ranking</h5>
                <div className="space-y-3">
                  {competitors.map((competitor, index) => {
                    const competitionLevel = Math.floor((competitor.totalScore || 0) * 10) + Math.floor(seeded(competitor.name, 'comp') * 30);
                    const sharedKeywords = Math.floor(competitionLevel * 10) + Math.floor(seeded(competitor.name, 'shared') * 100);
                    
                    return (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-black">{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-medium text-black">{competitor.name}</div>
                            <div className="text-sm text-gray-600">{sharedKeywords} shared keywords</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-black">{competitionLevel}</div>
                          <div className="text-xs text-gray-500">Competition Score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keyword Gap Analysis */}
              <div className="space-y-4">
                <h5 className="font-medium text-black">Keyword Gap Analysis</h5>
                <div className="space-y-3">
                  {competitors.map((competitor, index) => {
                    const { missingKeywords, opportunityScore } = getCompetitionGapFor(competitor);
                    
                    return (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-black">{competitor.name}</span>
                          <span className="text-xs text-gray-500">Opportunity</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Missing Keywords:</span>
                            <span className="font-medium">{missingKeywords}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${opportunityScore}%` }}></div>
                          </div>
                          <div className="text-right text-xs text-gray-500">{opportunityScore}% opportunity score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Backlink Profile Comparison */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Backlink Profile Comparison</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg text-black">
                <thead className="bg-gray-50" style={{ color: '#000' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200" style={{ color: '#000' }}>Competitor</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                      <div className="inline-flex items-center justify-center gap-2">
                        <div className="leading-tight text-center">
                          <div>Total</div>
                          <div>Backlinks</div>
                        </div>
                        <div>
                          <button
                            onClick={() => cycleBacklinkSort('totalBacklinks')}
                            className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors focus:outline-none focus:ring-0 ${backlinkSortConfig?.key === 'totalBacklinks' ? 'text-black' : 'text-gray-600 hover:text-gray-800'}`}
                          >
                            <div className="flex items-center">
                              <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                              <div className="flex flex-col space-y-0.5">
                                <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                              </div>
                            </div>
                          </button>
                          {/* Dropdown removed: click cycles sort */}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                      <div className="inline-flex items-center justify-center gap-2">
                        <div className="leading-tight text-center">
                          <div>Referring</div>
                          <div>Domains</div>
                        </div>
                        <div>
                          <button
                            onClick={() => cycleBacklinkSort('referringDomains')}
                            className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors focus:outline-none focus:ring-0 ${backlinkSortConfig?.key === 'referringDomains' ? 'text-black' : 'text-gray-600 hover:text-gray-800'}`}
                          >
                            <div className="flex items-center">
                              <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                              <div className="flex flex-col space-y-0.5">
                                <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                              </div>
                            </div>
                          </button>
                          {/* Dropdown removed */}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                      <div className="inline-flex items-center justify-center gap-2">
                        <div className="leading-tight text-center"><div>Dofollow</div></div>
                        <div>
                          <button onClick={() => cycleBacklinkSort('dofollowBacklinks')} className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors focus:outline-none focus:ring-0 ${backlinkSortConfig?.key === 'dofollowBacklinks' ? 'text-black' : 'text-gray-600 hover:text-gray-800'}`}>
                            <div className="flex items-center">
                              <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                              <div className="flex flex-col space-y-0.5">
                                <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                              </div>
                            </div>
                          </button>
                          {/* Dropdown removed */}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-gray-200">
                      <div className="inline-flex items-center justify-center gap-2">
                        <div className="leading-tight text-center"><div>Nofollow</div></div>
                        <div>
                          <button onClick={() => cycleBacklinkSort('nofollowBacklinks')} className={`p-1 rounded bg-transparent hover:bg-gray-100 transition-colors focus:outline-none focus:ring-0 ${backlinkSortConfig?.key === 'nofollowBacklinks' ? 'text-black' : 'text-gray-600 hover:text-gray-800'}`}>
                            <div className="flex items-center">
                              <div className="w-1 h-3 bg-gray-400 rounded-sm mr-1"></div>
                              <div className="flex flex-col space-y-0.5">
                                <div className="w-2 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1.5 h-0.5 bg-gray-600 rounded"></div>
                                <div className="w-1 h-0.5 bg-gray-600 rounded"></div>
                              </div>
                            </div>
                          </button>
                          {/* Dropdown removed */}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(backlinkSortConfig ? [...competitors].sort((a,b) => {
                    const aM = getBacklinksFor(a);
                    const bM = getBacklinksFor(b);
                    const key = backlinkSortConfig.key as keyof typeof aM;
                    const aV = aM[key] as unknown as number;
                    const bV = bM[key] as unknown as number;
                    return backlinkSortConfig.direction === 'asc' ? aV - bV : bV - aV;
                  }) : competitors).map((competitor, index) => {
                    const { totalBacklinks, referringDomains, dofollowBacklinks, nofollowBacklinks } = getBacklinksFor(competitor);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors" style={{ color: '#000' }}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black font-medium text-left" style={{ color: '#000' }}>{competitor.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black text-center" style={{ color: '#000' }}>{totalBacklinks.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black text-center" style={{ color: '#000' }}>{referringDomains.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black text-center" style={{ color: '#000' }}>{dofollowBacklinks.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black text-center" style={{ color: '#000' }}>{nofollowBacklinks.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Snippets */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-black">Analysis Snippets</h3>
          <p className="text-sm text-gray-600">Model-specific insights per competitor (trimmed)</p>
        </div>
        <div className="space-y-4">
          {competitors.map((c, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-black mb-2">{c.name}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {['chatgpt','gemini','perplexity','claude'].map((m) => (
                  <div key={m} className="bg-gray-50 rounded-md p-3">
                    <div className="text-xs uppercase text-gray-500 mb-1">{m}</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {((c as any).snippets?.[m] as string) || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};



export default AIVisibilityTable; 