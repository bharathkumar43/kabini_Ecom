import React, { forwardRef, useCallback } from 'react';
import { filterEmojis } from '../../utils/emojiFilter';

interface EmojiBlockingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (value: string) => void;
}

export const EmojiBlockingInput = forwardRef<HTMLInputElement, EmojiBlockingInputProps>(
  ({ value, onChange, onPaste, ...props }, ref) => {
    
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const originalValue = input.value;
      const filteredValue = filterEmojis(originalValue);
      
      // Always use filtered value to ensure no emojis in state
      onChange(filteredValue);
      
      // If emojis were found, update the DOM immediately
      if (filteredValue !== originalValue) {
        input.value = filteredValue;
        
        // Set cursor position to end of filtered text
        input.setSelectionRange(filteredValue.length, filteredValue.length);
        
        // Trigger events to ensure React state is in sync
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, [onChange]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
      // Prevent the default paste behavior
      e.preventDefault();
      
      const pastedText = e.clipboardData.getData('text');
      const filteredValue = filterEmojis(pastedText);
      
      // Set the value directly to the input element
      const target = e.target as HTMLInputElement;
      target.value = filteredValue;
      
      // Update the state with filtered value
      onChange(filteredValue);
      
      // Set cursor position to end of filtered text
      target.setSelectionRange(filteredValue.length, filteredValue.length);
      
      // Trigger events to ensure React state is in sync
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Call custom onPaste handler if provided
      if (onPaste) {
        onPaste(filteredValue);
      }
    }, [onChange, onPaste]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow common keys like backspace, delete, arrows, etc.
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || 
          e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
          e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' ||
          e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown' ||
          e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }
      
      // Block emoji composition sequences (like Windows key + .)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Allow common shortcuts but block emoji composition
        if (e.key === '.' || e.key === ';' || e.key === '=') {
          // These keys are often used for emoji composition
          e.preventDefault();
          return;
        }
      }
      
      // Block any key that might be part of an emoji sequence
      if (e.key.length > 1 && (e.key.includes('Emoji') || e.key.includes('emoji'))) {
        e.preventDefault();
        return;
      }
    }, []);

    const handleCompositionStart = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
      // Block emoji composition (IME input methods)
      e.preventDefault();
    }, []);

    const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
      // Block emoji composition updates
      e.preventDefault();
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
      // Block emoji composition end
      e.preventDefault();
    }, []);

    return (
      <input
        ref={ref}
        value={value}
        onChange={handleInputChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        {...props}
      />
    );
  }
);

EmojiBlockingInput.displayName = 'EmojiBlockingInput';
