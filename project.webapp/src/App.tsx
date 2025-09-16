import { useState, useEffect } from 'react';
import { User, BarChart3, FileText, History as HistoryIcon, DollarSign, Zap, Menu, X, Target, Globe, Plus, Loader2, RefreshCw, LogOut, Eye, Settings } from 'lucide-react';
import { ContentInput } from './components/ContentInput';
import { historyService } from './services/historyService';
import { Statistics } from './components/Statistics';
import Login from './components/Login';
import { useLocalStorage } from './hooks/useLocalStorage';
import { downloadFile } from './utils/fileUtils';
import type { QAItem, SessionData, User as UserType, QAHistoryItem } from './types';
import type { UrlData } from './components/ContentInput';
import { useAuth } from './contexts/AuthContext';
import { calculateCost } from './utils/pricing';
import { History } from './components/History';
import { apiService } from './services/apiService';
import { performFullCleanup } from './utils/sessionCleanup';

// Utility function to hash content for cache keys
const hashContent = (content: string): string => {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
};
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Overview } from './components/Overview.tsx';
import { CompetitorBenchmarking } from './components/CompetitorBenchmarking';
import EmailVerification from './components/EmailVerification';
import { CompetitorInsight } from './components/AIVisibilityAnalysis';

// import SmartCompetitorAnalysis from './components/SmartCompetitorAnalysis';
// Content structure pages disabled
import { ContentStructureAnalysisRoute } from './components/ContentStructureAnalysisRoute';
import { ContentStructureLanding } from './components/ContentStructureLanding';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import NotificationTest from './components/ui/NotificationTest';
import { FAQContentAnalyzer } from './components/FAQContentAnalyzer';
import IdleSessionManager from './components/IdleSessionManager';

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';
const COMPETITOR_URLS_KEY = 'llm_competitor_urls';
const QA_WORK_KEY = 'llm_qa_current_work';
const ENHANCE_CONTENT_KEY = 'enhance_content_state';
const ENHANCE_CONTENT_CACHE_KEY = 'enhance_content_cache_';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <Zap />, path: '/overview' },
          { label: 'Competitor Insight', icon: <Eye />, path: '/ai-visibility-analysis' },
      { label: 'Content Enhancement', icon: <FileText />, path: '/enhance-content' },
  // { label: 'Content Analysis', icon: <BarChart3 />, path: '/content-analysis' },
  { label: 'Structure Analysis', icon: <Target />, path: '/content-structure-analysis' },
  // { label: 'Smart Competitor Analysis', icon: <BarChart3 />, path: '/smart-competitor-analysis' },
  { label: 'History', icon: <HistoryIcon />, path: '/history' },
  { label: 'Statistics', icon: <BarChart3 />, path: '/statistics' },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
  user: UserType | null;
  currentPath: string;
}

function Sidebar({ isOpen, setIsOpen, onLogout, user, currentPath }: SidebarProps) {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 bg-white w-64 min-h-screen flex flex-col border-r border-gray-200 shadow-lg transform transition-transform duration-300 md:transform-none sidebar-responsive ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-3 border-b border-primary/10 header-responsive">
          <div className="flex items-center gap-3 flex-1 min-w-0 logo-container">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0 logo-icon">
              <Zap className="w-5 h-5 text-white" />
              {/* Fallback icon if Zap doesn't render */}
              <span className="text-white text-lg font-bold" style={{ display: 'none' }}>⚡</span>
            </div>
            <span className="text-lg font-bold text-primary tracking-wide truncate logo-text">kabini.ai</span>
          </div>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors p-1.5 rounded-md flex items-center justify-center flex-shrink-0 ml-2" 
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            {/* Professional X icon */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div className="absolute w-4 h-0.5 bg-gray-600 rounded-full transform rotate-45"></div>
              <div className="absolute w-4 h-0.5 bg-gray-600 rounded-full transform -rotate-45"></div>
            </div>
          </button>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1 mt-4 px-2 nav-responsive">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                className={`nav-item-responsive ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="mt-auto user-profile-section">
          {/* User Profile Section */}
          <div className="user-profile-info">
            <div className="user-avatar">
              <User />
            </div>
            <div className="user-details">
              <div className="user-name">
                {user?.displayName || user?.name || 'User'}
              </div>
              <div className="user-email">
                {user?.email || ''}
              </div>
            </div>
          </div>
          
          {/* Logout Button - Clearly Separated */}
          <button 
            className="logout-button" 
            onClick={onLogout}
          >
            <LogOut />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ setIsOpen, onLogout }: { setIsOpen: (open: boolean) => void; onLogout: () => void }) {
  return (
    <header className="w-full bg-white border-b border-primary/10 flex items-center justify-between px-3 sm:px-6 py-3 relative z-30 header-responsive">
      <div className="logo-container">
        <div className="logo-icon bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
          <Zap className="w-5 h-5 text-white" />
          {/* Fallback icon if Zap doesn't render */}
          <span className="text-white text-lg font-bold" style={{ display: 'none' }}>⚡</span>
        </div>
        <span className="logo-text text-xl font-extrabold tracking-wide">kabini.ai</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Logout button for mobile */}
        <button 
          className="md:hidden bg-black border border-black text-white px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 hover:border-gray-800 transition-all flex items-center gap-2" 
          onClick={onLogout}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
        {/* Menu button for mobile */}
        <button 
          className="block md:hidden text-primary hover:text-accent transition-colors p-2 rounded-lg hover:bg-gray-100 flex items-center justify-center border border-gray-200 bg-white" 
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          {/* Hamburger menu icon - always visible with explicit styling */}
          <div className="relative w-6 h-6">
            <div className="absolute w-5 h-1 bg-black rounded-full top-1 left-0.5"></div>
            <div className="absolute w-5 h-1 bg-black rounded-full top-3 left-0.5"></div>
            <div className="absolute w-5 h-1 bg-black rounded-full top-5 left-0.5"></div>
          </div>
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="w-full bg-white border-t border-primary/10 text-center text-primary py-3 text-sm">
      © {new Date().getFullYear()} kabini.ai. All rights reserved.
    </footer>
  );
}

