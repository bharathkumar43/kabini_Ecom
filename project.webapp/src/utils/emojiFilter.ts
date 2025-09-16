/**
 * Utility functions to filter out emojis from text inputs
 */

// Regex to match emoji characters (including emoji sequences, modifiers, etc.)
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[\u{1FA70}-\u{1FA93}]|[\u{1FAB0}-\u{1FABD}]|[\u{1FAC0}-\u{1FAF0}]|[\u{1FB00}-\u{1FB4B}]|[\u{1FB50}-\u{1FBAF}]|[\u{1FBB0}-\u{1FBCA}]|[\u{1FBD0}-\u{1FBEF}]|[\u{1FBF0}-\u{1FBFF}]|[\u{1FC00}-\u{1FC23}]|[\u{1FC30}-\u{1FC56}]|[\u{1FC60}-\u{1FC78}]|[\u{1FC80}-\u{1FC9C}]|[\u{1FCA0}-\u{1FCA4}]|[\u{1FCC0}-\u{1FCC4}]|[\u{1FCD0}-\u{1FCD4}]|[\u{1FCE0}-\u{1FCE4}]|[\u{1FCF0}-\u{1FCF4}]|[\u{1FD00}-\u{1FD23}]|[\u{1FD30}-\u{1FD56}]|[\u{1FD60}-\u{1FD78}]|[\u{1FD80}-\u{1FD9C}]|[\u{1FDA0}-\u{1FDA4}]|[\u{1FDB0}-\u{1FDB4}]|[\u{1FDC0}-\u{1FDC4}]|[\u{1FDD0}-\u{1FDD4}]|[\u{1FDE0}-\u{1FDE4}]|[\u{1FDF0}-\u{1FDF4}]|[\u{1FE00}-\u{1FE23}]|[\u{1FE30}-\u{1FE56}]|[\u{1FE60}-\u{1FE78}]|[\u{1FE80}-\u{1FE9C}]|[\u{1FEA0}-\u{1FEA4}]|[\u{1FEB0}-\u{1FEB4}]|[\u{1FEC0}-\u{1FEC4}]|[\u{1FED0}-\u{1FED4}]|[\u{1FEE0}-\u{1FEE4}]|[\u{1FEF0}-\u{1FEF4}]|[\u{1FF00}-\u{1FF23}]|[\u{1FF30}-\u{1FF56}]|[\u{1FF60}-\u{1FF78}]|[\u{1FF80}-\u{1FF9C}]|[\u{1FFA0}-\u{1FFA4}]|[\u{1FFB0}-\u{1FFB4}]|[\u{1FFC0}-\u{1FFC4}]|[\u{1FFD0}-\u{1FFD4}]|[\u{1FFE0}-\u{1FFE4}]|[\u{1FFF0}-\u{1FFF4}]/gu;

/**
 * Filters out emojis from a string
 * @param text - The input text that may contain emojis
 * @returns The text with all emojis removed
 */
export const filterEmojis = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(EMOJI_REGEX, '');
};

/**
 * Checks if a string contains any emojis
 * @param text - The input text to check
 * @returns True if the text contains emojis, false otherwise
 */
export const containsEmojis = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  return EMOJI_REGEX.test(text);
};

/**
 * Comprehensive emoji blocking function that can be used directly on input elements
 * This function blocks emojis at multiple levels: typing, pasting, and composition
 * @param e - The input event
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const blockEmojisCompletely = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  const input = e.target;
  const originalValue = input.value;
  const filteredValue = filterEmojis(originalValue);
  
  // If emojis were found and filtered out, update the input immediately
  if (filteredValue !== originalValue) {
    input.value = filteredValue;
    
    // Update the state
    setter(filteredValue);
    
    // Trigger events to ensure React state is in sync
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    return filteredValue;
  }
  
  // No emojis found, just update state normally
  setter(originalValue);
  return originalValue;
};

/**
 * Enhanced input change handler that blocks emojis more aggressively
 * @param e - The change event from an input element
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const handleInputChangeEnhanced = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  return blockEmojisCompletely(e, setter);
};

/**
 * Original input change handler for backward compatibility
 * @param e - The change event from an input element
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const handleInputChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  const filteredValue = filterEmojis(e.target.value);
  
  // Update the DOM element value to remove emojis immediately
  e.target.value = filteredValue;
  
  // Update the state
  setter(filteredValue);
  
  // Trigger a change event to ensure React state is in sync
  e.target.dispatchEvent(new Event('input', { bubbles: true }));
  
  return filteredValue;
};

/**
 * Event handler for paste events that filters out emojis
 * @param e - The clipboard event
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const handlePaste = (
  e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  // Prevent the default paste behavior to avoid duplication
  e.preventDefault();
  
  const pastedText = e.clipboardData.getData('text');
  const filteredValue = filterEmojis(pastedText);
  
  // Set the value directly to the input element
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  target.value = filteredValue;
  
  // Update the state
  setter(filteredValue);
  
  // Trigger a change event to ensure React state is in sync
  target.dispatchEvent(new Event('input', { bubbles: true }));
  
  return filteredValue;
};

/**
 * Event handler for keydown events that prevents emoji input
 * @param e - The keyboard event
 * @returns True if the key should be allowed, false if it's an emoji
 */
export const handleKeyDown = (e: React.KeyboardEvent): boolean => {
  // Allow common keys like backspace, delete, arrows, etc.
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' ||
      e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown' ||
      e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
    return true;
  }
  
  // Check if the key combination would result in an emoji
  const key = e.key;
  
  // Block single emoji characters
  if (key.length === 1 && EMOJI_REGEX.test(key)) {
    e.preventDefault();
    return false;
  }
  
  // Block emoji composition sequences (like Windows key + .)
  if (e.ctrlKey || e.metaKey || e.altKey) {
    // Allow common shortcuts but block emoji composition
    if (key === '.' || key === ';' || key === '=') {
      // These keys are often used for emoji composition
      e.preventDefault();
      return false;
    }
  }
  
  // Block any key that might be part of an emoji sequence
  if (key.length > 1 && (key.includes('Emoji') || key.includes('emoji'))) {
    e.preventDefault();
    return false;
  }
  
  return true;
};

/**
 * Ultra-aggressive emoji blocking that prevents emojis at the source
 * @param e - The input event
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const blockEmojisUltraAggressive = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  const input = e.target;
  const originalValue = input.value;
  const filteredValue = filterEmojis(originalValue);
  
  // Always use filtered value to ensure no emojis in state
  setter(filteredValue);
  
  // If emojis were found, update the DOM immediately and prevent further input
  if (filteredValue !== originalValue) {
    // Update the DOM element value to remove emojis immediately
    input.value = filteredValue;
    
    // Trigger events to ensure React state is in sync
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Additional protection: set cursor position to end of filtered text
    input.setSelectionRange(filteredValue.length, filteredValue.length);
  }
  
  return filteredValue;
};


