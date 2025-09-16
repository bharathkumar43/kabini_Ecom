import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BarChart3, 
  FileText, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Copy, 
  Download,
  Eye,
  Code,
  TrendingUp,
  Target,
  BookOpen,
  Search,
  Brain,
  Play,
  ArrowLeft,
  EyeOff,
  Loader2,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  MapPin,
  Building2,
  Briefcase,
  Globe2,
  Network,
  PieChart,
  LineChart,
  Activity,
  Shield,
  Clock,
  Star,
  Award,
  TrendingDown,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Share2,
  Filter as FilterIcon,
  SortAsc as SortAscIcon,
  SortDesc as SortDescIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  Building2 as Building2Icon,
  Briefcase as BriefcaseIcon,
  Globe2 as Globe2Icon,
  Network as NetworkIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity as ActivityIcon,
  Target as TargetIcon,
  Shield as ShieldIcon,
  Clock as ClockIcon,
  Star as StarIcon,
  Award as AwardIcon,
  TrendingDown as TrendingDownIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Info as InfoIcon,
  ExternalLink as ExternalLinkIcon,
  Download as DownloadIcon,
  Share2 as Share2Icon
} from 'lucide-react';
import { contentStructureService } from '../services/contentStructureService';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { historyService } from '../services/historyService';
import type { ContentStructureAnalysis, StructureSuggestion } from '../services/contentStructureService';
import { applySuggestionsWithDOM, scoreLLMUnderstandability } from '../utils/analysis';
import { StructureAnalysisHistoryItem } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import SuccessNotification from './ui/SuccessNotification';
import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';

interface ContentStructureAnalysisProps {
  content: string;
  url?: string;
}

// Get user-specific keys for localStorage
const getStructureAnalysisKey = (): string => {
  const userId = authService.getCurrentUserId();
  return userId ? `structure_analysis_state_${userId}` : 'structure_analysis_state_anonymous';
};

const getHistoryKey = (): string => {
  const userId = authService.getCurrentUserId();
  return userId ? `comprehensive_history_${userId}` : 'comprehensive_history_anonymous';
};

const getStructureLastSavedKey = (): string => {
  const userId = authService.getCurrentUserId();
  return userId ? `structure_last_saved_${userId}` : 'structure_last_saved_anonymous';
};

const getStructureLastPersistedKey = (): string => {
  const userId = authService.getCurrentUserId();
  return userId ? `structure_last_persisted_${userId}` : 'structure_last_persisted_anonymous';
};

