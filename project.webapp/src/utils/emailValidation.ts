/**
 * Comprehensive email validation utility for both Gmail and professional domains
 * Supports Gmail guidelines while allowing professional/company email addresses
 */

// Email validation rules for both Gmail and professional domains
const EMAIL_VALIDATION_RULES = {
  // Local part (before @) rules - more flexible for professional domains
  localPart: {
    minLength: 1, // Allow shorter local parts for professional emails
    maxLength: 64, // RFC 5321 standard limit
    allowedChars: /^[a-zA-Z0-9._%+-]+$/, // Standard email characters
    startEndRules: /^[a-zA-Z0-9].*[a-zA-Z0-9]$/, // Must start and end with alphanumeric
    consecutiveDots: /\.{2,}/, // No consecutive dots
    consecutiveSpecial: /[._%+-]{2,}/, // No consecutive special characters
  },
  
  // Domain rules - more flexible for professional domains
  domain: {
    minLength: 2, // Allow shorter domains (e.g., .co, .io)
    maxLength: 63, // RFC 5321 standard limit
    allowedChars: /^[a-zA-Z0-9.-]+$/, // Standard domain characters
    startEndRules: /^[a-zA-Z0-9].*[a-zA-Z0-9]$/, // Must start and end with alphanumeric
    consecutiveDots: /\.{2,}/, // No consecutive dots
    consecutiveHyphens: /-{2,}/, // No consecutive hyphens
    tldMinLength: 2, // Top-level domain minimum length
    tldMaxLength: 10, // Top-level domain maximum length (allow longer TLDs like .technology)
  },
  
  // Overall email rules
  overall: {
    maxLength: 254, // RFC 5321 limit
    atSymbolCount: 1, // Exactly one @ symbol
  }
};

/**
 * Validates email format for both Gmail and professional domains
 * @param email - The email address to validate
 * @returns Object with validation result and detailed error messages
 */
export const validateEmail = (email: string): {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
} => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      errors: ['Email address is required']
    };
  }
  
  // Check overall length
  if (email.length > EMAIL_VALIDATION_RULES.overall.maxLength) {
    errors.push(`Email address is too long (maximum ${EMAIL_VALIDATION_RULES.overall.maxLength} characters)`);
  }
  
  // Check for exactly one @ symbol
  const atSymbolCount = (email.match(/@/g) || []).length;
  if (atSymbolCount === 0) {
    errors.push('Email address must contain an @ symbol');
  } else if (atSymbolCount > 1) {
    errors.push('Email address can only contain one @ symbol');
  }
  
  // If no @ symbol, return early
  if (atSymbolCount !== 1) {
    return {
      isValid: false,
      errors,
      suggestions
    };
  }
  
  // Split email into local and domain parts
  const [localPart, domain] = email.split('@');
  
  // Validate local part
  if (!localPart || localPart.length === 0) {
    errors.push('Email address must have a local part (before @)');
  } else {
    validateLocalPart(localPart, errors, suggestions);
  }
  
  // Validate domain
  if (!domain || domain.length === 0) {
    errors.push('Email address must have a domain part (after @)');
  } else {
    validateDomain(domain, errors, suggestions);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

/**
 * Validates email format according to Gmail guidelines (for backward compatibility)
 * @param email - The email address to validate
 * @returns Object with validation result and detailed error messages
 */
export const validateGmailEmail = (email: string): {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
} => {
  // For Gmail addresses, use stricter validation
  if (email.toLowerCase().endsWith('@gmail.com')) {
    return validateGmailStrict(email);
  }
  
  // For other domains, use standard validation
  return validateEmail(email);
};

/**
 * Validates email format for professional/company domains (more flexible than Gmail)
 * @param email - The email address to validate
 * @returns Object with validation result and detailed error messages
 */
export const validateProfessionalEmail = (email: string): {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
} => {
  // For Gmail addresses, use Gmail-specific validation
  if (email.toLowerCase().endsWith('@gmail.com')) {
    return validateGmailStrict(email);
  }
  
  // For professional domains, use standard validation
  return validateEmail(email);
};

/**
 * Strict Gmail validation following Gmail's specific guidelines
 */
const validateGmailStrict = (email: string): {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
} => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      errors: ['Email address is required']
    };
  }
  
  // Gmail-specific local part rules
  const localPart = email.split('@')[0];
  
  if (localPart.length < 6) {
    errors.push('Gmail local part must be at least 6 characters long');
  }
  if (localPart.length > 30) {
    errors.push('Gmail local part cannot exceed 30 characters');
  }
  
  // Check for Gmail-specific restrictions
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    errors.push('Gmail local part must start and end with a letter or number');
  }
  
  if (/\.{2,}/.test(localPart)) {
    errors.push('Gmail local part cannot contain consecutive dots');
  }
  
  // Use standard validation for the rest
  const standardValidation = validateEmail(email);
  errors.push(...standardValidation.errors);
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

