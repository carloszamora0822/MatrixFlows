# Sprint 2: Screen Engine & Character Mapping

## Goal
Build the core screen rendering engine that converts screen configurations into 6×22 character matrices for Vestaboard display.

## Duration
1 Week

## Deliverables
- Complete character mapping system
- Screen engine with template support
- Preview API endpoint
- Matrix visualization component
- All manual screen types implemented
- Screen preview functionality in UI

## Requirements

### 1. Character Mapping System
```javascript
// shared/constants.js
const VESTABOARD_CHAR_MAP = {
  // Blank
  ' ': 0,
  
  // Letters A-Z
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
  'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'Q': 17, 'R': 18, 'S': 19, 'T': 20,
  'U': 21, 'V': 22, 'W': 23, 'X': 24, 'Y': 25, 'Z': 26,
  
  // Numbers 1-0
  '1': 27, '2': 28, '3': 29, '4': 30, '5': 31, '6': 32, '7': 33, '8': 34, '9': 35, '0': 36,
  
  // Special characters
  '!': 37, '@': 38, '#': 39, '$': 40, '(': 41, ')': 42, '-': 44, '+': 46, '&': 47, '=': 48,
  ';': 49, ':': 50, "'": 52, '"': 53, '%': 54, ',': 55, '.': 56, '/': 59, '?': 60, '°': 62,
  
  // Colors
  'RED': 63, 'ORANGE': 64, 'YELLOW': 65, 'GREEN': 66, 'BLUE': 67, 'VIOLET': 68, 'WHITE': 69, 'BLACK': 70
};

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

module.exports = { VESTABOARD_CHAR_MAP, SCREEN_TYPES };
```

### 2. Screen Engine Core
```javascript
// backend/lib/screenEngine.js
const { VESTABOARD_CHAR_MAP } = require('../../shared/constants');
const templates = require('./templates');
const dataService = require('./dataService');

class ScreenEngine {
  constructor() {
    this.charMap = VESTABOARD_CHAR_MAP;
  }

  // Convert text to character codes
  textToCodes(text) {
    return text.toUpperCase().split('').map(char => this.charMap[char] || 0);
  }

  // Center text in a column range
  centerText(text, startCol, endCol) {
    const codes = this.textToCodes(text);
    const availableWidth = endCol - startCol + 1;
    const padding = Math.max(0, Math.floor((availableWidth - codes.length) / 2));
    
    const result = new Array(availableWidth).fill(0);
    for (let i = 0; i < codes.length && i < availableWidth; i++) {
      result[padding + i] = codes[i];
    }
    return result;
  }

  // Left align text in a column range
  leftAlignText(text, startCol, endCol) {
    const codes = this.textToCodes(text);
    const availableWidth = endCol - startCol + 1;
    const result = new Array(availableWidth).fill(0);
    
    for (let i = 0; i < codes.length && i < availableWidth; i++) {
      result[i] = codes[i];
    }
    return result;
  }

  // Main render method
  async render(screenType, screenConfig = {}) {
    try {
      switch (screenType) {
        case 'BIRTHDAY':
          return await this.renderBirthday(screenConfig);
        case 'CHECKRIDES':
          return await this.renderCheckrides(screenConfig);
        case 'UPCOMING_EVENTS':
          return await this.renderUpcomingEvents(screenConfig);
        case 'NEWEST_PILOT':
          return await this.renderNewestPilot(screenConfig);
        case 'EMPLOYEE_RECOGNITION':
          return await this.renderEmployeeRecognition(screenConfig);
        case 'CUSTOM_MESSAGE':
          return await this.renderCustomMessage(screenConfig);
        default:
          throw new Error(`Unknown screen type: ${screenType}`);
      }
    } catch (error) {
      console.error(`Screen rendering error for ${screenType}:`, error);
      return this.renderErrorScreen(error.message);
    }
  }

  async renderBirthday(config) {
    const template = templates.birthday;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Get birthday data
    const birthday = await dataService.getLatestBirthday();
    if (!birthday) {
      return this.renderErrorScreen('No birthday data found');
    }

    // Apply placeholders
    const row1Text = this.centerText('OZ1 WISHES', 1, 20);
    const row2Text = this.centerText(birthday.firstName, 1, 20);
    const row3Text = this.centerText('A HAPPY BIRTHDAY!', 1, 20);
    const row4Text = this.centerText(birthday.date, 1, 20);

    // Insert into matrix
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 1] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 1] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 1] = row3Text[i];
    for (let i = 0; i < row4Text.length; i++) matrix[4][i + 1] = row4Text[i];

    return matrix;
  }

  renderErrorScreen(message) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    const errorText = this.centerText('ERROR', 0, 21);
    const messageText = this.centerText(message.substring(0, 20), 0, 21);
    
    for (let i = 0; i < errorText.length; i++) matrix[1][i] = errorText[i];
    for (let i = 0; i < messageText.length; i++) matrix[3][i] = messageText[i];
    
    return matrix;
  }
}

module.exports = new ScreenEngine();
```

