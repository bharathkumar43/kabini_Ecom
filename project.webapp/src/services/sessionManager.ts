interface AnalysisSession {
  id: string;
  type: 'overview' | 'ai-visibility' | 'content-structure' | 'competitor';
  data: any;
  timestamp: number;
  expiresAt: number;
  userId?: string;
  inputValue: string;
  analysisType?: string;
  inputType?: string;
  industry?: string;
}

class SessionManager {
  private readonly SESSION_PREFIX = 'kabini_analysis_session_';
  private readonly SESSION_EXPIRY_DAYS = 7; // Sessions expire after 7 days
  private readonly MAX_SESSIONS_PER_TYPE = 5; // Keep max 5 sessions per analysis type

  /**
   * Save analysis data with proper session management
   */
  saveAnalysisSession(
    type: AnalysisSession['type'],
    data: any,
    inputValue: string,
    analysisType?: string,
    inputType?: string,
    industry?: string,
    userId?: string
  ): string {
    const sessionId = this.generateSessionId(type);
    const now = Date.now();
    const expiresAt = now + (this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const session: AnalysisSession = {
      id: sessionId,
      type,
      data,
      timestamp: now,
      expiresAt,
      userId,
      inputValue,
      analysisType,
      inputType,
      industry
    };

    // Save the session
    localStorage.setItem(this.SESSION_PREFIX + sessionId, JSON.stringify(session));

    // Update session index
    this.updateSessionIndex(type, sessionId);

    // Clean up old sessions
    this.cleanupOldSessions(type);

    console.log(`[SessionManager] Saved ${type} session:`, sessionId);
    return sessionId;
  }

  /**
   * Retrieve the most recent analysis session for a given type
   */
  getLatestAnalysisSession(type: AnalysisSession['type'], userId?: string): AnalysisSession | null {
    const sessionIds = this.getSessionIndex(type);
    if (sessionIds.length === 0) return null;

    // Iterate from newest to oldest and return the first valid session for this user
    for (let i = sessionIds.length - 1; i >= 0; i--) {
      const sessionId = sessionIds[i];
      const raw = localStorage.getItem(this.SESSION_PREFIX + sessionId);
      if (!raw) {
        // Clean up missing entry from index
        this.removeSession(sessionId);
        continue;
      }
      try {
        const session: AnalysisSession = JSON.parse(raw);
        // Expired → remove and continue searching
        if (session.expiresAt < Date.now()) {
          this.removeSession(session.id);
          continue;
        }
        // If userId is provided, require an exact match (ignore sessions without userId)
        if (userId && session.userId !== userId) {
          continue;
        }
        return session;
      } catch (e) {
        console.error('[SessionManager] Error parsing session data:', e);
        this.removeSession(sessionId);
      }
    }
    return null;
  }

  /**
   * Get all active sessions for a user
   */
  getAllActiveSessions(userId?: string): AnalysisSession[] {
    const allSessions: AnalysisSession[] = [];
    const types: AnalysisSession['type'][] = ['overview', 'ai-visibility', 'content-structure', 'competitor'];

    types.forEach(type => {
      const sessionIds = this.getSessionIndex(type);
      sessionIds.forEach(sessionId => {
        const sessionData = localStorage.getItem(this.SESSION_PREFIX + sessionId);
        if (sessionData) {
          try {
            const session: AnalysisSession = JSON.parse(sessionData);
            
            // Check if session is expired
            if (session.expiresAt < Date.now()) {
              this.removeSession(session.id);
              return;
            }

            // Check if session belongs to the current user (if userId is provided)
            if (userId && session.userId && session.userId !== userId) {
              return;
            }

            allSessions.push(session);
          } catch (error) {
            console.error('[SessionManager] Error parsing session data:', error);
            this.removeSession(sessionId);
          }
        }
      });
    });

    // Sort by timestamp (newest first)
    return allSessions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all sessions for a specific type
   */
  clearSessionsByType(type: AnalysisSession['type']): void {
    const sessionIds = this.getSessionIndex(type);
    sessionIds.forEach(sessionId => {
      this.removeSession(sessionId);
    });
    
    // Clear the index
    localStorage.removeItem(`kabini_session_index_${type}`);
    
    console.log(`[SessionManager] Cleared all ${type} sessions`);
  }

  /**
   * Clear all sessions for a user
   */
  clearAllSessions(userId?: string): void {
    const allSessions = this.getAllActiveSessions(userId);
    allSessions.forEach(session => {
      this.removeSession(session.id);
    });

    // Clear all indexes
    const types: AnalysisSession['type'][] = ['overview', 'ai-visibility', 'content-structure', 'competitor'];
    types.forEach(type => {
      localStorage.removeItem(`kabini_session_index_${type}`);
    });

    console.log('[SessionManager] Cleared all sessions');
  }

  /**
   * Remove a specific session
   */
  private removeSession(sessionId: string): void {
    localStorage.removeItem(this.SESSION_PREFIX + sessionId);
    
    // Remove from all indexes
    const types: AnalysisSession['type'][] = ['overview', 'ai-visibility', 'content-structure', 'competitor'];
    types.forEach(type => {
      const sessionIds = this.getSessionIndex(type);
      const updatedIds = sessionIds.filter(id => id !== sessionId);
      this.setSessionIndex(type, updatedIds);
    });
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(type: AnalysisSession['type']): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session index for a specific type
   */
  private getSessionIndex(type: AnalysisSession['type']): string[] {
    try {
      const indexData = localStorage.getItem(`kabini_session_index_${type}`);
      return indexData ? JSON.parse(indexData) : [];
    } catch {
      return [];
    }
  }

  /**
   * Set session index for a specific type
   */
  private setSessionIndex(type: AnalysisSession['type'], sessionIds: string[]): void {
    localStorage.setItem(`kabini_session_index_${type}`, JSON.stringify(sessionIds));
  }

  /**
   * Update session index for a specific type
   */
  private updateSessionIndex(type: AnalysisSession['type'], sessionId: string): void {
    const sessionIds = this.getSessionIndex(type);
    
    // Remove if already exists
    const filteredIds = sessionIds.filter(id => id !== sessionId);
    
    // Add to the end (most recent)
    filteredIds.push(sessionId);
    
    // Keep only the most recent sessions
    if (filteredIds.length > this.MAX_SESSIONS_PER_TYPE) {
      filteredIds.splice(0, filteredIds.length - this.MAX_SESSIONS_PER_TYPE);
    }
    
    this.setSessionIndex(type, filteredIds);
  }

  /**
   * Clean up old sessions for a specific type
   */
  private cleanupOldSessions(type: AnalysisSession['type']): void {
    const sessionIds = this.getSessionIndex(type);
    const now = Date.now();
    
    sessionIds.forEach(sessionId => {
      const sessionData = localStorage.getItem(this.SESSION_PREFIX + sessionId);
      if (sessionData) {
        try {
          const session: AnalysisSession = JSON.parse(sessionData);
          if (session.expiresAt < now) {
            this.removeSession(session.id);
          }
        } catch {
          this.removeSession(sessionId);
        }
      }
    });
  }

  /**
   * Check if a session exists and is valid
   */
  isSessionValid(type: AnalysisSession['type'], userId?: string): boolean {
    const session = this.getLatestAnalysisSession(type, userId);
    return session !== null;
  }

  /**
   * Get session age in hours
   */
  getSessionAge(type: AnalysisSession['type'], userId?: string): number {
    const session = this.getLatestAnalysisSession(type, userId);
    if (!session) return 0;
    
    const now = Date.now();
    const ageMs = now - session.timestamp;
    return Math.floor(ageMs / (1000 * 60 * 60)); // Convert to hours
  }
}

export const sessionManager = new SessionManager();
export type { AnalysisSession };