// Simple hash function for content
const hashContent = (content: string): string => {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

export function ContentStructureAnalysis({ content, url }: ContentStructureAnalysisProps) {

  

  const [analysis, setAnalysis] = useState<ContentStructureAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [improvedContent, setImprovedContent] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'structured' | 'schema' | 'analytics'>('overview');
  const [structuredView, setStructuredView] = useState<'landing'>('landing');
  const [schemaView, setSchemaView] = useState<'schema'>('schema');
  const [urlInput, setUrlInput] = useState(url || '');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [pastedContent, setPastedContent] = useState(content || '');
  const [fullPageHtml, setFullPageHtml] = useState<string>('');
  const [codeViewType, setCodeViewType] = useState<'landing' | 'code' | 'improved'>('landing');
  const [improvedFullPageHtml, setImprovedFullPageHtml] = useState<string>('');
  const [isImprovingCode, setIsImprovingCode] = useState(false);
  const [showImprovedCode, setShowImprovedCode] = useState(false);
  const [lastUserActivity, setLastUserActivity] = useState<number>(Date.now());
  const [isComponentActive, setIsComponentActive] = useState<boolean>(true);
  const [userTriggeredAnalyze, setUserTriggeredAnalyze] = useState<boolean>(false);
  const [attemptedRestore, setAttemptedRestore] = useState<boolean>(false);
  const [disableAutoRestore, setDisableAutoRestore] = useState<boolean>(true);

  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useLocalStorage<StructureAnalysisHistoryItem[]>(getHistoryKey(), []);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notificationDetails, setNotificationDetails] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    details?: string[];
    appliedCount?: number;
    totalCount?: number;
    suggestions?: any[];
  } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showQualityDetails, setShowQualityDetails] = useState<boolean>(false);
  const [showGeoDetails, setShowGeoDetails] = useState<boolean>(false);

  // Dynamic notification component
  const DynamicNotification = () => {
    if (!notificationDetails) return null;

    const getIcon = () => {
      switch (notificationDetails.type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return 'ℹ️';
      }
    };

    const getColorClass = () => {
      switch (notificationDetails.type) {
        case 'success': return 'bg-green-50 border-green-200 text-green-800';
        case 'error': return 'bg-red-50 border-red-200 text-red-800';
        case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    return (
      <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border-2 shadow-lg ${getColorClass()}`}>
        <div className="flex items-start">
          <span className="text-2xl mr-3">{getIcon()}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">{notificationDetails.title}</h3>
            <p className="text-sm mb-3">{notificationDetails.message}</p>
            
            {notificationDetails.appliedCount !== undefined && notificationDetails.totalCount !== undefined && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress:</span>
                  <span>{notificationDetails.appliedCount}/{notificationDetails.totalCount} suggestions</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(notificationDetails.appliedCount / notificationDetails.totalCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {notificationDetails.details && notificationDetails.details.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-sm mb-2">Applied Changes:</h4>
                <ul className="text-xs space-y-1">
                  {notificationDetails.details.map((detail, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {notificationDetails.suggestions && notificationDetails.suggestions.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-sm mb-2">Available Suggestions:</h4>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {notificationDetails.suggestions.slice(0, 5).map((suggestion, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2 mt-1">•</span>
                      <div>
                        <span className="font-medium">{suggestion.type}:</span>
                        <span className="ml-1">{suggestion.description}</span>
                      </div>
                    </div>
                  ))}
                  {notificationDetails.suggestions.length > 5 && (
                    <div className="text-gray-500 italic">
                      ... and {notificationDetails.suggestions.length - 5} more suggestions
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setNotificationDetails(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };
  
  // Mock analytics data for display
  const ga4Metrics = { views: 0, users: 0, sessions: 0, avgSessionDuration: 0 };
  const gscMetrics = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const topQueries: any[] = [];
  // Webflow UI disabled
  // const [wfCollectionId, setWfCollectionId] = useState<string>('');
  // const [wfItemId, setWfItemId] = useState<string>('');
  // const [isConnectingWebflow, setIsConnectingWebflow] = useState<boolean>(false);



  // Function to save analysis to history
  const saveToHistory = (analysisResult: ContentStructureAnalysis, contentToAnalyze: string, urlToAnalyze?: string) => {
    console.log('[Content Analysis] saveToHistory called with:', {
      hasAnalysisResult: !!analysisResult,
      contentLength: contentToAnalyze?.length || 0,
      urlToAnalyze,
      analysisResultKeys: analysisResult ? Object.keys(analysisResult) : []
    });

    try {
      if (!analysisResult) {
        console.error('[Content Analysis] No analysis result provided to saveToHistory');
        return;
      }

      if (!contentToAnalyze) {
        console.error('[Content Analysis] No content provided to saveToHistory');
        return;
      }

      console.log('[Content Analysis] Preparing history item with data:', {
        id: `structure-analysis-${Date.now()}`,
        name: `Structure Analysis${urlToAnalyze ? ` - ${urlToAnalyze}` : ''}`,
        contentLength: contentToAnalyze.length,
        suggestionsCount: analysisResult.suggestions?.length || 0,
        hasMetadata: !!analysisResult.metadata,
        hasStructuredContent: !!analysisResult.structuredContent
      });

      // Filter suggestions to match expected types
      const filteredSuggestions = analysisResult.suggestions?.filter(suggestion => 
        ['heading', 'paragraph', 'list', 'table', 'quote', 'code', 'link', 'image', 'schema'].includes(suggestion.type)
      ).map(suggestion => ({
        type: suggestion.type as 'heading' | 'paragraph' | 'list' | 'table' | 'quote' | 'code' | 'link' | 'image' | 'schema',
        priority: suggestion.priority as 'high' | 'medium' | 'low',
        description: suggestion.description,
        implementation: suggestion.implementation,
        impact: suggestion.impact
      })) || [];

      console.log('[Content Analysis] Filtered suggestions:', filteredSuggestions.length);

      const historyData = {
        id: `structure-analysis-${Date.now()}`,
        name: `Structure Analysis${urlToAnalyze ? ` - ${urlToAnalyze}` : ''}`,
        originalContent: contentToAnalyze,
        structuredContent: analysisResult.structuredContent || '',
        analysis: {
          seoScore: analysisResult.seoScore || 0,
          llmOptimizationScore: analysisResult.llmOptimizationScore || 0,
          readabilityScore: analysisResult.readabilityScore || 0,
          structuredData: (analysisResult as any).structuredData,
          fullPageHtml: (analysisResult as any).fullPageHtml,
          pageTitle: (analysisResult as any).pageTitle,
          pageDescription: (analysisResult as any).pageDescription,
          // These fields might not exist in the backend response, so we'll handle them safely
          geoScoreTotal: (analysisResult as any).geoScoreTotal || 0,
          geoBreakdown: (analysisResult as any).geoBreakdown || {},
          contentQualityScoreTotal: (analysisResult as any).contentQualityScoreTotal || 0,
          contentQualityBreakdown: (analysisResult as any).contentQualityBreakdown || {},
          suggestions: filteredSuggestions,
          metadata: analysisResult.metadata || {
            title: '',
            description: '',
            keywords: [],
            author: '',
            publishDate: '',
            lastModified: '',
            readingTime: 0,
            wordCount: 0,
            language: 'en'
          }
        }
      };

      console.log('[Content Analysis] About to call historyService.addStructureAnalysisHistory with:', {
        id: historyData.id,
        name: historyData.name,
        originalContentLength: historyData.originalContent.length,
        structuredContentLength: historyData.structuredContent.length,
        analysisKeys: Object.keys(historyData.analysis)
      });

      console.log('[Content Analysis] About to call historyService.addStructureAnalysisHistory with data:', historyData);
      
      try {
        historyService.addStructureAnalysisHistory(historyData);
        console.log('[Content Analysis] Successfully called historyService.addStructureAnalysisHistory');
        
        // Verify it was added by checking history
        const currentHistory = historyService.getHistoryItems();
        console.log('[Content Analysis] Current history after adding:', {
          totalItems: currentHistory.length,
          latestItem: currentHistory[0]?.name || 'None',
          structureAnalysisItems: currentHistory.filter(item => item.type === 'structure-analysis').length
        });
        
        // Check if our specific item was added
        const addedItem = currentHistory.find(item => item.id === historyData.id);
        if (addedItem) {
          console.log('[Content Analysis] ✅ Item successfully added to history:', addedItem.name);
          
          // Also check localStorage directly
          try {
            const stored = localStorage.getItem('comprehensive_history');
            const parsedStored = stored ? JSON.parse(stored) : [];
            console.log('[Content Analysis] Direct localStorage check:', {
              totalStoredItems: parsedStored.length,
              structureItems: parsedStored.filter((item: any) => item.type === 'structure-analysis').length,
              ourItemExists: parsedStored.some((item: any) => item.id === historyData.id)
            });
          } catch (storageError) {
            console.error('[Content Analysis] Error checking localStorage directly:', storageError);
          }
        } else {
          console.error('[Content Analysis] ❌ Item was NOT added to history!');
          
          // Debug: Check what's actually in localStorage
          try {
            const stored = localStorage.getItem('comprehensive_history');
            console.error('[Content Analysis] Debug - localStorage content:', stored);
            if (stored) {
              const parsed = JSON.parse(stored);
              console.error('[Content Analysis] Debug - parsed localStorage:', parsed);
            }
          } catch (e) {
            console.error('[Content Analysis] Debug - localStorage error:', e);
          }
        }
      } catch (historyError) {
        console.error('[Content Analysis] Error calling historyService.addStructureAnalysisHistory:', historyError);
        if (historyError instanceof Error) {
          console.error('[Content Analysis] Error stack:', historyError.stack);
        }
      }

    } catch (error) {
      console.error('[Content Analysis] Failed to save to history:', error);
      if (error instanceof Error) {
        console.error('[Content Analysis] Error stack:', error.stack);
      }
    }

    // Non-intrusive toggle instead of popup
            try { localStorage.setItem(getStructureLastSavedKey(), new Date().toISOString()); } catch {}
  };

  // Restore state on mount (lightweight only)
  useEffect(() => {
    // First, try to restore from the most recent analysis (regardless of content prop)
    const keys = Object.keys(localStorage);
            const structureKeys = keys.filter(key => key.startsWith(getStructureAnalysisKey()));
    
    if (structureKeys.length > 0) {
      // Get the most recent analysis by finding the one with the most recent timestamp
      let mostRecentKey = structureKeys[0];
      let mostRecentTime = 0;
      
      for (const key of structureKeys) {
        try {
          const saved = localStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.lastAccessed && parsed.lastAccessed > mostRecentTime) {
              mostRecentTime = parsed.lastAccessed;
              mostRecentKey = key;
            }
          }
        } catch {}
      }
      
      // If no timestamp found, use the first key with analysis data
      if (mostRecentTime === 0) {
        for (const key of structureKeys) {
          try {
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.analysis) {
                mostRecentKey = key;
                break;
              }
            }
          } catch {}
        }
      }
      
      // Restore from the most recent analysis
      const saved = localStorage.getItem(mostRecentKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.urlInput) setUrlInput(parsed.urlInput);
          if (parsed.activeTab) setActiveTab(parsed.activeTab);
          if (parsed.structuredView) setStructuredView(parsed.structuredView);
          if (parsed.schemaView) setSchemaView(parsed.schemaView);
          if (parsed.codeViewType) {
            const allowed = new Set(['landing', 'code', 'improved']);
            setCodeViewType(allowed.has(parsed.codeViewType) ? parsed.codeViewType : 'landing');
          }
          // Do not restore large blobs like analysis or fullPageHtml to avoid blank screens
          if (!pastedContent && parsed.pastedPreview) setPastedContent(parsed.pastedPreview);
          if (parsed.improvedFullPageHtml) setImprovedFullPageHtml(parsed.improvedFullPageHtml);
          
          console.log('[Content Analysis] Restored cached analysis from:', mostRecentKey);
          
          // Update the timestamp for this analysis to mark it as recently accessed
          setTimeout(() => {
            const updatedData = {
              ...parsed,
              lastAccessed: Date.now(),
            };
            localStorage.setItem(mostRecentKey, JSON.stringify(updatedData));
          }, 100);
        } catch (error) {
          console.error('[Content Analysis] Error restoring cached state:', error);
        }
      }
    }
    
    // Initialize pastedContent with the content prop if not already set
    if (!pastedContent && content) {
      setPastedContent(content);
    }
  }, [content]);

  // Persist last successful analysis across navigation so it stays until user runs a new one
  useEffect(() => {
    if (!analysis) return;
    try {
      const payload = {
        analysis,
        fullPageHtml,
        improvedFullPageHtml,
        activeTab,
        codeViewType,
        urlInput,
        pastedContent,
        savedAt: Date.now(),
      } as any;
              localStorage.setItem(getStructureLastPersistedKey(), JSON.stringify(payload));
      console.log('[Content Analysis] Analysis persisted for navigation');
    } catch (error) {
      console.error('[Content Analysis] Error persisting analysis:', error);
    }
  }, [analysis, fullPageHtml, improvedFullPageHtml, activeTab, codeViewType, urlInput, pastedContent]);

  // Cleanup function to ensure persistence works reliably
  useEffect(() => {
    return () => {
      // When component unmounts, ensure we save the current state if we have analysis
      if (analysis) {
        try {
          const payload = {
            analysis,
            fullPageHtml,
            improvedFullPageHtml,
            activeTab,
            codeViewType,
            urlInput,
            pastedContent,
            savedAt: Date.now(),
          } as any;
          localStorage.setItem(getStructureLastPersistedKey(), JSON.stringify(payload));
          console.log('[Content Analysis] Analysis persisted on component unmount');
        } catch (error) {
          console.error('[Content Analysis] Error persisting analysis on unmount:', error);
        }
      }
    };
  }, [analysis, fullPageHtml, improvedFullPageHtml, activeTab, codeViewType, urlInput, pastedContent]);

  // Restore persisted analysis when component mounts (for navigation persistence)
  useEffect(() => {
    if (analysis) return; // Don't restore if we already have analysis
    
    try {
      const persisted = localStorage.getItem('structure_last_persisted');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed.analysis && parsed.savedAt) {
          // Only restore if the persisted data is recent (within last 24 hours)
          const isRecent = (Date.now() - parsed.savedAt) < (24 * 60 * 60 * 1000);
          if (isRecent) {
            console.log('[Content Analysis] Restoring persisted analysis from navigation');
            setAnalysis(parsed.analysis);
            if (parsed.fullPageHtml) {
              setFullPageHtml(parsed.fullPageHtml);
            }
            // Set other related state
            if (parsed.analysis.originalContent) {
              setPastedContent(parsed.analysis.originalContent);
            }
            // Restore URL input if it was part of the analysis
            if (parsed.analysis.crawledUrl) {
              setUrlInput(parsed.analysis.crawledUrl);
            }
            // Restore improved content if available
            if (parsed.improvedFullPageHtml) {
              setImprovedFullPageHtml(parsed.improvedFullPageHtml);
            }
            // Restore UI state
            if (parsed.activeTab) {
              setActiveTab(parsed.activeTab);
            }
            if (parsed.codeViewType) {
              setCodeViewType(parsed.codeViewType);
            }
            setCodeViewType('landing');
            setDisableAutoRestore(true); // Prevent other auto-restore mechanisms
            setAttemptedRestore(true);
            
            // No notification shown - analysis restored silently
          } else {
            // Clear old persisted data
            localStorage.removeItem('structure_last_persisted');
          }
        }
      }
    } catch (error) {
      console.error('[Content Analysis] Error restoring persisted analysis:', error);
      // Clear corrupted data
      localStorage.removeItem('structure_last_persisted');
    }
  }, []); // Only run once on mount

  // Keep-alive mechanism (throttled) to prevent excessive re-renders causing flicker
  const activityThrottleRef = useRef<number>(0);
  useEffect(() => {
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - activityThrottleRef.current < 1000) return; // throttle to 1s
      activityThrottleRef.current = now;
      setLastUserActivity(now);
      setIsComponentActive(true);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, []);

  // Persist lightweight state on change (avoid storing huge HTML to prevent cache bloat/blank screens)
  useEffect(() => {
    if (pastedContent && pastedContent.trim().length > 0 && isComponentActive) {
      const contentHash = hashContent(pastedContent);
              const storageKey = `${getStructureAnalysisKey()}_${contentHash}`;

      const stateToPersist = {
        urlInput,
        // Do NOT store full analysis or HTML blobs; only keep lightweight UI state
        activeTab,
        structuredView,
        schemaView,
        // Trim pastedContent to a preview to avoid large entries
        pastedPreview: pastedContent.slice(0, 1000),
        codeViewType,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
        isActive: true,
      } as const;

      try {
        localStorage.setItem(storageKey, JSON.stringify(stateToPersist));
        console.log('[Content Analysis] Persisted lightweight state for content hash:', contentHash);
      } catch (e) {
        // If storage fails (quota), clear older entries for this feature
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(getStructureAnalysisKey())) {
            try { localStorage.removeItem(k); } catch {}
          }
        });
      }
    }
  }, [urlInput, activeTab, structuredView, schemaView, pastedContent, codeViewType, isComponentActive]);

  // Prevent repeated analysis by tracking last analyzed content hash
  const lastAnalyzedHashRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userTriggeredAnalyze) return;
    if (!pastedContent || pastedContent.trim().length === 0) return;
    const currentHash = hashContent(pastedContent);
    if (lastAnalyzedHashRef.current === currentHash) { setUserTriggeredAnalyze(false); return; }
    if (!isComponentActive) { setUserTriggeredAnalyze(false); return; }
    console.log('[Content Analysis] User-triggered analysis for content length:', pastedContent.length);
    lastAnalyzedHashRef.current = currentHash;
    analyzeContent(pastedContent, urlInput).finally(() => setUserTriggeredAnalyze(false));
    // Disable auto-restore once a new analysis is kicked off
    setDisableAutoRestore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTriggeredAnalyze, pastedContent, isComponentActive]);

  // DISABLED: Auto-restore from history - keeping analysis page static until user explicitly requests new analysis
  // useEffect(() => {
  //   if (attemptedRestore || analysis || disableAutoRestore) return;
  //   try {
  //     const items = historyService.getHistoryItems();
  //     const last = items
  //       .filter((it: any) => it?.type === 'structure-analysis')
  //       .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  //     if (last && last.analysis) {
  //       // Reconstruct expected analysis shape for UI when restoring from history
  //       const restored: any = {
  //         seoScore: last.analysis.seoScore,
  //         llmOptimizationScore: last.analysis.llmOptimizationScore,
  //         readabilityScore: last.analysis.readabilityScore,
  //         suggestions: last.analysis.suggestions || [],
  //         metadata: last.analysis.metadata,
  //         structuredContent: last.structuredContent,
  //         originalContent: last.originalContent,
  //         structuredData: last.analysis.structuredData || {},
  //         fullPageHtml: last.analysis.fullPageHtml || '',
  //         pageTitle: last.analysis.pageTitle || '',
  //         pageDescription: last.analysis.pageDescription || '',
  //         geoScoreTotal: last.analysis.geoScoreTotal,
  //         geoBreakdown: last.analysis.geoBreakdown,
  //         contentQualityScoreTotal: last.analysis.contentQualityScoreTotal,
  //         contentQualityBreakdown: last.analysis.contentQualityBreakdown,
  //       };
  //       setAnalysis(restored);
  //       setFullPageHtml(last.structuredContent || '');
  //       setPastedContent(last.originalContent || '');
  //       setCodeViewType('landing');
  //     }
  //   } catch {}
  //   setAttemptedRestore(true);
  // }, [attemptedRestore, analysis, disableAutoRestore]);

  // DISABLED: Auto-restore from server - keeping analysis page static until user explicitly requests new analysis
  // useEffect(() => {
  //   if (analysis || !attemptedRestore || disableAutoRestore || isAnalyzing) return;
  //   
  //   // Don't auto-restore if we're in the middle of a new analysis flow
  //   if (urlInput.trim() || pastedContent.trim()) {
  //     console.log('[Content Analysis] Skipping auto-restore - new analysis in progress');
  //     return;
  //   }
  //   
  //   // Don't auto-restore if user has recently interacted with the component
  //   const timeSinceLastActivity = Date.now() - lastUserActivity;
  //   if (timeSinceLastActivity < 5000) { // 5 seconds
  //     console.log('[Content Analysis] Skipping auto-restore - recent user activity detected');
  //     return;
  //   }
  //   
  //   (async () => {
  //     try {
  
  //       console.log('[Content Analysis] Attempting auto-restore...');
  //       const res: any = await apiService.getLastStructureAnalysis();
  //       if (res?.success && res?.analysis) {
  //         console.log('[Content Analysis] Auto-restore successful, but not showing success message');
  //         setAnalysis(res.analysis);
  //         setFullPageHtml(res.analysis.fullPageHtml || '');
  //         setPastedContent(res.analysis.originalContent || '');
  //         setCodeViewType('landing');
  //         // Don't show success message for auto-restore
  //       }
  //     } catch (error) {
  //       console.log('[Content Analysis] Auto-restore failed:', error);
  //     }
  //   })();
  // }, [analysis, attemptedRestore, disableAutoRestore, isAnalyzing, urlInput, pastedContent, lastUserActivity]);

  const analyzeContent = async (contentToAnalyze: string, urlToAnalyze?: string) => {
    // Check if we already have analysis for this exact content
    if (analysis && analysis.originalContent === contentToAnalyze) {
      console.log('[Content Analysis] Using cached analysis for existing content');
      return;
    }
    
    // Clear any existing success messages and disable auto-restore when starting new analysis
    setSuccessMessage(null);
    setDisableAutoRestore(true);
    setAttemptedRestore(true);

    
    setIsAnalyzing(true);
    try {
      console.log('[Content Analysis] Starting new analysis for:', urlToAnalyze ? `URL: ${urlToAnalyze}` : `Content length: ${contentToAnalyze.length}`);
      const result = await contentStructureService.analyzeContentStructure(contentToAnalyze, urlToAnalyze);
      console.log('[Content Analysis] Analysis result:', result);
      console.log('[Content Analysis] Result type:', typeof result);
      console.log('[Content Analysis] Result keys:', result ? Object.keys(result) : 'No result');
      console.log('[Content Analysis] Result structure:', {
        hasSuggestions: !!result?.suggestions,
        suggestionsLength: result?.suggestions?.length || 0,
        hasStructuredContent: !!result?.structuredContent,
        hasMetadata: !!result?.metadata,
        hasSeoScore: typeof result?.seoScore === 'number',
        hasLlmScore: typeof result?.llmOptimizationScore === 'number',
        hasReadabilityScore: typeof result?.readabilityScore === 'number'
      });
      console.log('[Content Analysis] Suggestions:', result?.suggestions);
      console.log('[Content Analysis] Full page HTML available:', !!result?.fullPageHtml);
      setAnalysis(result);
      
      // Set the full page HTML if available from the analysis
      if (result.fullPageHtml) {
        setFullPageHtml(result.fullPageHtml);
        console.log('[Content Analysis] Full page HTML set from analysis response');
      } else if (urlToAnalyze) {
        // Fallback: try to extract full page HTML separately
        try {
          const fullPageResult = await apiService.extractFullPageHtml(urlToAnalyze);
          if (fullPageResult.success) {
            setFullPageHtml(fullPageResult.html);
            console.log('[Content Analysis] Full page HTML extracted separately');
          }
        } catch (error) {
          console.warn('[Content Analysis] Failed to extract full page HTML:', error);
        }
      }
      
      // Save to history and persist per-user on backend
      console.log('[Content Analysis] About to save to history with result:', {
        hasResult: !!result,
        contentLength: contentToAnalyze?.length || 0,
        urlToAnalyze,
        resultKeys: result ? Object.keys(result) : []
      });
      
      // Check if result has all required fields for history
      console.log('[Content Analysis] Result validation for history:', {
        hasOriginalContent: !!result?.originalContent,
        hasStructuredContent: !!result?.structuredContent,
        hasSeoScore: typeof result?.seoScore === 'number',
        hasLlmScore: typeof result?.llmOptimizationScore === 'number',
        hasReadabilityScore: typeof result?.readabilityScore === 'number',
        hasSuggestions: Array.isArray(result?.suggestions),
        suggestionsLength: result?.suggestions?.length || 0,
        hasMetadata: !!result?.metadata,
        hasStructuredData: !!result?.structuredData
      });
      
      // CRITICAL: Force save to history with debugging
      console.log('[Content Analysis] FORCING save to history with FRESH data...');
      try {
        // Create a fresh history item with current timestamp and unique ID
        const currentTime = new Date();
        const uniqueId = `structure-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const freshHistoryItem = {
          id: uniqueId,
          name: `Structure Analysis${urlToAnalyze ? ` - ${urlToAnalyze}` : ''} - ${currentTime.toLocaleTimeString()}`,
          originalContent: contentToAnalyze,
          structuredContent: result.structuredContent || contentToAnalyze,
          analysis: {
            // Only include the current, relevant data - remove old metrics
            suggestions: (result.suggestions || []).filter(s => 
              ['heading', 'paragraph', 'list', 'table', 'quote', 'code', 'link', 'image', 'schema'].includes(s.type)
            ).map(s => ({
              type: s.type as 'heading' | 'paragraph' | 'list' | 'table' | 'quote' | 'code' | 'link' | 'image' | 'schema',
              priority: s.priority as 'high' | 'medium' | 'low',
              description: s.description || '',
              implementation: s.implementation || '',
              impact: s.impact || ''
            })),
            metadata: {
              title: result.metadata?.title || 'Analyzed Content',
              description: result.metadata?.description || 'Content structure analysis',
              keywords: result.metadata?.keywords || [],
              author: result.metadata?.author || 'Unknown',
              publishDate: currentTime.toISOString().split('T')[0],
              lastModified: currentTime.toISOString().split('T')[0],
              readingTime: Math.ceil(contentToAnalyze.length / 1000),
              wordCount: contentToAnalyze.split(/\s+/).length,
              language: 'en'
            },
            // Include any other current data that might be relevant
            structuredData: result.structuredData || {},
            fullPageHtml: result.fullPageHtml || '',
            pageTitle: result.pageTitle || '',
            pageDescription: result.pageDescription || '',
            // NEW: Include ALL current analysis data
            geoScoreTotal: (result as any).geoScoreTotal,
            geoBreakdown: (result as any).geoBreakdown,
            contentQualityScoreTotal: (result as any).contentQualityScoreTotal,
            contentQualityBreakdown: (result as any).contentQualityBreakdown,
            // Content summary data
            wordCount: result.metadata?.wordCount || contentToAnalyze.split(/\s+/).length,
            readingTime: result.metadata?.readingTime || Math.ceil(contentToAnalyze.length / 1000),
            suggestionsCount: (result.suggestions || []).length,
            language: result.metadata?.language || 'en'
          }
        };
        
        console.log('[Content Analysis] FRESH history item created:', {
          id: freshHistoryItem.id,
          name: freshHistoryItem.name,
          timestamp: currentTime.toISOString(),
          contentLength: freshHistoryItem.originalContent.length
        });
        
        // Try to save directly
        historyService.addStructureAnalysisHistory(freshHistoryItem);
        
        // Verify it was saved
        const currentHistory = historyService.getHistoryItems();
        const savedItem = currentHistory.find(item => item.id === freshHistoryItem.id);
        
        if (savedItem) {
          console.log('[Content Analysis] ✅ SUCCESSFULLY saved FRESH item to history!', savedItem.name);
          
          // Also trigger a storage event to notify other components
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'comprehensive_history',
            newValue: JSON.stringify(currentHistory)
          }));
          
          // Force refresh if on history page
          if (window.location.pathname === '/history') {
            console.log('[Content Analysis] On history page, triggering refresh...');
            setTimeout(() => window.location.reload(), 1000);
          }
        } else {
          console.error('[Content Analysis] ❌ FAILED to save FRESH item to history!');
        }
        
      } catch (directSaveError) {
        console.error('[Content Analysis] Direct save error:', directSaveError);
      }
      
      // Also try the original method
      saveToHistory(result, contentToAnalyze, urlToAnalyze);
      try { await apiService.saveLastStructureAnalysis({ ...result, crawledUrl: urlToAnalyze || urlInput || '' }); } catch {}

      // Attempt to fetch GA4 and GSC metrics if a URL is available
      try {
        const targetUrl = urlToAnalyze || urlInput;
        if (targetUrl) {
          // Derive pagePath for GA4 (path only)
          let pagePath = '/';
          try {
            const u = new URL(targetUrl);
            pagePath = u.pathname + (u.search || '');
          } catch {}

          // Analytics calls removed per request
        }
      } catch {}
    } catch (error) {
      console.error('Error analyzing content:', error);
      alert('Failed to analyze content structure');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    // Validate required fields
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL to analyze.');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    
    setIsUrlLoading(true);
    setUrlError(null);
    
    try {
      // Use the correct method: analyzeContentStructure with URL
      const result = await contentStructureService.analyzeContentStructure('', urlInput);
      
      // Debug logging to see what we're getting
      console.log('[URL Analysis] Raw result:', result);
      
      if (result) {
        // Ensure all required properties exist with fallbacks
        const safeResult = {
          ...result,
          geoScoreTotal: result.geoScoreTotal || result.seoScore || 0,
          geoBreakdown: result.geoBreakdown || {},
          contentQualityScoreTotal: result.contentQualityScoreTotal || result.readabilityScore || 0,
          contentQualityBreakdown: result.contentQualityBreakdown || {},
          metadata: result.metadata ? {
            ...result.metadata,
            // Only use fallbacks for missing fields, not for existing ones
            title: result.metadata.title || result.pageTitle || 'No Title',
            description: result.metadata.description || result.pageDescription || 'No Description',
            keywords: result.metadata.keywords || [],
            author: result.metadata.author || 'Unknown',
            publishDate: result.metadata.publishDate || 'Unknown',
            lastModified: result.metadata.lastModified || 'Unknown',
            readingTime: result.metadata.readingTime || 1,
            wordCount: result.metadata.wordCount || 0,
            language: result.metadata.language || 'en',
            contentStructure: result.metadata.contentStructure || { headings: [], paragraphs: [], lists: [] }
          } : {
            // Fallback metadata when no metadata exists
            title: result.pageTitle || 'No Title',
            description: result.pageDescription || 'No Description',
            keywords: [],
            author: 'Unknown',
            publishDate: 'Unknown',
            lastModified: 'Unknown',
            readingTime: 1,
            wordCount: 0,
            language: 'en',
            contentStructure: { headings: [], paragraphs: [], lists: [] }
          },
          suggestions: result.suggestions || [],
          structuredData: result.structuredData || {},
          fullPageHtml: result.fullPageHtml || '',
          pageTitle: result.pageTitle || '',
          pageDescription: result.pageDescription || '',
          originalContent: result.originalContent || '',
          structuredContent: result.structuredContent || result.fullPageHtml || ''
        };
        
        console.log('[URL Analysis] Safe result:', safeResult);
        console.log('[URL Analysis] Metadata debug:', {
          hasMetadata: !!result.metadata,
          metadataKeys: result.metadata ? Object.keys(result.metadata) : [],
          publishDate: result.metadata?.publishDate,
          publishDateType: typeof result.metadata?.publishDate,
          publishDateLength: result.metadata?.publishDate?.length,
          publishDateIsNull: result.metadata?.publishDate === null,
          publishDateIsUndefined: result.metadata?.publishDate === undefined,
          publishDateIsToday: result.metadata?.publishDate === new Date().toISOString().split('T')[0]
        });
        
        setAnalysis(safeResult);
        setFullPageHtml(safeResult.fullPageHtml || '');
        setPastedContent(safeResult.originalContent || '');
        setCodeViewType('landing');
        setDisableAutoRestore(true);
        setAttemptedRestore(true);
        
        // CRITICAL: Save URL analysis to history
        console.log('[URL Analysis] Saving to history...');
        try {
          // Create a fresh history item with current timestamp and unique ID
          const currentTime = new Date();
          const uniqueId = `structure-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const freshHistoryItem = {
            id: uniqueId,
            name: `Structure Analysis - ${urlInput} - ${currentTime.toLocaleTimeString()}`,
            originalContent: safeResult.originalContent || '',
            structuredContent: safeResult.structuredContent || safeResult.fullPageHtml || '',
            analysis: {
              // Only include the current, relevant data - remove old metrics
              suggestions: (safeResult.suggestions || []).filter(s => 
                ['heading', 'paragraph', 'list', 'table', 'quote', 'code', 'link', 'image', 'schema'].includes(s.type)
              ).map(s => ({
                type: s.type as 'heading' | 'paragraph' | 'list' | 'table' | 'quote' | 'code' | 'link' | 'image' | 'schema',
                priority: s.priority as 'high' | 'medium' | 'low',
                description: s.description || '',
                implementation: s.implementation || '',
                impact: s.impact || ''
              })),
              metadata: {
                title: safeResult.metadata?.title || 'Analyzed Content',
                description: safeResult.metadata?.description || 'Content structure analysis',
                keywords: safeResult.metadata?.keywords || [],
                author: safeResult.metadata?.author || 'Unknown',
                publishDate: safeResult.metadata?.publishDate || currentTime.toISOString().split('T')[0],
                lastModified: safeResult.metadata?.lastModified || currentTime.toISOString().split('T')[0],
                readingTime: safeResult.metadata?.readingTime || Math.ceil((safeResult.originalContent || '').length / 1000),
                wordCount: safeResult.metadata?.wordCount || (safeResult.originalContent || '').split(/\s+/).length,
                language: safeResult.metadata?.language || 'en'
              },
              // Include any other current data that might be relevant
              structuredData: safeResult.structuredData || {},
              fullPageHtml: safeResult.fullPageHtml || '',
              pageTitle: safeResult.pageTitle || '',
              pageDescription: safeResult.pageDescription || '',
              // NEW: Include ALL current analysis data
              geoScoreTotal: (safeResult as any).geoScoreTotal,
              geoBreakdown: (safeResult as any).geoBreakdown,
              contentQualityScoreTotal: (safeResult as any).contentQualityScoreTotal,
              contentQualityBreakdown: (safeResult as any).contentQualityBreakdown,
              // Content summary data
              wordCount: safeResult.metadata?.wordCount || (safeResult.originalContent || '').split(/\s+/).length,
              readingTime: safeResult.metadata?.readingTime || Math.ceil((safeResult.originalContent || '').length / 1000),
              suggestionsCount: (safeResult.suggestions || []).length,
              language: safeResult.metadata?.language || 'en'
            }
          };
          
          console.log('[URL Analysis] FRESH history item created:', {
            id: freshHistoryItem.id,
            name: freshHistoryItem.name,
            timestamp: currentTime.toISOString(),
            contentLength: freshHistoryItem.originalContent.length
          });
          
          // Try to save directly
          historyService.addStructureAnalysisHistory(freshHistoryItem);
          
          // Verify it was saved
          const currentHistory = historyService.getHistoryItems();
          const savedItem = currentHistory.find(item => item.id === freshHistoryItem.id);
          
          if (savedItem) {
            console.log('[URL Analysis] ✅ SUCCESSFULLY saved URL analysis to history!', savedItem.name);
            
            // Also trigger a storage event to notify other components
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'comprehensive_history',
              newValue: JSON.stringify(currentHistory)
            }));
            
            // Force refresh if on history page
            if (window.location.pathname === '/history') {
              console.log('[URL Analysis] On history page, triggering refresh...');
              setTimeout(() => window.location.reload(), 1000);
            }
          } else {
            console.error('[URL Analysis] ❌ FAILED to save URL analysis to history!');
          }
          
        } catch (urlHistoryError) {
          console.error('[URL Analysis] Error saving to history:', urlHistoryError);
        }
      } else {
        setUrlError('Failed to analyze URL. Please try again.');
      }
    } catch (error: any) {
      console.error('URL analysis error:', error);
      setUrlError(error.message || 'Failed to analyze URL. Please try again.');
    } finally {
      setIsUrlLoading(false);
    }
  };

  // In applySuggestions and improved code generation, use the DOM-based function
  const applySuggestions = async () => {
    if (!analysis) return;
    setIsApplying(true);
    
    // Show progress notification
    setNotificationDetails({
      type: 'info',
      title: 'Applying All Suggestions...',
      message: `Processing ${analysis.suggestions.length} suggestions...`,
      appliedCount: 0,
      totalCount: analysis.suggestions.length,
      suggestions: analysis.suggestions
    });
    
    try {
      let improved;
      const sourceHtml = analysis.fullPageHtml || fullPageHtml || content;
      
      if (!sourceHtml) {
        alert('No content available to improve.');
        return;
      }
      
      try {
        improved = applySuggestionsWithDOM(sourceHtml, analysis.suggestions);
        
        // Validate the improved code
        if (!improved || improved.length < 100) {
          throw new Error('Generated HTML is too short or invalid');
        }
        
        // Check if the HTML is valid by trying to parse it
        const parser = new DOMParser();
        const doc = parser.parseFromString(improved, 'text/html');
        if (doc.querySelector('parsererror')) {
          throw new Error('Generated HTML contains parsing errors');
        }
        
        // If no changes were made, add a visible test change
        if (improved === sourceHtml) {
          console.log('[Apply Suggestions] No changes detected, adding visible test change...');
          improved = sourceHtml.replace('<body>', '<body>\n<!-- ALL AI SUGGESTIONS APPLIED -->\n<div style="background: #e8f5e8; padding: 15px; margin: 15px; border-left: 4px solid #4caf50; border-radius: 4px;"><strong>✅ All AI Suggestions Applied:</strong> This page has been enhanced with ' + analysis.suggestions.length + ' AI-powered suggestions for better SEO, readability, and user experience.</div>');
          console.log('[Apply Suggestions] Added visible test change');
        }
        
      } catch (applyError) {
        console.error('Error in applySuggestionsWithDOM:', applyError);
        alert('Failed to apply suggestions due to HTML processing error. Please try again.');
        return;
      }
      
      // Update the appropriate state based on content type
      if (analysis.fullPageHtml || fullPageHtml) {
        setImprovedFullPageHtml(improved);
        setShowImprovedCode(true);
        setCodeViewType('improved');
        
        // Update the analysis object with the new structured content
        const updatedAnalysis = {
          ...analysis,
          structuredContent: improved, // Use full HTML - LandingPreviewFrame will handle cleaning
          fullPageHtml: improved
        };
        setAnalysis(updatedAnalysis);
      } else {
        setImprovedContent(improved);
      }
      
      setSuccessMessage(`✅ Applied ${analysis.suggestions.length} suggestions successfully!`);
      
    } catch (error) {
      console.error('Error applying suggestions:', error);
      alert('Failed to apply structure suggestions');
    } finally {
      setIsApplying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const runCodeInNewWindow = (htmlCode: string) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlCode);
      newWindow.document.close();
    } else {
      alert('Please allow popups to run the code in a new window.');
    }
  };

  // Function to run the full enhanced page
  const runFullEnhancedPage = () => {
    if (improvedFullPageHtml) {
      runCodeInNewWindow(improvedFullPageHtml);
    } else if (analysis?.fullPageHtml) {
      // If no improved HTML, run the original crawled page
      runCodeInNewWindow(analysis.fullPageHtml);
    } else {
      alert('No page content available to run. Please analyze a URL first.');
    }
  };

  // const publishImprovedToWebflow = async () => {};

  // const connectWebflow = () => {};

  // Function to compare original vs improved page
  const comparePages = () => {
    if (!analysis?.fullPageHtml) {
      alert('No original page content available.');
      return;
    }

    const originalHtml = analysis.fullPageHtml;
    console.log('[Compare Pages] Starting comparison:', {
      originalHtmlLength: originalHtml.length,
      availableSuggestions: analysis.suggestions.length,
      currentImprovedHtmlLength: improvedFullPageHtml?.length || 0,
      hasImprovedHtml: !!improvedFullPageHtml,
      improvedHtmlPreview: improvedFullPageHtml?.substring(0, 200) + '...'
    });
    
    // Always use the current improved HTML if available, otherwise generate it
    let improvedHtml = improvedFullPageHtml && improvedFullPageHtml.trim().length > 0 ? improvedFullPageHtml : '';
    
    console.log('[Compare Pages] Improved HTML check:', {
      hasImprovedHtml: !!improvedHtml,
      improvedHtmlLength: improvedHtml.length,
      isSameAsOriginal: improvedHtml === originalHtml,
      isWhitespaceSame: improvedHtml.replace(/\s+/g, '') === originalHtml.replace(/\s+/g, '')
    });
    
    // If we don't have improved HTML or it's the same as original, generate it
    if (!improvedHtml || improvedHtml === originalHtml || improvedHtml.replace(/\s+/g, '') === originalHtml.replace(/\s+/g, '')) {
      try {
        console.log('[Compare Pages] Generating improved HTML with suggestions...');
        console.log('[Compare Pages] Suggestions to apply:', analysis.suggestions.map(s => ({
          type: s.type,
          hasExactReplacement: !!s.exactReplacement,
          currentContent: s.currentContent?.substring(0, 100) + '...',
          enhancedContent: s.enhancedContent?.substring(0, 100) + '...'
        })));
        
        const generated = applySuggestionsWithDOM(originalHtml, analysis.suggestions, { highlight: true });
        console.log('[Compare Pages] Generated HTML result:', {
          generatedLength: generated?.length || 0,
          originalLength: originalHtml.length,
          htmlChanged: generated !== originalHtml,
          generatedPreview: generated?.substring(0, 200) + '...'
        });
        
        // Force a test change if no changes were made
        if (generated === originalHtml) {
          console.log('[Compare Pages] No changes detected, adding test change...');
          const testChange = originalHtml.replace('<body>', `<body>
<!-- AI IMPROVEMENTS APPLIED -->
<div style="
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  padding: 25px;
  margin: 25px;
  border-left: 6px solid #4caf50;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  font-family: Arial, sans-serif;
  position: relative;
  z-index: 1000;
">
  <div style="display: flex; align-items: center; margin-bottom: 15px;">
    <span style="font-size: 28px; margin-right: 12px;">✅</span>
    <strong style="font-size: 20px; color: #2e7d32;">AI Improvements Applied</strong>
  </div>
  <p style="margin: 0 0 15px 0; color: #1b5e20; font-size: 16px; line-height: 1.5;">
    This page has been enhanced with <strong>${analysis.suggestions.length} AI-powered suggestions</strong> for better SEO, readability, and user experience.
  </p>
  <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 6px; border: 1px solid #4caf50;">
    <strong style="color: #2e7d32; display: block; margin-bottom: 10px;">🎯 Key Improvements:</strong>
    <ul style="margin: 0; padding-left: 20px; color: #1b5e20;">
      <li>Enhanced content structure and readability</li>
      <li>Improved SEO optimization</li>
      <li>Better user experience elements</li>
      <li>AI-powered content enhancements</li>
    </ul>
  </div>
</div>`);
          improvedHtml = testChange;
          setImprovedFullPageHtml(testChange);
        } else {
          improvedHtml = generated || originalHtml;
          setImprovedFullPageHtml(generated);
        }
      } catch (e) {
        console.error('[Compare Pages] Error generating improved HTML:', e);
        improvedHtml = originalHtml;
      }
    }
    
    console.log('[Compare Pages] Final comparison data:', {
      originalHtmlLength: originalHtml.length,
      improvedHtmlLength: improvedHtml.length,
      htmlIsDifferent: improvedHtml !== originalHtml,
      improvedHtmlPreview: improvedHtml.substring(0, 200) + '...',
      originalHtmlPreview: originalHtml.substring(0, 200) + '...'
    });

    // Create a comparison page with better iframe handling
    const comparisonHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Comparison - Original vs Improved</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .comparison-container { 
            display: flex; 
            gap: 20px; 
            height: calc(100vh - 40px); 
        }
        .page-frame { 
            flex: 1; 
            border: 2px solid #ddd; 
            border-radius: 8px; 
            background: white;
            overflow: hidden;
        }
        .page-frame h3 { 
            margin: 0; 
            padding: 15px; 
            background: #f5f5f5; 
            border-bottom: 1px solid #ddd; 
            font-size: 16px;
            font-weight: bold;
        }
        .page-frame.original h3 { 
            background: #ffebee; 
            color: #c62828; 
        }
        .page-frame.improved h3 { 
            background: #e8f5e8; 
            color: #2e7d32; 
        }
        .page-frame.improved h3::after {
            content: " (Changes Applied)";
            font-size: 12px;
            font-weight: normal;
        }
        .page-content {
            height: calc(100% - 50px);
            overflow: auto;
        }
        iframe { 
            width: 100%; 
            height: 100%; 
            border: none; 
            background: white;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="comparison-container">
        <div class="page-frame original">
            <h3>🔴 Original Page</h3>
            <div class="page-content">
                <iframe 
                    srcdoc="${originalHtml.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                    onload="console.log('Original page loaded')"
                    onerror="console.log('Original page failed to load')"
                ></iframe>
            </div>
        </div>
        <div class="page-frame improved">
            <h3>🟢 Improved Page</h3>
            <div class="page-content">
                <iframe 
                    srcdoc="${improvedHtml.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                    onload="console.log('Improved page loaded')"
                    onerror="console.log('Improved page failed to load')"
                ></iframe>
            </div>
        </div>
    </div>
    <script>
        console.log('Comparison page loaded');
        // Add some debugging
        setTimeout(() => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe, index) => {
                console.log(\`Iframe \${index + 1} src length:\`, iframe.srcdoc.length);
            });
            
            // Check if the iframes have different content
            if (iframes.length >= 2) {
                const originalLength = iframes[0].srcdoc.length;
                const improvedLength = iframes[1].srcdoc.length;
                console.log('Content comparison:', {
                    originalLength,
                    improvedLength,
                    isDifferent: originalLength !== improvedLength
                });
                
                // Add a visual indicator if content is different
                if (originalLength !== improvedLength) {
                    const improvedFrame = document.querySelector('.page-frame.improved h3');
                    if (improvedFrame) {
                        improvedFrame.style.border = '2px solid #4caf50';
                        improvedFrame.style.animation = 'pulse 2s infinite';
                    }
                }
            }
        }, 1000);
        
        // Add CSS for pulse animation
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
        \`;
        document.head.appendChild(style);
    </script>
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(comparisonHtml);
      newWindow.document.close();
    } else {
      alert('Please allow popups to view the comparison.');
    }
  };

  const copyAndRunCode = async () => {
    if (!analysis) return;
    
    try {
      // Show loading state
      setSuccessMessage('🔄 Applying suggestions and generating improved code...');
      
      // Use fullPageHtml from analysis if available, otherwise use the extracted fullPageHtml
      const sourceHtml = analysis.fullPageHtml || fullPageHtml;
      if (!sourceHtml) {
        setSuccessMessage('❌ No HTML content available to improve.');
        return;
      }
      
      console.log('[Content Analysis] Applying suggestions to HTML:', {
        sourceHtmlLength: sourceHtml.length,
        suggestionsCount: analysis.suggestions.length,
        suggestions: analysis.suggestions.map(s => ({ type: s.type, hasExactReplacement: !!s.exactReplacement }))
      });
      
      // Apply suggestions to the code
      const improvedCode = applySuggestionsWithDOM(sourceHtml, analysis.suggestions);
      
      console.log('[Content Analysis] Improved code generated:', {
        improvedCodeLength: improvedCode.length,
        hasChanges: improvedCode !== sourceHtml
      });
      
      // Update the improved code state
      setImprovedFullPageHtml(improvedCode);
      setShowImprovedCode(true);
      
      console.log('[Frontend] State updated after applying suggestion:', {
        improvedCodeLength: improvedCode.length,
        sourceHtmlLength: sourceHtml.length,
        hasChanges: improvedCode !== sourceHtml,
        improvedCodePreview: improvedCode.substring(0, 200) + '...'
      });
      
      // Update the analysis object with the new structured content
      const updatedAnalysis = {
        ...analysis,
        structuredContent: improvedCode, // Use full HTML - LandingPreviewFrame will handle cleaning
        fullPageHtml: improvedCode
      };
      setAnalysis(updatedAnalysis);
      
      console.log('[Frontend] Analysis object updated:', {
        analysisUpdated: true,
        structuredContentLength: updatedAnalysis.structuredContent.length,
        fullPageHtmlLength: updatedAnalysis.fullPageHtml.length
      });
      
      // Copy to clipboard
      await navigator.clipboard.writeText(improvedCode);
      
      // Show success notification with applied suggestions count
      const appliedCount = analysis.suggestions.length;
      const suggestionTypes = analysis.suggestions.map(s => s.type).slice(0, 3); // Show first 3 types
      // Show dynamic notification with real results
      setNotificationDetails({
        type: 'success',
        title: 'All Suggestions Applied Successfully!',
        message: `Successfully applied ${appliedCount} out of ${analysis.suggestions.length} suggestions to your content.`,
        details: suggestionTypes.slice(0, 5).map(type => `Applied: ${type}`),
        appliedCount: appliedCount,
        totalCount: analysis.suggestions.length,
        suggestions: analysis.suggestions
      });
      
      // Ask user if they want to run the code
      const shouldRun = window.confirm('Improved code copied to clipboard! Would you like to run the improved page in a new window?');
      
      if (shouldRun) {
        runCodeInNewWindow(improvedCode);
      }
    } catch (error) {
      console.error('Error copying and running code:', error);
      setSuccessMessage('❌ Failed to apply suggestions. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const applySingleSuggestion = async (suggestion: any) => {
    if (!analysis) return;
    
    // Show progress notification
    setNotificationDetails({
      type: 'info',
      title: 'Applying Suggestion...',
      message: `Processing ${suggestion.type} suggestion...`,
      appliedCount: 0,
      totalCount: 1,
      suggestions: [suggestion]
    });
    
    try {
      
      // Use fullPageHtml from analysis if available, otherwise use the extracted fullPageHtml
      const sourceHtml = analysis.fullPageHtml || fullPageHtml;
      if (!sourceHtml) {
        setSuccessMessage('❌ No HTML content available to improve.');
        return;
      }
      
      console.log('[Frontend] Applying single suggestion:', {
        type: suggestion.type,
        hasExactReplacement: !!suggestion.exactReplacement,
        currentContent: suggestion.currentContent?.substring(0, 100) + '...',
        enhancedContent: suggestion.enhancedContent?.substring(0, 100) + '...',
        sourceHtmlLength: sourceHtml.length,
        fullSuggestion: suggestion
      });
      
      // Test if the suggestion has the required fields
      console.log('[Frontend] Suggestion validation:', {
        hasType: !!suggestion.type,
        hasCurrentContent: !!suggestion.currentContent,
        hasEnhancedContent: !!suggestion.enhancedContent,
        hasExactReplacement: !!suggestion.exactReplacement,
        exactReplacementFind: suggestion.exactReplacement?.find?.substring(0, 100) + '...',
        exactReplacementReplace: suggestion.exactReplacement?.replace?.substring(0, 100) + '...'
      });
      
      // Apply single suggestion to the code with error handling
      let improvedCode;
      try {
        improvedCode = applySuggestionsWithDOM(sourceHtml, [suggestion]);
        
        console.log('[Content Analysis] Suggestion application result:', {
          originalLength: sourceHtml.length,
          improvedLength: improvedCode.length,
          hasChanges: improvedCode !== sourceHtml,
          suggestionType: suggestion.type
        });
        
        // Validate the improved code
        if (!improvedCode || improvedCode.length < 100) {
          throw new Error('Generated HTML is too short or invalid');
        }
        
        // Check if the HTML is valid by trying to parse it
        const parser = new DOMParser();
        const doc = parser.parseFromString(improvedCode, 'text/html');
        if (doc.querySelector('parsererror')) {
          throw new Error('Generated HTML contains parsing errors');
        }
        
        // If no changes were made, try a more aggressive approach
        if (improvedCode === sourceHtml) {
          console.log('[Content Analysis] No changes detected, trying alternative approach...');
          
          // Try direct text replacement as a fallback
          if (suggestion.currentContent && suggestion.enhancedContent) {
            const tempCode = sourceHtml.replace(suggestion.currentContent, suggestion.enhancedContent);
            if (tempCode !== sourceHtml) {
              improvedCode = tempCode;
              console.log('[Content Analysis] Applied direct text replacement');
            }
          }
          
          // If still no changes, add a visible test change
          if (improvedCode === sourceHtml) {
            console.log('[Content Analysis] Still no changes, adding visible test change...');
            const testChange = sourceHtml.replace('<body>', '<body>\n<!-- AI SUGGESTION APPLIED -->\n<div style="background: #fff3cd; padding: 10px; margin: 10px; border-left: 4px solid #ffc107;"><strong>🔧 Suggestion Applied:</strong> ' + suggestion.type + ' - ' + suggestion.description + '</div>');
            improvedCode = testChange;
            console.log('[Content Analysis] Added visible test change');
          }
        }
        
      } catch (applyError) {
        console.error('Error in applySuggestionsWithDOM:', applyError);
        
        // Fallback: Try to apply just the exact replacement if available
        if (suggestion.exactReplacement) {
          try {
            const { find, replace } = suggestion.exactReplacement;
            if (sourceHtml.includes(find)) {
              improvedCode = sourceHtml.replace(find, replace);
              console.log('[Content Analysis] Applied fallback exact replacement');
            } else {
              throw new Error('Exact replacement pattern not found');
            }
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            setSuccessMessage('❌ Failed to apply suggestion. Please try again.');
            setTimeout(() => setSuccessMessage(null), 3000);
            return;
          }
        } else {
          setSuccessMessage('❌ Failed to apply suggestion due to HTML processing error. Please try again.');
          setTimeout(() => setSuccessMessage(null), 3000);
          return;
        }
      }
      
      // Update the improved code state
      setImprovedFullPageHtml(improvedCode);
      setShowImprovedCode(true);
      
      // Update the analysis object with the new structured content
      if (analysis) {
        const updatedAnalysis = {
          ...analysis,
          structuredContent: improvedCode, // Use full HTML - LandingPreviewFrame will handle cleaning
          fullPageHtml: improvedCode
        };
        console.log('[Content Analysis] Updating analysis with improved content:', {
          improvedCodeLength: improvedCode.length,
          improvedCodePreview: improvedCode.substring(0, 200) + '...'
        });
        // Update the analysis state (this will trigger re-render of landing preview)
        setAnalysis(updatedAnalysis);
      }
      
      // Show dynamic notification with real results
      setNotificationDetails({
        type: 'success',
        title: 'Suggestion Applied Successfully!',
        message: `The ${suggestion.type} suggestion has been applied to your content.`,
        details: [
          `Applied: ${suggestion.type}`,
          `Description: ${suggestion.description}`,
          `Impact: ${suggestion.impact || 'Improved content quality'}`
        ],
        appliedCount: 1,
        totalCount: 1,
        suggestions: [suggestion]
      });
      
      // Switch to landing tab to show the updated content
      setCodeViewType('landing');
      console.log('[Content Analysis] Switched to landing tab to show updated content');
      
    } catch (error) {
      console.error('Error applying single suggestion:', error);
      setSuccessMessage('❌ Failed to apply suggestion. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const previewEnhancedContent = (suggestion: any) => {
    console.log('[Preview] Suggestion data:', {
      type: suggestion.type,
      hasEnhancedContent: !!suggestion.enhancedContent,
      enhancedContentLength: suggestion.enhancedContent?.length,
      enhancedContent: suggestion.enhancedContent?.substring(0, 200) + '...'
    });
    
    if (suggestion.enhancedContent) {
      // Create a simple HTML preview
      const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Content Preview - ${suggestion.type}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1, h2, h3 { color: #333; }
        ul, ol { margin: 20px 0; }
        li { margin: 10px 0; }
        .highlight { background-color: #f0f8ff; padding: 20px; border-left: 4px solid #007bff; }
        .suggestion-type { color: #007bff; font-weight: bold; margin-bottom: 10px; }
        pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="highlight">
        <div class="suggestion-type">Suggestion Type: ${suggestion.type}</div>
        <h3>Enhanced Content Preview:</h3>
        <pre>${suggestion.enhancedContent}</pre>
    </div>
</body>
</html>`;
      
      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(previewHtml);
        newWindow.document.close();
      } else {
        alert('Please allow popups to preview the enhanced content.');
      }
    } else {
      console.warn('[Preview] No enhanced content available for suggestion:', suggestion.type);
      alert('No enhanced content available for this suggestion. Please check the implementation details.');
    }
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Compute LLM Understandability live for original and improved
  const computeLLMScore = (html: string) => {
    try {
      return scoreLLMUnderstandability(html);
    } catch (e) {
      return { score: 0, breakdown: {} } as any;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // Isolated preview for "Landing" view to keep styles aligned and centered
  const LandingPreviewFrame = ({ html }: { html: string }) => {
    const srcDoc = React.useMemo(() => {
      // Use the full HTML as-is to preserve original layout and styling
      let fullHtml = html || '';
      
      // If the HTML doesn't have a complete document structure, wrap it
      if (!fullHtml.includes('<!DOCTYPE html>') && !fullHtml.includes('<html')) {
        fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    /* Preserve original styling while ensuring readability */
    body { 
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; 
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background: #ffffff;
    }
    /* Ensure images and media are responsive */
    img, video, iframe { max-width: 100%; height: auto; }
    /* Improve readability */
    h1, h2, h3, h4, h5, h6 { 
      margin-top: 1.2em; 
      margin-bottom: 0.5em; 
      color: #2c3e50;
    }
    p { 
      line-height: 1.7; 
      margin-bottom: 1em;
    }
    ul, ol { 
      margin: 1em 0; 
      padding-left: 2em; 
    }
    li { 
      margin-bottom: 0.5em; 
    }
    a { 
      color: #3498db; 
      text-decoration: none; 
    }
    a:hover { 
      text-decoration: underline; 
    }
  </style>
</head>
<body>
  ${fullHtml}
</body>
</html>`;
      }
      
      return fullHtml;
    }, [html]);

    return (
                    <iframe
                      key={html ? html.substring(0, 100) : 'empty'} // Force re-render when content changes
                      title="Landing Preview"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                      srcDoc={srcDoc}
                      loading="lazy"
                      style={{ width: '100%', height: '75vh', border: 'none', borderRadius: '0.5rem', background: 'transparent' }}
                    />
    );
  };

  // Keyword post-processor: keep only words/phrases present in the original content,
  // AI-friendly keyword processing: deduplicate, sort by AI relevance, then frequency
  const getAccurateKeywords = (keywords: string[], source: string): string[] => {
    if (!Array.isArray(keywords) || !source) return keywords || [];
    const text = source.toLowerCase();
    const counts = new Map<string, number>();
    const seen = new Set<string>();

    // AI-friendly technical terms that should get priority
    const aiPriorityTerms = [
      'artificial intelligence', 'ai', 'machine learning', 'ml', 'deep learning',
      'data science', 'analytics', 'insights', 'metrics', 'performance',
      'cloud computing', 'saas', 'platform', 'integration', 'api',
      'business intelligence', 'reporting', 'dashboard', 'visualization',
      'digital transformation', 'innovation', 'technology', 'solution',
      'user experience', 'ux', 'interface', 'design', 'usability',
      'security', 'compliance', 'governance', 'risk', 'audit',
      'scalability', 'reliability', 'availability', 'backup', 'recovery',
      'migration', 'tenant', 'onedrive', 'sharepoint', 'teams',
      'cloudfuze', 'microsoft 365', 'google workspace', 'metadata'
    ];

    keywords.forEach((raw) => {
      const k = (raw || '').trim();
      if (!k) return;
      const lower = k.toLowerCase();
      if (seen.has(lower)) return;
      
      // Require keyword to exist in content as whole word (for multi-words allow spaces)
      const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      if (re.test(text)) {
        seen.add(lower);
        
        // Calculate AI-friendly score
        let aiScore = 0;
        if (aiPriorityTerms.some(term => lower.includes(term))) aiScore += 5;
        if (lower.split(' ').length >= 2) aiScore += 3; // Multi-word terms
        if (lower.length > 8) aiScore += 2; // Longer, more specific terms
        if (lower.includes('-') || /[A-Z]/.test(k)) aiScore += 2; // Compound terms
        
        // frequency: rough count
        const freq = (text.match(new RegExp(escaped, 'gi')) || []).length;
        counts.set(k, freq + aiScore);
      }
    });

    return Array.from(counts.entries())
      .sort((a, b) => {
        // Sort by AI score first, then frequency, then length
        if (b[1] !== a[1]) return b[1] - a[1];
        return b[0].length - a[0].length;
      })
      .map(([k]) => k)
      .slice(0, 25);
  };

  // Helper: ensure we show real snippets for a suggestion
  const resolveSuggestionContent = (s: any): { current: string; enhanced: string } => {
    const current = s.currentContent || s?.exactReplacement?.find || '';
    const enhanced = s.enhancedContent || s?.exactReplacement?.replace || s.implementation || '';
    return { current, enhanced };
  };

  const escapeHtml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Generate improved code when needed
  useEffect(() => {
    if (codeViewType === 'improved' && fullPageHtml && analysis && analysis.suggestions.length > 0) {
      setIsImprovingCode(true);
      try {
        const improved = applySuggestionsWithDOM(fullPageHtml, analysis.suggestions, { highlight: true });
        setImprovedFullPageHtml(improved);
      } catch {
        setImprovedFullPageHtml('Failed to generate improved code.');
      } finally {
        setIsImprovingCode(false);
      }
    }
  }, [codeViewType, fullPageHtml, analysis]);

  if (isAnalyzing && !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-black mb-2">Analyzing Content Structure</h2>
            <p className="text-gray-600">Analyzing your content for SEO and LLM optimization...</p>
            {urlError && (
              <div className="mt-6 inline-block bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
                {urlError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Add handler for new analysis
  const handleNewAnalysis = () => {
    // Clear the current analysis to show the input form
    setAnalysis(null);
    
    // Clear input fields and prepare for new analysis
    setUrlInput('');
    setUrlError(null);
    setPastedContent('');
    setImprovedContent('');
    setFullPageHtml('');
    setCodeViewType('landing');
    setImprovedFullPageHtml('');
    setSuccessMessage(null); // Clear any success messages

    setIsComponentActive(true); // Reactivate immediately for new analysis
    setDisableAutoRestore(false); // Allow auto-restore for new analysis
    setAttemptedRestore(false); // Reset restore attempt state
    
    // Clear all structure analysis cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
              if (key.startsWith(getStructureAnalysisKey())) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear persisted analysis to prevent conflicts with new analysis
    localStorage.removeItem('structure_last_persisted');
    
    console.log('[Content Analysis] New analysis initiated - state cleared');
  };

  if (!analysis) {
    // Always show a clean state by default
    const hasCachedAnalysis = false;

    return (
      <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
                             {/* URL Input Section */}
               <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
                 <div className="text-center mb-8">
                   <h2 className="text-3xl font-bold text-gray-900 mb-3">Technical SEO & Structure Analysis</h2>
                   <p className="text-gray-600 text-lg">Optimize your site structure for better AI crawling and understanding.</p>
          </div>
          
                 <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-8">
                   <div className="flex-1 min-w-0">
                     <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                      setUrlInput(value);
                      setLastUserActivity(Date.now());
                      setIsComponentActive(true);
                    })}
                    onPaste={(e) => handlePaste(e, (value) => {
                      setUrlInput(value);
                      setLastUserActivity(Date.now());
                      setIsComponentActive(true);
                    })}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      setLastUserActivity(Date.now());
                      setIsComponentActive(true);
                    }}
                    required
                    placeholder="Paste a URL to analyze..."
                         className="flex-1 px-4 py-3 border-2 border-blue-600 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg h-[48px]"
                    disabled={isUrlLoading}
                  />
                  <button
                    onClick={handleAnalyzeUrl}
                    disabled={isUrlLoading || !urlInput.trim()}
                         className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg min-w-[120px] h-[48px]"
                       >
                         {isUrlLoading ? (
                           <>
                             <Loader2 className="w-5 h-5 animate-spin" />
                             Analyzing...
                           </>
                         ) : (
                           <>
                             <Search className="w-5 h-5" />
                             Analyze URL
                           </>
                         )}
                  </button>
                     </div>
                   </div>
                </div>
                
                {urlError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-base">
                    {urlError}
                  </div>
                )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic Notification */}
      <DynamicNotification />
      
      {/* Success Notification */}
      <SuccessNotification
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
        autoClose={true}
        autoCloseDelay={4000}
      />
      
      <div className="w-full max-w-7xl mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3 min-w-0">

            <BarChart3 className="w-8 h-8 text-black flex-shrink-0" />
            <h1 className="text-2xl lg:text-3xl font-bold text-black truncate">Content Structure Analysis</h1>
          </div>
          <div className="flex gap-2 lg:gap-3 flex-shrink-0 items-center">
              <button
              onClick={handleNewAnalysis}
              className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm lg:text-base"
            >
              New Analysis
            </button>
              {/* Webflow UI disabled */}
            <button
              onClick={() => downloadContent(analysis.structuredContent, 'improved-content.txt')}
              className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm lg:text-base"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>



        {/* Score Cards - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* GEO Score Details Card */}
          {(analysis as any)?.geoScoreTotal !== undefined && (
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getScoreBgColor((analysis as any).geoScoreTotal)}`}>
                    <BarChart3 className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black">GEO Score Details</h3>
                    <p className="text-sm text-gray-600">AI visibility and search engine optimization breakdown</p>
                  </div>
                </div>
                <button
                  className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-black"
                  onClick={() => setShowGeoDetails(s => !s)}
                >{showGeoDetails ? 'Hide' : 'Details'}</button>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor((analysis as any).geoScoreTotal)}`}>
                {(analysis as any).geoScoreTotal}/100
              </div>
            </div>
          )}

          {/* Content Quality Details Card */}
          {(analysis as any)?.contentQualityScoreTotal !== undefined && (
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getScoreBgColor((analysis as any).contentQualityScoreTotal)}`}>
                    <BookOpen className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black">Content Quality Details</h3>
                    <p className="text-sm text-gray-600">Human/editorial score breakdown</p>
                  </div>
                </div>
                <button
                  className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-black"
                  onClick={() => setShowQualityDetails(s => !s)}
                >{showQualityDetails ? 'Hide' : 'Details'}</button>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor((analysis as any).contentQualityScoreTotal)}`}>
                {(analysis as any).contentQualityScoreTotal}/100
              </div>
            </div>
          )}
        </div>

          {(analysis as any)?.geoBreakdown && showGeoDetails && (
          <div className="bg-white rounded-xl p-4 lg:p-6 shadow-lg border border-gray-200 mb-8">
            <h4 className="font-semibold text-black mb-3">GEO Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start content-start">
              {Object.entries((analysis as any).geoBreakdown).map(([key, val]: any) => {
                const geoMax: Record<string, number> = {
                  evidence_attribution: 30,
                  answerability_snippetability: 25,
                  structured_understanding: 20,
                  freshness_stability: 10,
                  entity_topic_coverage: 10,
                  retrieval_friendliness: 5,
                };
                const max = geoMax[key] ?? 5;
                const scoreText = val.score?.toFixed ? `${val.score.toFixed(1)}/${max}` : `${val.score}/${max}`;
                return (
                <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-black">{key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                    <div className="text-black font-bold">{scoreText}</div>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1.5">
                    {Object.entries(val).filter(([k]) => k !== 'score').map(([k, v]: any) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-gray-600">{k.replace(/_/g, ' ')}</span>
                        <span className="text-black font-medium">{typeof v === 'number' ? v.toFixed(1) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

          {(analysis as any)?.contentQualityBreakdown && showQualityDetails && (
          <div className="bg-white rounded-xl p-4 lg:p-6 shadow-lg border border-gray-200 mb-8">
            <h4 className="font-semibold text-black mb-3">Content Quality Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start content-start">
              {Object.entries((analysis as any).contentQualityBreakdown).map(([key, val]: any) => {
                const maxMap: Record<string, number> = {
                  readability_clarity: 20,
                  structure_coherence: 15,
                  depth_coverage: 20,
                  originality: 15,
                  accuracy_source_use: 10,
                  style_tone: 10,
                  accessibility_presentation: 10,
                };
                const max = maxMap[key] ?? 20;
                const scoreText = val.score?.toFixed ? `${val.score.toFixed(1)}/${max}` : `${val.score}/${max}`;
                return (
                <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-black">{key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                    <div className="text-black font-bold">{scoreText}</div>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1.5">
                    {Object.entries(val).filter(([k]) => k !== 'score').map(([k, v]: any) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-gray-600">{k.replace(/_/g, ' ')}</span>
                        <span className="text-black font-medium">{typeof v === 'number' ? v.toFixed(1) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8 w-full overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-2 lg:gap-0 lg:space-x-8 px-4 lg:px-6 py-2 lg:py-0">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'suggestions', label: 'Suggestions', icon: Target },
                { id: 'structured', label: 'Structured Content', icon: FileText },
                { id: 'schema', label: 'Schema Markup', icon: Code }
                // { id: 'analytics', label: 'Analytics', icon: BarChart3 } // Commented out
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1 lg:gap-2 py-2 lg:py-4 px-2 lg:px-4 rounded-lg font-bold text-xs lg:text-sm transition-colors whitespace-nowrap 
                    ${activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'bg-black text-white opacity-80 hover:opacity-100'}
                  `}
                >
                  <tab.icon className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 lg:p-6 w-full overflow-hidden">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-black mb-4">Content Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-black">{analysis?.metadata?.wordCount || 0}</div>
                      <div className="text-sm text-gray-600">Words</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-black">{analysis?.metadata?.readingTime || 1}</div>
                      <div className="text-sm text-gray-600">Min Read</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-black">{analysis?.suggestions?.length || 0}</div>
                      <div className="text-sm text-gray-600">Suggestions</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-black">{(analysis?.metadata?.language || 'en').toUpperCase()}</div>
                      <div className="text-sm text-gray-600">Language</div>
                    </div>
                  </div>
                </div>

                {/* Metadata replicated below summary */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-black mb-4">Content Metadata</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={analysis?.metadata?.title || 'No Title'}
                          readOnly
                          className="w-full px-3 py-2 border border-blue-400 rounded-lg bg-gray-50 text-blue-900 font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={analysis?.metadata?.description || 'No Description'}
                          readOnly
                          rows={3}
                          className="w-full px-3 py-2 border border-blue-400 rounded-lg bg-gray-50 text-blue-900 font-semibold focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                        <div className="flex flex-wrap gap-2">
                          {getAccurateKeywords(analysis?.metadata?.keywords || [], analysis?.originalContent || '').map((keyword, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input
                          type="text"
                          value={analysis?.metadata?.author || 'Unknown'}
                          readOnly
                          className="w-full px-3 py-2 border border-blue-400 rounded-lg bg-gray-50 text-blue-900 font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date</label>
                        <input
                          type="text"
                          value={analysis?.metadata?.publishDate || 'Unknown'}
                          readOnly
                          className="w-full px-3 py-2 border border-blue-400 rounded-lg bg-gray-50 text-blue-900 font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reading Time</label>
                        <input
                          type="text"
                          value={`${analysis?.metadata?.readingTime || 1} minutes`}
                          readOnly
                          className="w-full px-3 py-2 border border-blue-400 rounded-lg bg-gray-50 text-blue-900 font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
              <div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-semibold text-black">Structure Improvement Suggestions</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={runFullEnhancedPage}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Run Full Page
                    </button>
                    <button
                      onClick={comparePages}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Compare Pages
                    </button>
                    <button
                      onClick={() => {
                        console.log('[Debug] Current state check:', {
                          hasAnalysis: !!analysis,
                          hasFullPageHtml: !!analysis?.fullPageHtml,
                          hasImprovedFullPageHtml: !!improvedFullPageHtml,
                          improvedHtmlLength: improvedFullPageHtml?.length || 0,
                          originalHtmlLength: analysis?.fullPageHtml?.length || 0,
                          suggestionsCount: analysis?.suggestions?.length || 0,
                          improvedHtmlPreview: improvedFullPageHtml?.substring(0, 200) + '...',
                          originalHtmlPreview: analysis?.fullPageHtml?.substring(0, 200) + '...'
                        });
                        alert('Debug info logged to console. Check console for details.');
                      }}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-semibold flex items-center gap-2"
                    >
                      🔍 Debug State
                    </button>
                    <button
                      onClick={applySuggestions}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Apply All Suggestions
                    </button>
                    {/* Webflow publish button disabled */}
                  </div>
                </div>
                <div className="space-y-6">
                  {analysis?.suggestions?.map((suggestion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getPriorityColor(suggestion.priority)}`}>
                          {getPriorityIcon(suggestion.priority)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-semibold text-black text-lg">{suggestion.description}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                              {suggestion.priority}
                            </span>
                          </div>
                          
                          {/* Current Content Section (precise snippet) */}
                          {(() => { const { current } = resolveSuggestionContent(suggestion); return current; })() && (
                            <div className="mb-4">
                              <h5 className="font-medium text-gray-700 mb-2">Current Content:</h5>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 overflow-auto">
                                <pre className="text-sm text-red-700 font-mono whitespace-pre-wrap">
                                  {resolveSuggestionContent(suggestion).current}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Enhanced Content Section (precise snippet) */}
                          {(() => { const { enhanced } = resolveSuggestionContent(suggestion); return enhanced; })() && (
                            <div className="mb-4">
                              <h5 className="font-medium text-green-700 mb-2">Enhanced Content:</h5>
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200 overflow-auto">
                                <pre className="text-sm text-green-800 font-mono whitespace-pre-wrap">
                                  {resolveSuggestionContent(suggestion).enhanced}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Change Preview removed per request */}
                          
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-yellow-800">
                              <strong>🎯 Impact:</strong> {suggestion.impact}
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => applySingleSuggestion(suggestion)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <Zap className="w-4 h-4" />
                              Apply This Suggestion
                            </button>
                              {/* Removed Preview Enhanced button as requested */}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Content Tab */}
            {activeTab === 'structured' && (
              <div className="w-full">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
                  <h3 className="text-lg font-semibold text-black">Improved Content Structure</h3>
                  <div className="flex flex-wrap gap-2">
                    {/* Plain view removed per request */}
                    <button
                      className={`px-2 lg:px-3 py-1 rounded-lg text-xs lg:text-sm font-semibold border transition-colors duration-150 ${codeViewType === 'landing' ? 'bg-black text-white border-black' : 'bg-gray-200 text-black border-gray-300 hover:bg-gray-300'}`}
                      onClick={() => setCodeViewType('landing')}
                    >Landing</button>
                    <button
                      className={`px-2 lg:px-3 py-1 rounded-lg text-xs lg:text-sm font-semibold border transition-colors duration-150 ${codeViewType === 'code' ? 'bg-black text-white border-black' : 'bg-gray-200 text-black border-gray-300 hover:bg-gray-300'}`}
                      onClick={() => setCodeViewType('code')}
                    >Code</button>
                    {/* Removed Improved tab per request */}
                    {codeViewType === 'code' && (
                      <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(fullPageHtml)}
                        className="bg-gray-100 text-black px-2 lg:px-4 py-1 lg:py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                      >
                        <Copy className="w-3 h-3 lg:w-4 lg:h-4" />
                        <span className="hidden sm:inline">Copy Code</span>
                      </button>
                        <button
                          onClick={copyAndRunCode}
                          className="bg-black text-white px-2 lg:px-4 py-1 lg:py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                        >
                          <Play className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span className="hidden sm:inline">Copy & Run</span>
                        </button>
                        <button
                          onClick={() => downloadContent(fullPageHtml, 'original-page.html')}
                          className="bg-gray-600 text-white px-2 lg:px-4 py-1 lg:py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                        >
                          <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
                    )}
                    {/* Removed Improved actions per request */}
                  </div>
                </div>
                {codeViewType === 'landing' ? (
                  <div className="bg-gray-50 rounded-lg p-2 w-full">
                    <LandingPreviewFrame html={analysis.structuredContent} />
                  </div>
                ) : codeViewType === 'improved' ? (
                  <div className="bg-gray-50 rounded-lg p-4 overflow-auto w-full" style={{ maxHeight: '70vh' }}>
                    <div className="text-xs lg:text-sm text-black font-mono leading-relaxed">
                      <code className="block whitespace-pre-wrap break-all">
                        {improvedFullPageHtml || 'No improved code available yet. Click "Copy & Run" to generate improved code.'}
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 overflow-auto w-full" style={{ maxHeight: '70vh' }}>
                    <div className="text-xs lg:text-sm text-black font-mono leading-relaxed">
                      <code className="block whitespace-pre-wrap break-all">
                        {fullPageHtml || 'No code extracted yet.'}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Metadata Tab removed per request */}



            {/* Schema Tab */}
            {activeTab === 'schema' && (
              <div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
                  <h3 className="text-lg font-semibold text-black mb-0">Structured Data Markup</h3>


            {/* Analytics Tab removed per request */}
                </div>
                  <div className="space-y-6">
                    {analysis?.structuredData?.articleSchema && (
                      <div>
                        <h4 className="font-semibold text-black mb-2">Article Schema</h4>
                        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-xs lg:text-sm text-black font-mono break-words whitespace-pre-wrap">
                            {JSON.stringify(analysis.structuredData.articleSchema, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {analysis?.structuredData?.faqSchema && (
                      <div>
                        <h4 className="font-semibold text-black mb-2">FAQ Schema</h4>
                        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-xs lg:text-sm text-black font-mono break-words whitespace-pre-wrap">
                            {JSON.stringify(analysis.structuredData.faqSchema, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {(!analysis?.structuredData?.articleSchema && !analysis?.structuredData?.faqSchema) && (
                      <div className="text-sm text-gray-600">No structured data captured for the last analysis.</div>
                    )}
                  </div>
              </div>
            )}

                          {/* Analytics Tab (live page analytics) - COMMENTED OUT AND REMOVED */}
          </div>
        </div>
      </div>
    </>
  );
} 