/**
 * Validates the local part of an email address
 */
const validateLocalPart = (localPart: string, errors: string[], suggestions: string[]): void => {
  // Check length
  if (localPart.length < EMAIL_VALIDATION_RULES.localPart.minLength) {
    errors.push(`Local part must be at least ${EMAIL_VALIDATION_RULES.localPart.minLength} characters long`);
  }
  
  if (localPart.length > EMAIL_VALIDATION_RULES.localPart.maxLength) {
    errors.push(`Local part cannot exceed ${EMAIL_VALIDATION_RULES.localPart.maxLength} characters`);
  }
  
  // Check allowed characters
  if (!EMAIL_VALIDATION_RULES.localPart.allowedChars.test(localPart)) {
    errors.push('Local part can only contain letters, numbers, and the following characters: . _ % + -');
    suggestions.push('Remove any special characters that are not allowed');
  }
  
  // Check start and end rules
  if (!EMAIL_VALIDATION_RULES.localPart.startEndRules.test(localPart)) {
    errors.push('Local part must start and end with a letter or number');
    suggestions.push('Ensure the local part starts and ends with a letter or number');
  }
  
  // Check consecutive dots
  if (EMAIL_VALIDATION_RULES.localPart.consecutiveDots.test(localPart)) {
    errors.push('Local part cannot contain consecutive dots');
    suggestions.push('Remove consecutive dots from the local part');
  }
  
  // Check consecutive special characters
  if (EMAIL_VALIDATION_RULES.localPart.consecutiveSpecial.test(localPart)) {
    errors.push('Local part cannot contain consecutive special characters');
    suggestions.push('Remove consecutive special characters from the local part');
  }
  
  // Check for common Gmail restrictions
  if (localPart.toLowerCase() === 'gmail' || localPart.toLowerCase() === 'google') {
    errors.push('This local part is not allowed by Gmail');
    suggestions.push('Choose a different local part for your email address');
  }
  
  // Check for reserved words
  const reservedWords = ['admin', 'administrator', 'postmaster', 'abuse', 'webmaster', 'support', 'info'];
  if (reservedWords.includes(localPart.toLowerCase())) {
    suggestions.push('This local part might be reserved. Consider using a different one.');
  }
};

/**
 * Validates the domain part of an email address
 */
const validateDomain = (domain: string, errors: string[], suggestions: string[]): void => {
  // Check length
  if (domain.length < EMAIL_VALIDATION_RULES.domain.minLength) {
    errors.push(`Domain must be at least ${EMAIL_VALIDATION_RULES.domain.minLength} characters long`);
  }
  
  if (domain.length > EMAIL_VALIDATION_RULES.domain.maxLength) {
    errors.push(`Domain cannot exceed ${EMAIL_VALIDATION_RULES.domain.maxLength} characters`);
  }
  
  // Check allowed characters
  if (!EMAIL_VALIDATION_RULES.domain.allowedChars.test(domain)) {
    errors.push('Domain can only contain letters, numbers, dots, and hyphens');
    suggestions.push('Remove any special characters that are not allowed in the domain');
  }
  
  // Check start and end rules
  if (!EMAIL_VALIDATION_RULES.domain.startEndRules.test(domain)) {
    errors.push('Domain must start and end with a letter or number');
    suggestions.push('Ensure the domain starts and ends with a letter or number');
  }
  
  // Check consecutive dots
  if (EMAIL_VALIDATION_RULES.domain.consecutiveDots.test(domain)) {
    errors.push('Domain cannot contain consecutive dots');
    suggestions.push('Remove consecutive dots from the domain');
  }
  
  // Check consecutive hyphens
  if (EMAIL_VALIDATION_RULES.domain.consecutiveHyphens.test(domain)) {
    errors.push('Domain cannot contain consecutive hyphens');
    suggestions.push('Remove consecutive hyphens from the domain');
  }
  
  // Check for valid TLD (top-level domain)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    errors.push('Domain must have at least one dot (e.g., .com, .org)');
  } else {
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < EMAIL_VALIDATION_RULES.domain.tldMinLength) {
      errors.push(`Top-level domain must be at least ${EMAIL_VALIDATION_RULES.domain.tldMinLength} characters long`);
    }
    if (tld.length > EMAIL_VALIDATION_RULES.domain.tldMaxLength) {
      errors.push(`Top-level domain cannot exceed ${EMAIL_VALIDATION_RULES.domain.tldMaxLength} characters`);
    }
    
    // Check if TLD contains only letters
    if (!/^[a-zA-Z]+$/.test(tld)) {
      errors.push('Top-level domain can only contain letters');
      suggestions.push('Ensure the top-level domain contains only letters (e.g., .com, .org)');
    }
  }
  
  // Check for common invalid domains
  if (domain.toLowerCase() === 'localhost' || domain.toLowerCase() === 'test') {
    errors.push('This domain is not valid for email addresses');
    suggestions.push('Use a real domain name for your email address');
  }
};

