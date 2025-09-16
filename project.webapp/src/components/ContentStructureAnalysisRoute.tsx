import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// Content structure analysis disabled; route kept for compatibility
import { ContentStructureAnalysis } from './ContentStructureAnalysis';
import ErrorBoundary from './ui/ErrorBoundary';

export function ContentStructureAnalysisRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get content and URL from navigation state
  const { content = '', url = '' } = location.state || {};

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <ErrorBoundary fallbackMessage="Structure analysis failed. Click reset and then Restore Last Analysis to reload your previous results.">
      <ContentStructureAnalysis 
        content={content} 
        url={url} 
        onBack={handleBack} 
      />
    </ErrorBoundary>
  );
} 