import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Loader2, RefreshCw, Download, Target, Globe, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { useNavigate } from 'react-router-dom';
import SuccessNotification from './ui/SuccessNotification';

interface FAQItem {
  question: string;
  answer: string;
}

interface SessionData {
  id: string;
  name: string;
  type: string;
  timestamp: string;
  model: string;
  questionProvider: string;
  answerProvider: string;
  questionModel: string;
  answerModel: string;
  blogContent: string;
  blogUrl?: string;
  sourceUrls?: string[];
  qaData: FAQItem[];
  totalInputTokens: number;
  totalOutputTokens: number;
  statistics: {
    totalQuestions: number;
    avgAccuracy: string;
    avgCitationLikelihood: string;
    totalCost: string;
  };
  userId: string;
}

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';

export function FAQContentAnalyzer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // FAQ Generation State
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  const [faqProvider, setFaqProvider] = useState('gemini');
  const [faqModel, setFaqModel] = useState('gemini-1.5-flash');
  const [faqTargetKeywords, setFaqTargetKeywords] = useState<string[]>([]);
  const [showFAQSection, setShowFAQSection] = useState(false);
  const [showQuestionsSection, setShowQuestionsSection] = useState(false);
  const [pendingFAQGeneration, setPendingFAQGeneration] = useState<{
    content: string;
    provider: string;
    model: string;
    targetKeywords: string[];
    timestamp: number;
  } | null>(null);
  
  // Content input state
  const [content, setContent] = useState('');
  const [urls, setUrls] = useState<Array<{url: string, content: string, status: string}>>([]);
  const [newUrl, setNewUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [crawling, setCrawling] = useState(false);
  
  // History and sessions
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  // Notification state
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
  // Textarea ref for auto-expansion
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Helper function to get user-specific storage keys
  const getUserSpecificKey = (baseKey: string, userId: string) => `${baseKey}_${userId}`;
  
  // Helper function to detect if content is a URL
  const isUrl = (text: string): boolean => {
    try {
      new URL(text.trim());
      return true;
    } catch {
      return false;
    }
  };
  
  // Helper function to extract URL from content
  const extractUrl = (content: string): string | null => {
    const trimmed = content.trim();
    if (isUrl(trimmed)) {
      return trimmed;
    }
    // Check if content contains a URL
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = trimmed.match(urlRegex);
    return matches ? matches[0] : null;
  };
  
  // Auto-expand textarea when content changes
  useEffect(() => {
    if (textareaRef.current && content) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [content]);
  
  // Auto-set model based on provider
  useEffect(() => {
    switch (faqProvider) {
      case 'gemini':
        setFaqModel('gemini-1.5-flash');
        break;
      case 'openai':
        setFaqModel('gpt-3.5-turbo');
        break;
      case 'perplexity':
        setFaqModel('sonar');
        break;
      case 'claude':
        setFaqModel('claude-3.5-sonnet-20241022');
        break;
      default:
        setFaqModel('gemini-1.5-flash');
    }
  }, [faqProvider]);
  
  // Load sessions from localStorage when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      const userSessionsKey = getUserSpecificKey(SESSIONS_KEY, user.id);
      const userCurrentSessionKey = getUserSpecificKey(CURRENT_SESSION_KEY, user.id);
      
      console.log('[FAQ Session] Loading sessions from localStorage:', {
        userSessionsKey,
        userCurrentSessionKey,
        userId: user.id
      });
      
      try {
        // Load sessions
        const savedSessions = localStorage.getItem(userSessionsKey);
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions);
          console.log('[FAQ Session] Loaded sessions:', parsedSessions.length);
          setSessions(parsedSessions);
        }
        
        // Load current session
        const savedCurrentSession = localStorage.getItem(userCurrentSessionKey);
        if (savedCurrentSession) {
          const parsedCurrentSession = JSON.parse(savedCurrentSession);
          console.log('[FAQ Session] Loaded current session:', {
            id: parsedCurrentSession.id,
            type: parsedCurrentSession.type,
            qaDataLength: parsedCurrentSession.qaData?.length || 0,
            questionsLength: parsedCurrentSession.generatedQuestions?.length || 0,
            showQuestionsSection: parsedCurrentSession.showQuestionsSection,
            showFAQSection: parsedCurrentSession.showFAQSection
          });
          setCurrentSession(parsedCurrentSession);
        } else {
          console.log('[FAQ Session] No current session found in localStorage');
        }
      } catch (error) {
        console.error('[Session Loading] Error loading sessions:', error);
      }
    }
  }, [user?.id]);
  
  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (user?.id && sessions.length > 0) {
      const userSessionsKey = getUserSpecificKey(SESSIONS_KEY, user.id);
      try {
        localStorage.setItem(userSessionsKey, JSON.stringify(sessions));
      } catch (error) {
        console.error('[Session Saving] Error saving sessions:', error);
      }
    }
  }, [sessions, user?.id]);
  
  // Save current session to localStorage whenever it changes
  useEffect(() => {
    if (user?.id && currentSession) {
      const userCurrentSessionKey = getUserSpecificKey(CURRENT_SESSION_KEY, user.id);
      try {
        console.log('[FAQ Session] Saving current session to localStorage:', {
          key: userCurrentSessionKey,
          sessionId: currentSession.id,
          sessionType: currentSession.type,
          qaDataLength: currentSession.qaData?.length || 0,
          questionsLength: currentSession.generatedQuestions?.length || 0,
          showQuestionsSection: currentSession.showQuestionsSection,
          showFAQSection: currentSession.showFAQSection
        });
        localStorage.setItem(userCurrentSessionKey, JSON.stringify(currentSession));
      } catch (error) {
        console.error('[Session Saving] Error saving current session:', error);
      }
    }
  }, [currentSession, user?.id]);
  
  // Clear sessions when user logs out
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSession(null);
      setExpandedSessions(new Set());
      // Clear FAQ state on logout
      setFaqs([]);
      setGeneratedQuestions([]);
      setShowFAQSection(false);
      setShowQuestionsSection(false);
      setContent('');
      setIsGeneratingQuestions(false);
      setIsGeneratingAnswers(false);
      setPendingFAQGeneration(null);
    }
  }, [user]);
  
  // Restore FAQ state when current session changes
  useEffect(() => {
    if (currentSession && currentSession.type === 'faq') {
      console.log('[FAQ Session] Restoring FAQ session:', {
        id: currentSession.id,
        qaDataLength: currentSession.qaData?.length || 0,
        questionsLength: currentSession.generatedQuestions?.length || 0,
        blogContentLength: currentSession.blogContent?.length || 0,
        showQuestionsSection: currentSession.showQuestionsSection,
        showFAQSection: currentSession.showFAQSection
      });
      
      // Restore basic FAQ state
      setFaqs(currentSession.qaData || []);
      setContent(currentSession.blogContent || '');
      setFaqProvider(currentSession.questionProvider || 'gemini');
      setFaqModel(currentSession.questionModel || (currentSession.questionProvider === 'perplexity' ? 'sonar' : currentSession.questionProvider === 'claude' ? 'claude-3.5-sonnet-20241022' : 'gemini-1.5-flash'));
      
      // Restore questions state
      setGeneratedQuestions(currentSession.generatedQuestions || []);
      setShowQuestionsSection(currentSession.showQuestionsSection || false);
      setShowFAQSection(currentSession.showFAQSection || false);
      
      // Reset textarea height to accommodate content
      if (textareaRef.current && currentSession.blogContent) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
            textareaRef.current.style.height = newHeight + 'px';
          }
        }, 100);
      }
    } else if (currentSession && currentSession.type !== 'faq') {
      // Clear FAQ state if current session is not an FAQ session
      console.log('[FAQ Session] Clearing FAQ state - current session is not FAQ type:', currentSession.type);
      setFaqs([]);
      setGeneratedQuestions([]);
      setShowFAQSection(false);
      setShowQuestionsSection(false);
    } else if (!currentSession) {
      // Clear FAQ state if no current session
      console.log('[FAQ Session] Clearing FAQ state - no current session');
      setFaqs([]);
      setGeneratedQuestions([]);
      setShowFAQSection(false);
      setShowQuestionsSection(false);
    }
  }, [currentSession]);
  
  // Check for pending FAQ generation and completed FAQs on component mount
  useEffect(() => {
    if (user?.id) {
      const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
      const generatedFAQsKey = getUserSpecificKey('generated_faqs', user.id);
      
      try {
        // Check for pending generation
        const pending = localStorage.getItem(pendingKey);
        if (pending) {
          const pendingData = JSON.parse(pending);
          const now = Date.now();
          const timeDiff = now - pendingData.timestamp;
          
          // If pending generation is less than 5 minutes old, continue it
          if (timeDiff < 5 * 60 * 1000) {
            setPendingFAQGeneration(pendingData);
            setIsGeneratingQuestions(true);
            setContent(pendingData.content);
            setFaqProvider(pendingData.provider);
            setFaqModel(pendingData.model);
            setFaqTargetKeywords(pendingData.targetKeywords);
            
            // Continue the FAQ generation
            continuePendingFAQGeneration(pendingData);
          } else {
            // Clear old pending generation
            localStorage.removeItem(pendingKey);
          }
        }
        
        // Check for completed FAQs that were generated in background
        const generatedFAQs = localStorage.getItem(generatedFAQsKey);
        if (generatedFAQs) {
          const faqData = JSON.parse(generatedFAQs);
          const now = Date.now();
          const timeDiff = now - faqData.timestamp;
          
          // If generated FAQs are less than 10 minutes old, restore them
          if (timeDiff < 10 * 60 * 1000) {
            console.log('[Background FAQ] Restoring generated FAQs:', faqData.faqs.length);
            
            // Use setTimeout to ensure state updates happen after component is fully mounted
            setTimeout(() => {
              setFaqs(faqData.faqs);
              setShowFAQSection(true);
              setContent(faqData.content);
              setFaqProvider(faqData.provider);
              setFaqModel(faqData.model);
              setIsGeneratingFAQs(false);
              const faqText = faqData.faqs.length === 1 ? 'FAQ' : 'FAQs';
              setNotificationMessage(`Restored ${faqData.faqs.length} previously generated ${faqText}!`);
            }, 100);
            
            // Clear the generated FAQs from localStorage
            localStorage.removeItem(generatedFAQsKey);
          } else {
            // Clear old generated FAQs
            localStorage.removeItem(generatedFAQsKey);
          }
        }
      } catch (error) {
        console.error('[Background FAQ] Error loading background data:', error);
        localStorage.removeItem(pendingKey);
        localStorage.removeItem(generatedFAQsKey);
      }
    }
  }, [user?.id]);
  
  // Continue pending FAQ generation
  const continuePendingFAQGeneration = async (pendingData: any) => {
    try {
      console.log('[Pending FAQ] Continuing FAQ generation for content length:', pendingData.content.length);
      
      const response = await apiService.generateAIFAQs({
        content: pendingData.content.trim(),
        provider: pendingData.provider,
        model: pendingData.model,
        targetKeywords: pendingData.targetKeywords
      });
      
      if (response.faqs && Array.isArray(response.faqs) && response.faqs.length > 0) {
        console.log('[Pending FAQ] Successfully generated FAQs:', response.faqs.length);
        
        // Save generated FAQs to localStorage immediately for background processing
        if (user?.id) {
          const generatedFAQsKey = getUserSpecificKey('generated_faqs', user.id);
          const faqData = {
            faqs: response.faqs,
            content: pendingData.content,
            provider: pendingData.provider,
            model: pendingData.model,
            timestamp: Date.now()
          };
          localStorage.setItem(generatedFAQsKey, JSON.stringify(faqData));
        }
        
        setFaqs(response.faqs);
        setShowFAQSection(true);
        setIsGeneratingFAQs(false);
        setPendingFAQGeneration(null);
        
        // Clear pending generation from localStorage
        if (user?.id) {
          const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
          localStorage.removeItem(pendingKey);
        }
        
        // Save to history
        if (user?.id) {
          const extractedUrl = extractUrl(pendingData.content);
          const newSession: SessionData = {
            id: `faq-session-${Date.now()}`,
            name: `FAQ Session - ${new Date().toLocaleDateString()}`,
            type: 'faq',
            timestamp: new Date().toISOString(),
            model: pendingData.model,
            questionProvider: pendingData.provider,
            answerProvider: pendingData.provider,
            questionModel: pendingData.model,
            answerModel: pendingData.model,
            blogContent: pendingData.content,
            blogUrl: extractedUrl || undefined,
            sourceUrls: extractedUrl ? [extractedUrl] : undefined,
            qaData: response.faqs.map(faq => ({
              question: faq.question,
              answer: faq.answer
            })),
            totalInputTokens: pendingData.content.length / 4,
            totalOutputTokens: response.faqs.reduce((sum, faq) => sum + faq.question.length + faq.answer.length, 0) / 4,
            statistics: {
              totalQuestions: response.faqs.length,
              avgAccuracy: '85',
              avgCitationLikelihood: '75',
              totalCost: '0.01'
            },
            userId: user.id
          };
          
          setSessions(prev => {
            const updatedSessions = [newSession, ...prev];
            return updatedSessions;
          });
          setCurrentSession(newSession);
        }
        
        const faqText = response.faqs.length === 1 ? 'FAQ' : 'FAQs';
        setNotificationMessage(`Successfully generated ${response.faqs.length} ${faqText}!`);
      } else {
        console.error('[Pending FAQ] Invalid response format:', response);
        setNotificationMessage('Failed to generate FAQs. Please try again.');
        setIsGeneratingFAQs(false);
        setPendingFAQGeneration(null);
        
        // Clear pending generation from localStorage
        if (user?.id) {
          const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
          localStorage.removeItem(pendingKey);
        }
      }
    } catch (error) {
      console.error('[Pending FAQ] Error generating FAQs:', error);
      setNotificationMessage('Error generating FAQs. Please try again.');
      setIsGeneratingFAQs(false);
      setPendingFAQGeneration(null);
      
      // Clear pending generation from localStorage
      if (user?.id) {
        const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
        localStorage.removeItem(pendingKey);
      }
    }
  };
  
  // Generate Questions Function (Step 1)
  const generateQuestions = async () => {
    if (!content.trim()) {
      setNotificationMessage('Please enter some content first');
      return;
    }
    
    // Validate content - check if it contains meaningful text
    const trimmedContent = content.trim();
    
    // Check if content is a valid URL
    const isValidUrl = (text: string): boolean => {
      try {
        new URL(text);
        return true;
      } catch {
        return false;
      }
    };
    
    // If it's a valid URL, allow it
    if (isValidUrl(trimmedContent)) {
      // URL is valid, proceed with generation
    } else {
      // For non-URL content, apply validation rules
      
      // Check if content is only numbers
      if (/^\d+$/.test(trimmedContent)) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
      
      // Check if content is only emojis or special characters
      if (/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+$/u.test(trimmedContent)) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
      
      // Check if content is only single characters or very short meaningless text
      if (trimmedContent.length < 10 || /^[a-zA-Z\s]{1,10}$/.test(trimmedContent)) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
      
      // Check if content has meaningful words (not just repeated characters)
      const words = trimmedContent.split(/\s+/).filter(word => word.length > 0);
      if (words.length < 3) {
        setNotificationType('error');
        setNotificationMessage('Enter valid content');
        return;
      }
    }
    
    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]);
    setSelectedQuestions(new Set());
    
    try {
      // Generate questions using the same prompt structure
      const response = await apiService.generateAIFAQs({
        content: content.trim(),
        provider: faqProvider,
        model: faqModel,
        targetKeywords: faqTargetKeywords,
        generateQuestionsOnly: true // New flag to generate only questions
      });
      
      if (response.success && response.questions) {
        // Extract questions from the response
        const questions = response.questions || [];
        setGeneratedQuestions(questions);
        setShowQuestionsSection(true);
        const questionText = questions.length === 1 ? 'question' : 'questions';
        setNotificationType('success');
        setNotificationMessage(`Generated ${questions.length} ${questionText} successfully!`);
        
        // Save questions to session immediately
        saveQuestionsToSession(questions);
      } else {
        setNotificationType('error');
        setNotificationMessage('Failed to generate questions. Please try again.');
      }
    } catch (error) {
      console.error('[Questions Generation] Error:', error);
      setNotificationType('error');
      setNotificationMessage('Error generating questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Generate Answers Function (Step 2)
  const generateAnswers = async () => {
    if (selectedQuestions.size === 0) {
      setNotificationMessage('Please select at least one question');
      return;
    }
    
    setIsGeneratingAnswers(true);
    setShowFAQSection(false);
    
    try {
      // Get selected questions
      const selectedQuestionsList = Array.from(selectedQuestions).map(index => generatedQuestions[index]);
      
      console.log('[FAQ Generation] Starting answer generation:', {
        selectedQuestionsSize: selectedQuestions.size,
        selectedQuestionsIndices: Array.from(selectedQuestions),
        selectedQuestionsList: selectedQuestionsList,
        totalGeneratedQuestions: generatedQuestions.length
      });
      
      // Generate answers for selected questions
      const response = await apiService.generateAIFAQs({
        content: content.trim(),
        provider: faqProvider,
        model: faqModel,
        targetKeywords: faqTargetKeywords,
        selectedQuestions: selectedQuestionsList,
        generateAnswersOnly: true // New flag to generate only answers
      });
      
      if (response.success && response.faqs) {
        const newFaqs = response.faqs || [];
        const selectedQuestionsCount = selectedQuestions.size;
        
        console.log('[FAQ Generation] API Response Analysis:', {
          responseSuccess: response.success,
          responseFaqsLength: response.faqs?.length || 0,
          selectedQuestionsCount: selectedQuestionsCount,
          newFaqsLength: newFaqs.length,
          responseFaqs: response.faqs
        });
        
        // Accumulate new FAQs with existing ones instead of replacing
        setFaqs(prevFaqs => {
          const allFaqs = [...prevFaqs, ...newFaqs];
          console.log('[FAQ Generation] Accumulating FAQs:', {
            previousCount: prevFaqs.length,
            newCount: newFaqs.length,
            totalCount: allFaqs.length,
            selectedQuestionsCount: selectedQuestionsCount
          });
          // Update existing session with all FAQs (existing + new)
          updateSessionWithAnswers(allFaqs);
          return allFaqs;
        });
        
        setShowFAQSection(true);
        const questionText = selectedQuestionsCount === 1 ? 'question' : 'questions';
        setNotificationType('success');
        setNotificationMessage(`Generated answers for ${selectedQuestionsCount} ${questionText} successfully!`);
        
        console.log('[FAQ Generation] Answer generation completed:', {
          selectedQuestionsCount,
          apiResponseCount: newFaqs.length,
          selectedQuestionsList
        });
      } else {
        setNotificationType('error');
        setNotificationMessage('Failed to generate answers. Please try again.');
      }
    } catch (error) {
      console.error('[Answers Generation] Error:', error);
      setNotificationType('error');
      setNotificationMessage('Error generating answers. Please try again.');
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  // Toggle question selection
  const toggleQuestionSelection = (index: number) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Select all questions
  const selectAllQuestions = () => {
    setSelectedQuestions(new Set(generatedQuestions.map((_, index) => index)));
  };

  // Deselect all questions
  const deselectAllQuestions = () => {
    setSelectedQuestions(new Set());
  };

  // Save re-analyzed FAQ session
  const saveReanalyzedToSession = (updatedFaqs: FAQItem[], reanalyzedQuestion: string) => {
    if (!user?.id) {
      console.warn('[FAQ Session] Cannot save re-analyzed session - no user ID');
      return;
    }
    
    const sessionData: SessionData = {
      id: `faq-${Date.now()}`,
      name: `FAQ Session - ${new Date().toLocaleDateString()}`,
      type: 'faq',
      timestamp: new Date().toISOString(),
      model: faqModel,
      questionProvider: faqProvider,
      answerProvider: faqProvider,
      questionModel: faqModel,
      answerModel: faqModel,
      blogContent: content,
      blogUrl: extractUrl(content),
      sourceUrls: extractUrl(content) ? [extractUrl(content)!] : [],
      qaData: updatedFaqs,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      statistics: {
        totalQuestions: updatedFaqs.length,
        avgAccuracy: 'N/A',
        avgCitationLikelihood: 'N/A',
        totalCost: 'N/A'
      },
      userId: user.id,
      generatedQuestions: generatedQuestions,
      showQuestionsSection: showQuestionsSection,
      showFAQSection: true
    };
    
    console.log('[FAQ Session] Saving re-analyzed session:', {
      id: sessionData.id,
      name: sessionData.name,
      qaDataLength: sessionData.qaData.length,
      reanalyzedQuestion: reanalyzedQuestion.substring(0, 100)
    });
    
    setSessions(prev => [sessionData, ...prev]);
    setCurrentSession(sessionData);
  };

  // Save questions to session (create new session when questions are generated)
  const saveQuestionsToSession = (questions: string[]) => {
    if (!user?.id) {
      console.warn('[FAQ Session] Cannot save questions session - no user ID');
      return;
    }
    
    const sessionData: SessionData = {
      id: `faq-${Date.now()}`,
      name: `FAQ Session - ${new Date().toLocaleDateString()}`,
      type: 'faq',
      timestamp: new Date().toISOString(),
      model: faqModel,
      questionProvider: faqProvider,
      answerProvider: faqProvider,
      questionModel: faqModel,
      answerModel: faqModel,
      blogContent: content,
      blogUrl: extractUrl(content),
      sourceUrls: extractUrl(content) ? [extractUrl(content)!] : [],
      qaData: [], // Empty initially, will be filled when answers are generated
      totalInputTokens: 0,
      totalOutputTokens: 0,
      statistics: {
        totalQuestions: questions.length,
        avgAccuracy: 'N/A',
        avgCitationLikelihood: 'N/A',
        totalCost: 'N/A'
      },
      userId: user.id,
      generatedQuestions: questions,
      showQuestionsSection: true,
      showFAQSection: false
    };
    
    console.log('[FAQ Session] Saving questions session:', {
      id: sessionData.id,
      questionsLength: sessionData.generatedQuestions?.length || 0,
      blogContentLength: sessionData.blogContent.length,
      userId: sessionData.userId
    });
    
    setSessions(prev => [sessionData, ...prev]);
    setCurrentSession(sessionData);
  };

  // Update existing session with answers
  const updateSessionWithAnswers = (newFaqs: FAQItem[]) => {
    if (!user?.id || !currentSession) {
      console.warn('[FAQ Session] Cannot update session - no user ID or current session');
      return;
    }
    
    console.log('[FAQ Session] Before updating session:', {
      currentSessionId: currentSession.id,
      currentSessionQaDataLength: currentSession.qaData?.length || 0,
      newFaqsLength: newFaqs.length,
      currentSessionGeneratedQuestionsLength: currentSession.generatedQuestions?.length || 0
    });
    
    const updatedSession: SessionData = {
      ...currentSession,
      qaData: newFaqs,
      showFAQSection: true,
      showQuestionsSection: true, // Keep questions section visible
      statistics: {
        ...currentSession.statistics,
        totalQuestions: newFaqs.length
      }
    };
    
    console.log('[FAQ Session] Updating session with answers:', {
      id: updatedSession.id,
      qaDataLength: updatedSession.qaData.length,
      questionsLength: updatedSession.generatedQuestions?.length || 0,
      showFAQSection: updatedSession.showFAQSection
    });
    
    // Update the session in the sessions array
    setSessions(prev => {
      const updatedSessions = prev.map(session => 
        session.id === currentSession.id ? updatedSession : session
      );
      console.log('[FAQ Session] Sessions after update:', {
        totalSessions: updatedSessions.length,
        updatedSessionIndex: updatedSessions.findIndex(s => s.id === currentSession.id),
        updatedSessionQaDataLength: updatedSessions.find(s => s.id === currentSession.id)?.qaData?.length || 0
      });
      return updatedSessions;
    });
    setCurrentSession(updatedSession);
    
    // Update the UI state to show both sections
    setShowQuestionsSection(true);
    setShowFAQSection(true);
  };



  // Copy Q&A pair to clipboard
  const copyQAPair = async (question: string, answer: string) => {
    const qaText = `Q: ${question}\nA: ${answer}`;
    try {
      await navigator.clipboard.writeText(qaText);
      // You could add a toast notification here
      console.log('Q&A pair copied to clipboard');
    } catch (err) {
      console.error('Failed to copy Q&A pair:', err);
    }
  };

  // Reanalyze answer for a specific question
  const reanalyzeAnswer = async (question: string) => {
    if (!content.trim()) {
      console.error('No content available for reanalysis');
      return;
    }

    console.log('[Re-analyze] Starting re-analysis for question:', question.substring(0, 100));

    try {
      setIsGeneratingAnswers(true);
      
      const response = await apiService.generateAIFAQs({
        content,
        provider: faqProvider,
        model: faqModel,
        targetKeywords: [],
        generateAnswersOnly: true,
        selectedQuestions: [question]
      });

      if (response.success && response.faqs && response.faqs.length > 0) {
        const newAnswer = response.faqs[0].answer;
        
        // Update the existing FAQ with the new answer
        setFaqs(prev => {
          const updatedFaqs = prev.map(faq => 
            faq.question === question 
              ? { ...faq, answer: newAnswer }
              : faq
          );
          
          // Create a new session for the re-analyzed answer
          saveReanalyzedToSession(updatedFaqs, question);
          
          return updatedFaqs;
        });
        
        setNotificationMessage(`Re-analyzed answer for "${question}" successfully!`);
        console.log('Answer reanalyzed successfully and new session created');
      }
    } catch (error) {
      console.error('Error reanalyzing answer:', error);
    } finally {
      setIsGeneratingAnswers(false);
    }
  };
  
  // Delete session function
  const deleteSession = (sessionId: string) => {
    if (user?.id) {
      setSessions(prev => {
        const updatedSessions = prev.filter(session => session.id !== sessionId);
        return updatedSessions;
      });
      
      // Clear current session if it was deleted
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
      // Remove from expanded sessions
      setExpandedSessions(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(sessionId);
        return newExpanded;
      });
    }
  };
  
  // Restore session function
  const restoreSession = (session: SessionData) => {
    setCurrentSession(session);
    
    // Restore FAQ state if it's an FAQ session
    if (session.type === 'faq') {
      setFaqs(session.qaData || []);
      setShowFAQSection(true);
      setContent(session.blogContent || '');
      setFaqProvider(session.questionProvider || 'gemini');
      setFaqModel(session.questionModel || (session.questionProvider === 'perplexity' ? 'sonar' : session.questionProvider === 'claude' ? 'claude-3.5-sonnet-20241022' : 'gemini-1.5-flash'));
      
              // Reset textarea height to accommodate content
        if (textareaRef.current && session.blogContent) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
              textareaRef.current.style.height = newHeight + 'px';
            }
          }, 100);
      }
    }
  };

  return (
    <div className="flex gap-8 w-full">
      {/* Main Content */}
      <div className="flex-1 space-y-8">
        {/* Content Input Section */}
        <div className="card bg-white border border-primary/10 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-8 h-8 text-black drop-shadow" />
            <h2 className="text-3xl font-extrabold text-black tracking-tight">Content Enhancement</h2>
          </div>
          
          <div className="space-y-8">
            {/* Unified Content Input */}
            <div>
              <label className="block text-base font-semibold text-black mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-black" />
                Paste your content or enter a URL
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    // Auto-expand textarea with maximum height limit
                    const target = e.target;
                    target.style.height = 'auto';
                    const newHeight = Math.max(36, Math.min(target.scrollHeight, 150));
                    target.style.height = newHeight + 'px';
                  }}
                  placeholder="Paste URL or content here..."
                  rows={1}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 pr-12 text-black text-base placeholder-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none scrollbar-hide"
                  style={{ 
                    minHeight: '36px', 
                    maxHeight: '150px',
                    height: 'auto',
                    overflow: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                />
                {/* File Upload Plus Icon */}
                <div className="absolute right-3 bottom-3">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".txt,.md,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const text = e.target?.result as string;
                          setContent(text);
                          // Trigger height adjustment after content is set
                          setTimeout(() => {
                            if (textareaRef.current) {
                              textareaRef.current.style.height = 'auto';
                              const newHeight = Math.max(36, Math.min(textareaRef.current.scrollHeight, 150));
                              textareaRef.current.style.height = newHeight + 'px';
                            }
                          }, 100);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer p-1.5 rounded-full transition-all duration-200 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                    title="Upload file (.txt, .md, .doc, .docx)"
                  >
                    <Plus className="w-4 h-4" />
                  </label>
                </div>
              </div>
            </div>

            {/* Generate Questions Button */}
            <div className="flex items-center gap-4">
              {!user ? (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-yellow-800">⚠️ Please log in to generate questions</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Provider Selection for Questions */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-black">Provider:</label>
                    <select
                      value={faqProvider}
                      onChange={(e) => setFaqProvider(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="openai">ChatGPT</option>
                      <option value="perplexity">Perplexity</option>
                      <option value="claude">Claude</option>
                    </select>
                  </div>
                  
                  {/* Question Generation Button */}
                  <button
                    type="button"
                    onClick={generateQuestions}
                    disabled={isGeneratingQuestions || !content.trim()}
                    className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg shadow"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Generate AI Questions
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Questions Section */}
          {showQuestionsSection && generatedQuestions.length > 0 && (
            <div className="card mt-8 p-6 bg-white border border-blue-600/10 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-black">Generated Questions</h3>
                  </div>
                </div>
                
                <div className="text-sm text-black">
                  Select questions to generate answers
                </div>
              </div>
              
              {/* Generated Questions with Answers */}
              <div className="space-y-4 mb-6">
                {generatedQuestions.map((question, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(index)}
                        onChange={() => toggleQuestionSelection(index)}
                                                        className="mt-1 w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-black text-base">
                          {index + 1}. {question}
                        </div>
                        {/* Show answer if it exists */}
                        {faqs.find(faq => faq.question === question) && (
                          <div className="mt-3 p-3 bg-white rounded border border-gray-200 relative">
                            {/* Action icons positioned at top right */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              <button
                                onClick={() => copyQAPair(question, faqs.find(faq => faq.question === question)?.answer || '')}
                                className="p-1.5 bg-white border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors"
                                title="Copy question and answer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => reanalyzeAnswer(question)}
                                className="p-1.5 bg-white border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors"
                                title="Generate new answer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                            <div className="text-sm text-black mb-1 font-medium">Answer:</div>
                            <div className="text-black text-sm leading-relaxed pr-16">
                              {faqs.find(faq => faq.question === question)?.answer}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Generate Answers Button - Bottom Left */}
              <div className="flex items-center gap-4 justify-start">
                {/* Provider Selection for Answers */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-black">Provider:</label>
                  <select
                    value={faqProvider}
                    onChange={(e) => setFaqProvider(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai">ChatGPT</option>
                    <option value="perplexity">Perplexity</option>
                    <option value="claude">Claude</option>
                  </select>
                </div>
                
                <button
                  onClick={generateAnswers}
                  disabled={isGeneratingAnswers || selectedQuestions.size === 0}
                  className="bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow text-base"
                >
                  {isGeneratingAnswers ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Answers...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Generate Answers
                    </>
                  )}
                </button>
              </div>
            </div>
          )}


        </div>
      </div>
      
      {/* Right Sidebar */}
      <div className="w-80 space-y-6">
        {/* New Analysis Button */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <button
            onClick={() => {
              setContent('');
              setFaqs([]);
              setGeneratedQuestions([]);
              setSelectedQuestions(new Set());
              setShowFAQSection(false);
              setShowQuestionsSection(false);
              setCurrentSession(null);
              setIsGeneratingQuestions(false);
              setIsGeneratingAnswers(false);
              setPendingFAQGeneration(null);
              // Clear current session, pending generation, and generated FAQs from localStorage
              if (user?.id) {
                const userCurrentSessionKey = getUserSpecificKey(CURRENT_SESSION_KEY, user.id);
                const pendingKey = getUserSpecificKey('pending_faq_generation', user.id);
                const generatedFAQsKey = getUserSpecificKey('generated_faqs', user.id);
                localStorage.removeItem(userCurrentSessionKey);
                localStorage.removeItem(pendingKey);
                localStorage.removeItem(generatedFAQsKey);
              }
              // Reset textarea height to original state
              if (textareaRef.current) {
                textareaRef.current.style.height = '36px';
              }
            }}
                              className="w-full bg-white text-black font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 justify-start border border-blue-600 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Analysis
          </button>
        </div>
        
                {/* History Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-black">History</h3>
          </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {sessions.slice(0, 50).map((session, idx) => (
            <div key={session.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {session.type === 'faq' ? (
                      <svg className="w-4 h-4 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                                            <div className="text-sm font-medium text-black truncate">
                      {session.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedSessions);
                    if (newExpanded.has(session.id)) {
                      newExpanded.delete(session.id);
                    } else {
                      newExpanded.add(session.id);
                    }
                    setExpandedSessions(newExpanded);
                  }}
                  className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                  title={expandedSessions.has(session.id) ? "Collapse" : "Expand"}
                >
                  {expandedSessions.has(session.id) ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Expanded Content */}
              {expandedSessions.has(session.id) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {session.type === 'faq' ? (
                    // FAQ Session Display
                    <div className="space-y-3">
                      {session.blogUrl && (
                        <div className="text-xs text-black bg-gray-50 p-2 rounded border border-gray-200">
                          <strong>Source URL:</strong> {session.blogUrl}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 font-medium">Generated FAQs:</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Regenerate FAQs for this session
                              setContent(session.blogContent || '');
                              setFaqProvider(session.questionProvider || 'gemini');
                              setFaqModel(session.questionModel || (session.questionProvider === 'perplexity' ? 'sonar' : session.questionProvider === 'claude' ? 'claude-3.5-sonnet-20241022' : 'gemini-1.5-flash'));
                              generateQuestions();
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-black hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Regenerate FAQs"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              // Download FAQs as JSON
                              const faqData = session.qaData?.map(qa => ({
                                question: qa.question,
                                answer: qa.answer
                              })) || [];
                              const blob = new Blob([JSON.stringify(faqData, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `faqs-${session.name.replace(/\s+/g, '-')}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setNotificationMessage('FAQs downloaded successfully!');
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Download FAQs as JSON"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-all duration-200"
                            title="Delete session"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Show all questions with their answer status */}
                      {session.generatedQuestions && session.generatedQuestions.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 font-medium">
                            Questions ({session.generatedQuestions.length}):
                          </div>
                          {session.generatedQuestions.slice(0, 5).map((question, qIdx) => {
                            // Check if this question has an answer
                            const hasAnswer = session.qaData?.some(qa => qa.question === question);
                            const answer = session.qaData?.find(qa => qa.question === question);
                            
                            return (
                              <div key={qIdx} className="p-1.5 bg-white rounded border border-gray-200">
                                <div className="font-medium text-xs text-black leading-tight">
                                  Q: {question}
                                </div>
                                {hasAnswer && answer ? (
                                  <div className="text-xs text-gray-600 leading-tight mt-0.5">
                                    A: {answer.answer}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    (Answer not generated yet)
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {session.generatedQuestions.length > 5 && (
                            <div className="text-xs text-gray-500">
                              +{session.generatedQuestions.length - 5} more questions
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Provider: {session.questionProvider} | Model: {session.questionModel}
                      </div>
                    </div>
                  ) : (
                    // Q&A Session Display
                    <div className="space-y-3">
                      {session.blogUrl && (
                        <div className="text-xs text-black bg-gray-50 p-2 rounded border border-gray-200">
                          <strong>Source URL:</strong> {session.blogUrl}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 font-medium">Generated Q&A:</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Regenerate Q&A for this session
                              setContent(session.blogContent || '');
                              setFaqProvider(session.questionProvider || 'gemini');
                              setFaqModel(session.questionModel || (session.questionProvider === 'perplexity' ? 'sonar' : session.questionProvider === 'claude' ? 'claude-3.5-sonnet-20241022' : 'gemini-1.5-flash'));
                              generateQuestions();
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-black hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Regenerate Q&A"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              // Download Q&A as JSON
                              const qaData = session.qaData?.map(qa => ({
                                question: qa.question,
                                answer: qa.answer
                              })) || [];
                              const blob = new Blob([JSON.stringify(qaData, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `qa-${session.name.replace(/\s+/g, '-')}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setNotificationMessage('Q&A data downloaded successfully!');
                            }}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                            title="Download Q&A as JSON"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 bg-white border border-gray-300 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-all duration-200"
                            title="Delete session"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {session.qaData?.slice(0, 3).map((qa, qaIdx) => (
                        <div key={qaIdx} className="p-2 bg-white rounded border border-gray-200">
                          <div className="font-medium text-sm text-black mb-1">
                            Q: {qa.question}
                          </div>
                          <div className="text-xs text-gray-600">
                            A: {qa.answer}
                          </div>
                        </div>
                      ))}
                      {session.qaData && session.qaData.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{session.qaData.length - 3} more questions
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Provider: {session.questionProvider} | Model: {session.questionModel}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              No analysis history yet
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Success Notification */}
    <SuccessNotification
      message={notificationMessage}
      onClose={() => setNotificationMessage(null)}
      autoClose={true}
      autoCloseDelay={3000}
      type={notificationType}
    />
  </div>
  );
}
