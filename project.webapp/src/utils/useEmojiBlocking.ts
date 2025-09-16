import { useCallback } from 'react';
import { filterEmojis } from './emojiFilter';

/**
 * Custom hook that provides comprehensive emoji blocking for input fields
 * @returns Object with emoji-blocking event handlers
 */
export const useEmojiBlocking = () => {
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    const input = e.target;
    const originalValue = input.value;
    const filteredValue = filterEmojis(originalValue);
    
    // If emojis were found and filtered out, update the input immediately
    if (filteredValue !== originalValue) {
      // Update the DOM element value to remove emojis immediately
      input.value = filteredValue;
      
      // Update the state with filtered value (no emojis)
      setter(filteredValue);
      
      // Trigger events to ensure React state is in sync
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      return filteredValue;
    }
    
    // No emojis found, just update state normally
    setter(originalValue);
    return originalValue;
  }, []);

  const handlePaste = useCallback((
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    // Prevent the default paste behavior to avoid duplication
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const filteredValue = filterEmojis(pastedText);
    
    // Set the value directly to the input element
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    target.value = filteredValue;
    
    // Update the state with filtered value (no emojis)
    setter(filteredValue);
    
    // Trigger a change event to ensure React state is in sync
    target.dispatchEvent(new Event('input', { bubbles: true }));
    
    return filteredValue;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow common keys like backspace, delete, arrows, etc.
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' ||
        e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown' ||
        e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
      return true;
    }
    
    // Block emoji composition sequences (like Windows key + .)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Allow common shortcuts but block emoji composition
      if (e.key === '.' || e.key === ';' || e.key === '=') {
        // These keys are often used for emoji composition
        e.preventDefault();
        return false;
      }
    }
    
    // Block any key that might be part of an emoji sequence
    if (e.key.length > 1 && (e.key.includes('Emoji') || e.key.includes('emoji'))) {
      e.preventDefault();
      return false;
    }
    
    return true;
  }, []);

  const handleCompositionStart = useCallback((e: React.CompositionEvent) => {
    // Block emoji composition (IME input methods)
    e.preventDefault();
    return false;
  }, []);

  const handleCompositionUpdate = useCallback((e: React.CompositionEvent) => {
    // Block emoji composition updates
    e.preventDefault();
    return false;
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent) => {
    // Block emoji composition end
    e.preventDefault();
    return false;
  }, []);

  // Enhanced input handler that completely blocks emojis from state
  const handleInputChangeAggressive = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    const input = e.target;
    const originalValue = input.value;
    const filteredValue = filterEmojis(originalValue);
    
    // Always use filtered value to ensure no emojis in state
    setter(filteredValue);
    
    // If emojis were found, update the DOM immediately
    if (filteredValue !== originalValue) {
      input.value = filteredValue;
      
      // Trigger events to ensure React state is in sync
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    return filteredValue;
  }, []);

  return {
    handleInputChange,
    handleInputChangeAggressive,
    handlePaste,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd
  };
};