function QAGenerationPage() {
  return <FAQContentAnalyzer />;
}

function CostBreakdownPage() {
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);

  const getTotalCost = () => {
    return sessions.reduce((sum, session) => {
      return sum + parseFloat(session.statistics?.totalCost || '0');
    }, 0);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-primary">Cost Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">
              ${getTotalCost().toFixed(2)}
            </div>
            <div className="text-gray-300">Total Cost</div>
          </div>
          <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">
              {currentSession?.qaData?.length || 0}
            </div>
            <div className="text-gray-300">Questions Generated</div>
          </div>
          <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">
              ${((currentSession?.qaData?.length || 0) * 0.01).toFixed(2)}
            </div>
            <div className="text-gray-300">Estimated Monthly</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, logout, user, refreshUser } = useAuth();
  
  console.log('[App] Authentication state:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email
  });
  
  // Force refresh user data if authenticated but no user data
  useEffect(() => {
    if (isAuthenticated && !user && !isLoading) {
      console.log('[App] Authenticated but no user data, forcing refresh...');
      refreshUser();
    }
  }, [isAuthenticated, user, isLoading, refreshUser]);
  
  // Clear any stale localStorage data on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[App] Clearing stale localStorage data...');
      const staleKeys = [
        'llm_qa_current_session',
        'structure_last_saved',
        'overview_market_analysis'
      ];
      
      staleKeys.forEach(key => {
        try {
          if (localStorage.getItem(key)) {
            console.log(`[App] Clearing stale localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn(`[App] Could not clear ${key}:`, e);
        }
      });
    }
  }, [isAuthenticated, user]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);

  // Get competitor domains from COMPETITOR_URLS_KEY
  let competitorDomains: string[] = [];
  try {
    const urlList = JSON.parse(localStorage.getItem(COMPETITOR_URLS_KEY) || '[]') as string[];
    competitorDomains = Array.from(new Set(urlList.map((url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    }))).filter(Boolean);
  } catch {}

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium">Loading kabini.ai...</p>
          <p className="text-gray-600 text-sm mt-2">Please wait while we verify your authentication...</p>
        </div>
      </div>
    );
  }
  
  // Show loading state if authenticated but user data is still loading
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium">Loading user data...</p>
          <p className="text-gray-600 text-sm mt-2">Please wait while we load your profile...</p>
        </div>
      </div>
    );
  }

  // Allow unauthenticated users to access /signup
  if (!isAuthenticated) {
    console.log('[App] User not authenticated, showing login page');
    return (
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/test-notifications" element={<NotificationTest />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  
  console.log('[App] User is authenticated, showing main app');

  // Note: Analysis data cleanup is now handled in AuthContext on login/logout
  // This prevents aggressive clearing that could cause blank pages

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        onLogout={handleLogout} 
        user={user} // Pass the logged-in user
        currentPath={location.pathname}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden content-responsive">
        {/* Global idle session manager: 10 min idle with 60s warning */}
        <IdleSessionManager idleMinutes={10} warningSeconds={60} />
        <Topbar setIsOpen={setSidebarOpen} onLogout={handleLogout} />
        <main className="flex-1 p-responsive-md overflow-x-hidden overflow-y-auto text-black bg-white main-content-responsive">
          <div className="main-content-container">
            <Routes>
              <Route path="/overview" element={<Overview />} />
              <Route path="/ai-visibility-analysis" element={<CompetitorInsight />} />
              <Route path="/qa-generation" element={<QAGenerationPage />} />
              <Route path="/enhance-content" element={<QAGenerationPage />} />
              {/* Content Analysis disabled */}
              {/* <Route path="/content-analysis" element={<CompetitorBenchmarking competitorDomains={competitorDomains} />} /> */}
      
              {/* <Route path="/smart-competitor-analysis" element={<SmartCompetitorAnalysis />} /> */}
              <Route path="/content-structure-analysis" element={<ContentStructureAnalysisRoute />} />
              {/* <Route path="/content-structure-landing" element={<ContentStructureLanding />} /> */}
              <Route path="/history" element={<History qaItems={sessions.flatMap(s => s.qaData)} onExport={downloadFile} />} />
              <Route path="/statistics" element={<Statistics sessions={sessions} currentSession={currentSession} />} />
              <Route path="/CloudFuzeLLMQA" element={<Navigate to="/overview" replace />} />
              <Route path="/" element={<Navigate to="/overview" replace />} />
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;