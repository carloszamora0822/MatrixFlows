import React from 'react';

// Color mapping for Vestaboard character codes
const CHAR_COLORS = {
  0: 'bg-black',           // Blank/Space
  63: 'bg-red-500',        // Red
  64: 'bg-orange-500',     // Orange
  65: 'bg-yellow-500',     // Yellow
  66: 'bg-green-500',      // Green
  67: 'bg-blue-500',       // Blue
  68: 'bg-purple-500',     // Violet
  69: 'bg-white border border-gray-300', // White
  70: 'bg-gray-900'        // Black
};

// Reverse character mapping for display
const CHAR_MAP_REVERSE = {
  0: '',   // Blank
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 10: 'J',
  11: 'K', 12: 'L', 13: 'M', 14: 'N', 15: 'O', 16: 'P', 17: 'Q', 18: 'R', 19: 'S', 20: 'T',
  21: 'U', 22: 'V', 23: 'W', 24: 'X', 25: 'Y', 26: 'Z',
  27: '1', 28: '2', 29: '3', 30: '4', 31: '5', 32: '6', 33: '7', 34: '8', 35: '9', 36: '0',
  37: '!', 38: '@', 39: '#', 40: '$', 41: '(', 42: ')', 44: '-', 46: '+', 47: '&', 48: '=',
  49: ';', 50: ':', 52: "'", 53: '"', 54: '%', 55: ',', 56: '.', 59: '/', 60: '?', 62: '°'
};

/**
 * MatrixPreview Component
 * Displays a 6x22 Vestaboard matrix with proper character and color rendering
 */
const MatrixPreview = ({ matrix, className = '', title = 'Vestaboard Preview' }) => {
  // Validate matrix format
  if (!matrix || !Array.isArray(matrix) || matrix.length !== 6) {
    return (
      <div className={`p-6 border border-gray-300 rounded-lg bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-200 mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Available</h3>
          <p className="text-gray-500">Matrix data is invalid or missing</p>
        </div>
      </div>
    );
  }

  // Validate each row
  for (let i = 0; i < matrix.length; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== 22) {
      return (
        <div className={`p-6 border border-red-300 rounded-lg bg-red-50 ${className}`}>
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-900 mb-2">Invalid Matrix</h3>
            <p className="text-red-600">Row {i + 1} has incorrect format (expected 22 columns)</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`inline-block ${className}`}>
      {/* Matrix Display - Just the board itself */}
      <div className="inline-block p-4 bg-gray-900 rounded-lg shadow-lg">
        <div className="grid grid-cols-22 gap-0.5">
          {matrix.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isColorCode = cell >= 63 && cell <= 70;
              const isTextCode = cell >= 1 && cell <= 62;
              
              // Determine cell styling
              let cellClass = 'w-4 h-4 flex items-center justify-center text-xs font-mono rounded-sm';
              let displayChar = '';

              if (isColorCode) {
                // Color codes - display as solid color blocks
                cellClass += ` ${CHAR_COLORS[cell]}`;
              } else if (isTextCode) {
                // Text codes - display character on dark background
                cellClass += ' bg-gray-800 text-white';
                displayChar = CHAR_MAP_REVERSE[cell] || '?';
              } else {
                // Blank (code 0) - display as black
                cellClass += ' bg-black';
              }
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cellClass}
                >
                  <span className="font-bold text-white">
                    {displayChar}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MatrixPreview;
