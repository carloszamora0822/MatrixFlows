// VBT Vestaboard System - Shared Constants

// Vestaboard Character Mapping (Complete 70-character set)
const VESTABOARD_CHAR_MAP = {
  // Blank/Space
  ' ': 0,
  
  // Letters A-Z (codes 1-26)
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
  'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'Q': 17, 'R': 18, 'S': 19, 'T': 20,
  'U': 21, 'V': 22, 'W': 23, 'X': 24, 'Y': 25, 'Z': 26,
  
  // Numbers 1-0 (codes 27-36)
  '1': 27, '2': 28, '3': 29, '4': 30, '5': 31, '6': 32, '7': 33, '8': 34, '9': 35, '0': 36,
  
  // Special Characters
  '!': 37,    // Exclamation Mark
  '@': 38,    // At
  '#': 39,    // Pound
  '$': 40,    // Dollar
  '(': 41,    // Left Parenthesis
  ')': 42,    // Right Parenthesis
  '-': 44,    // Hyphen
  '+': 46,    // Plus
  '&': 47,    // Ampersand
  '=': 48,    // Equal
  ';': 49,    // Semicolon
  ':': 50,    // Colon
  "'": 52,    // Single Quote
  '"': 53,    // Double Quote
  '%': 54,    // Percent
  ',': 55,    // Comma
  '.': 56,    // Period
  '/': 59,    // Slash
  '?': 60,    // Question Mark
  '°': 62,    // Degree (Vestaboard Flagship only)
  
  // Color Codes
  'RED': 63,
  'ORANGE': 64,
  'YELLOW': 65,
  'GREEN': 66,
  'BLUE': 67,
  'VIOLET': 68,
  'WHITE': 69,
  'BLACK': 70
};

// Reverse mapping for display purposes
const CHAR_CODE_TO_CHAR = {};
Object.entries(VESTABOARD_CHAR_MAP).forEach(([char, code]) => {
  if (typeof code === 'number' && code <= 62) { // Only text characters, not colors
    CHAR_CODE_TO_CHAR[code] = char;
  }
});

// Screen Types
const SCREEN_TYPES = {
  BIRTHDAY: 'BIRTHDAY',
  CHECKRIDES: 'CHECKRIDES',
  UPCOMING_EVENTS: 'UPCOMING_EVENTS',
  NEWEST_PILOT: 'NEWEST_PILOT',
  EMPLOYEE_RECOGNITION: 'EMPLOYEE_RECOGNITION',
  METAR: 'METAR',
  WEATHER: 'WEATHER',
  CUSTOM_MESSAGE: 'CUSTOM_MESSAGE'
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// Organization Constants
const ORG_CONFIG = {
  ID: 'VBT',
  NAME: 'VBT'
};

// API Response Codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED'
};

module.exports = {
  VESTABOARD_CHAR_MAP,
  CHAR_CODE_TO_CHAR,
  SCREEN_TYPES,
  USER_ROLES,
  ORG_CONFIG,
  ERROR_CODES
};