### 3. Screen Templates
```javascript
// backend/lib/templates.js
const templates = {
  birthday: [
    [63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63]
  ],

  newestPilot: [
    [67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67],
    [63, 63, 63, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 63, 63, 63],
    [0, 63, 63, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 63, 63, 0],
    [0, 0, 63, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 63, 0, 0],
    [0, 0, 0, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0],
    [0, 0, 0, 0, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 0, 0, 0, 0]
  ]
};

module.exports = templates;
```

### 4. Preview API Endpoint
```javascript
// backend/api/screens/preview.js
const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const screenEngine = require('../../lib/screenEngine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    await connectDB();
    
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { screenType, screenConfig } = req.body;

    if (!screenType) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'screenType is required'
        }
      });
    }

    const matrix = await screenEngine.render(screenType, screenConfig);

    res.status(200).json({ matrix });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate preview'
      }
    });
  }
};
```

### 5. Matrix Visualization Component
```javascript
// frontend/src/components/ui/MatrixPreview.js
import React from 'react';

const CHAR_COLORS = {
  0: 'bg-black',     // Blank
  63: 'bg-red-500',    // Red
  64: 'bg-orange-500', // Orange
  65: 'bg-yellow-500', // Yellow
  66: 'bg-green-500',  // Green
  67: 'bg-blue-500',   // Blue
  68: 'bg-purple-500', // Violet
  69: 'bg-white border border-gray-300', // White
  70: 'bg-gray-900'    // Black
};

const CHAR_MAP_REVERSE = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 10: 'J',
  11: 'K', 12: 'L', 13: 'M', 14: 'N', 15: 'O', 16: 'P', 17: 'Q', 18: 'R', 19: 'S', 20: 'T',
  21: 'U', 22: 'V', 23: 'W', 24: 'X', 25: 'Y', 26: 'Z',
  27: '1', 28: '2', 29: '3', 30: '4', 31: '5', 32: '6', 33: '7', 34: '8', 35: '9', 36: '0',
  37: '!', 38: '@', 39: '#', 40: '$', 41: '(', 42: ')', 44: '-', 46: '+', 47: '&', 48: '=',
  49: ';', 50: ':', 52: "'", 53: '"', 54: '%', 55: ',', 56: '.', 59: '/', 60: '?', 62: '°'
};

const MatrixPreview = ({ matrix, className = '' }) => {
  if (!matrix || !Array.isArray(matrix) || matrix.length !== 6) {
    return (
      <div className={`p-4 border border-gray-300 rounded-lg ${className}`}>
        <p className="text-gray-500 text-center">No preview available</p>
      </div>
    );
  }

  return (
    <div className={`inline-block p-4 bg-gray-100 rounded-lg ${className}`}>
      <div className="grid grid-cols-22 gap-0.5 bg-gray-800 p-2 rounded">
        {matrix.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isColorCode = cell >= 63 && cell <= 70;
            const cellClass = isColorCode ? CHAR_COLORS[cell] : 'bg-gray-800 text-white';
            const displayChar = isColorCode ? '' : (CHAR_MAP_REVERSE[cell] || (cell === 0 ? '' : '?'));
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-4 h-4 flex items-center justify-center text-xs font-mono ${cellClass}`}
                title={`[${rowIndex}][${colIndex}]: ${cell}`}
              >
                {displayChar}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 text-xs text-gray-600 text-center">
        6×22 Vestaboard Matrix Preview
      </div>
    </div>
  );
};

export default MatrixPreview;
```

### 6. Screen Preview Hook
```javascript
// frontend/src/hooks/useScreenPreview.js
import { useState, useCallback } from 'react';

export const useScreenPreview = () => {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePreview = useCallback(async (screenType, screenConfig = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/screens/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ screenType, screenConfig }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Preview generation failed');
      }

      setMatrix(data.matrix);
    } catch (err) {
      setError(err.message);
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { matrix, loading, error, generatePreview };
};
```

## Testing Checklist
- [ ] Character mapping converts text correctly
- [ ] Screen engine renders all template types
- [ ] Preview API endpoint works
- [ ] Matrix visualization displays correctly
- [ ] Error handling for invalid screen types
- [ ] Template placeholders filled correctly
- [ ] Color codes render as colors
- [ ] Text alignment functions work
- [ ] Preview hook updates UI properly

## Definition of Done
- All screen templates implemented
- Character mapping system complete
- Preview functionality working
- Matrix visualization component ready
- Error handling implemented
- All manual screen types render correctly
- Preview API endpoint functional
- UI components styled with Tailwind
