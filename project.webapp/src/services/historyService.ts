import { HistoryItem, QAHistoryItem, AIVisibilityHistoryItem, ContentAnalysisHistoryItem, StructureAnalysisHistoryItem, SessionData } from '../types';
import { authService } from './authService';

export interface HistoryService {
  addHistoryItem: (item: HistoryItem) => Promise<void>;
  getHistoryItems: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  exportHistoryItem: (id: string) => Promise<{ content: string; filename: string; mimeType: string } | null>;
  exportAllHistory: () => Promise<{ content: string; filename: string; mimeType: string }>;
  clearUserData: () => Promise<void>;
}

class LocalHistoryService implements HistoryService {
  private getStorageKey(key: string): string {
    const userId = authService.getCurrentUserId();
    return userId ? `${key}_${userId}` : `${key}_anonymous`;
  }

  private getHistoryKey(): string {
    return this.getStorageKey('comprehensive_history');
  }

  async addHistoryItem(item: HistoryItem): Promise<void> {
    try {
      console.log('[HistoryService] Adding history item to localStorage:', item);
      
      const historyKey = this.getHistoryKey();
      const existingHistory = this.getHistoryFromStorage(historyKey);
      
      // Add new item to the beginning
      const updatedHistory = [item, ...existingHistory];
      
      // Save back to localStorage
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      
      console.log('[HistoryService] History item saved successfully to localStorage');
    } catch (error) {
      console.error('[HistoryService] Error saving history item to localStorage:', error);
      throw error;
    }
  }

  async getHistoryItems(): Promise<HistoryItem[]> {
    try {
      const historyKey = this.getHistoryKey();
      const items = this.getHistoryFromStorage(historyKey);
      console.log('[HistoryService] Retrieved history items from localStorage:', items.length);
      return items;
    } catch (error) {
      console.error('[HistoryService] Error getting history items from localStorage:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      console.log('[HistoryService] Clearing history from localStorage...');
      const historyKey = this.getHistoryKey();
      localStorage.removeItem(historyKey);
      console.log('[HistoryService] History cleared successfully from localStorage');
    } catch (error) {
      console.error('[HistoryService] Error clearing history from localStorage:', error);
      throw error;
    }
  }

  async deleteHistoryItem(id: string): Promise<void> {
    try {
      console.log('[HistoryService] Deleting history item from localStorage:', id);
      const historyKey = this.getHistoryKey();
      const existingHistory = this.getHistoryFromStorage(historyKey);
      
      const updatedHistory = existingHistory.filter(item => item.id !== id);
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      
      console.log('[HistoryService] History item deleted successfully from localStorage');
    } catch (error) {
      console.error('[HistoryService] Error deleting history item from localStorage:', error);
      throw error;
    }
  }

  async exportHistoryItem(id: string): Promise<{ content: string; filename: string; mimeType: string } | null> {
    try {
      console.log('[HistoryService] Exporting history item from localStorage:', id);
      const historyKey = this.getHistoryKey();
      const existingHistory = this.getHistoryFromStorage(historyKey);
      
      const item = existingHistory.find(item => item.id === id);
      if (!item) {
        return null;
      }

      const content = JSON.stringify(item, null, 2);
      const filename = `${item.type}_${item.id}.json`;
      
      console.log('[HistoryService] History item exported successfully from localStorage');
      return {
        content,
        filename,
        mimeType: 'application/json'
      };
    } catch (error) {
      console.error('[HistoryService] Error exporting history item from localStorage:', error);
      return null;
    }
  }

  async exportAllHistory(): Promise<{ content: string; filename: string; mimeType: string }> {
    try {
      console.log('[HistoryService] Exporting all history from localStorage...');
      const historyKey = this.getHistoryKey();
      const existingHistory = this.getHistoryFromStorage(historyKey);
      
      const content = JSON.stringify(existingHistory, null, 2);
      const filename = `all_history_${new Date().toISOString().split('T')[0]}.json`;
      
      console.log('[HistoryService] All history exported successfully from localStorage');
      return {
        content,
        filename,
        mimeType: 'application/json'
      };
    } catch (error) {
      console.error('[HistoryService] Error exporting all history from localStorage:', error);
      return {
        content: '[]',
        filename: 'empty_history.json',
        mimeType: 'application/json'
      };
    }
  }

  async clearUserData(): Promise<void> {
    try {
      console.log('[HistoryService] Clearing user data from localStorage...');
      const userId = authService.getCurrentUserId();
      
      if (userId) {
        // Clear all user-specific keys
        const keysToRemove = [
          this.getStorageKey('comprehensive_history'),
          this.getStorageKey('qa_history'),
          this.getStorageKey('ai_visibility_history'),
          this.getStorageKey('content_analysis_history'),
          this.getStorageKey('structure_analysis_history')
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log('[HistoryService] User data cleared successfully from localStorage');
      }
    } catch (error) {
      console.error('[HistoryService] Error clearing user data from localStorage:', error);
      throw error;
    }
  }

  private getHistoryFromStorage(key: string): HistoryItem[] {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[HistoryService] Error parsing history from localStorage:', error);
      return [];
    }
  }
}

export const historyService = new LocalHistoryService();