/**
 * Get user-friendly error message for email validation
 * @param email - The email address that was validated
 * @param validationResult - The validation result object
 * @returns User-friendly error message
 */
export const getEmailValidationMessage = (
  email: string, 
  validationResult: ReturnType<typeof validateEmail>
): string => {
  if (validationResult.isValid) {
    return '';
  }
  
  const firstError = validationResult.errors[0];
  
  const userFriendlyMessages: { [key: string]: string } = {
    'Email address is required': 'Please enter your email address',
    'Email address must contain an @ symbol': 'Please enter a valid email address',
    'Email address can only contain one @ symbol': 'Please enter a valid email address',
    'Email address must have a local part (before @)': 'Please enter a valid email address',
    'Email address must have a domain part (after @)': 'Please enter a valid email address',
    'Local part must be at least 1 characters long': 'Please enter a valid email address',
    'Local part cannot exceed 64 characters': 'Please enter a valid email address',
    'Local part can only contain letters, numbers, and the following characters: . _ % + -': 'Please enter a valid email address',
    'Local part must start and end with a letter or number': 'Please enter a valid email address',
    'Local part cannot contain consecutive dots': 'Please enter a valid email address',
    'Local part cannot contain consecutive special characters': 'Please enter a valid email address',
    'Domain must be at least 2 characters long': 'Please enter a valid email address',
    'Domain cannot exceed 63 characters': 'Please enter a valid email address',
    'Domain can only contain letters, numbers, dots, and hyphens': 'Please enter a valid email address',
    'Domain must start and end with a letter or number': 'Please enter a valid email address',
    'Domain cannot contain consecutive dots': 'Please enter a valid email address',
    'Domain cannot contain consecutive hyphens': 'Please enter a valid email address',
    'Domain must have at least one dot (e.g., .com, .org)': 'Please enter a valid email address',
    'Top-level domain must be at least 2 characters long': 'Please enter a valid email address',
    'Top-level domain cannot exceed 10 characters': 'Please enter a valid email address',
    'Top-level domain can only contain letters': 'Please enter a valid email address',
    'Email address is too long (maximum 254 characters)': 'Please enter a valid email address',
    // Gmail-specific messages
    'Gmail local part must be at least 6 characters long': 'Gmail addresses must be at least 6 characters before @',
    'Gmail local part cannot exceed 30 characters': 'Gmail addresses cannot exceed 30 characters before @',
    'Gmail local part must start and end with a letter or number': 'Gmail addresses must start and end with a letter or number'
  };
  
  return userFriendlyMessages[firstError] || 'Please enter a valid email address';
};

/**
 * Provides helpful suggestions for fixing email validation issues
 * @param validationResult - The result from validateGmailEmail
 * @returns Array of suggestion strings
 */
export const getEmailValidationSuggestions = (
  validationResult: ReturnType<typeof validateGmailEmail>
): string[] => {
  return validationResult.suggestions || [];
};

/**
 * Quick validation function for simple use cases
 * @param email - The email address to validate
 * @returns True if email is valid, false otherwise
 */
export const isEmailValid = (email: string): boolean => {
  return validateGmailEmail(email).isValid;
};

/**
 * Formats email for better user experience
 * @param email - The email address to format
 * @returns Formatted email address
 */
export const formatEmail = (email: string): string => {
  if (!email) return '';
  
  // Remove extra spaces and convert to lowercase
  let formatted = email.trim().toLowerCase();
  
  // Remove multiple spaces
  formatted = formatted.replace(/\s+/g, '');
  
  return formatted;
};

// Remove duplicate export statements - functions are already exported at declaration
