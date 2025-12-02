import React, { useState, useEffect } from 'react';

// Character mapping - same as MatrixPreview
const CHAR_MAP_REVERSE = {
  0: '',   // Blank
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 10: 'J',
  11: 'K', 12: 'L', 13: 'M', 14: 'N', 15: 'O', 16: 'P', 17: 'Q', 18: 'R', 19: 'S', 20: 'T',
  21: 'U', 22: 'V', 23: 'W', 24: 'X', 25: 'Y', 26: 'Z',
  27: '1', 28: '2', 29: '3', 30: '4', 31: '5', 32: '6', 33: '7', 34: '8', 35: '9', 36: '0',
  37: '!', 38: '@', 39: '#', 40: '$', 41: '(', 42: ')', 44: '-', 46: '+', 47: '&', 48: '=',
  49: ';', 50: ':', 52: "'", 53: '"', 54: '%', 55: ',', 56: '.', 59: '/', 60: '?', 62: '°'
};

const CHAR_COLORS = {
  0: 'bg-black',
  63: 'bg-red-500',
  64: 'bg-orange-500',
  65: 'bg-yellow-500',
  66: 'bg-green-500',
  67: 'bg-blue-500',
  68: 'bg-purple-500',
  69: 'bg-white',
  70: 'bg-gray-900'
};

const MiniVestaboard = ({ screenType, displaySeconds, stepNumber, isFirst, isLast }) => {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/screens/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ screenType, config: {} })
        });
        const data = await res.json();
        if (data.matrix) {
          setMatrix(data.matrix);
        }
      } catch (error) {
        console.error('Failed to fetch preview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [screenType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded p-4" style={{ width: '330px', height: '90px' }}>
        <div className="text-white text-sm">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Step indicator */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm shadow-lg">
        {stepNumber}
      </div>
      
      {/* Mini Vestaboard */}
      <div className="bg-gray-900 p-2 rounded-lg shadow-xl border-2 border-gray-700" style={{ width: '330px' }}>
        <div className="grid grid-cols-22 gap-0.5">
          {matrix && matrix.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isColorCode = cell >= 63 && cell <= 70;
              const isTextCode = cell >= 1 && cell <= 62;
              
              let cellClass = 'w-3 h-3 flex items-center justify-center text-xs font-mono rounded-sm';
              let displayChar = '';
              
              if (isColorCode) {
                cellClass += ` ${CHAR_COLORS[cell]}`;
              } else if (isTextCode) {
                cellClass += ' bg-gray-800 text-white';
                displayChar = CHAR_MAP_REVERSE[cell] || '?';
              } else {
                cellClass += ' bg-black';
              }
              
              return (
                <div key={`${rowIdx}-${colIdx}`} className={cellClass}>
                  <span className="font-bold text-white" style={{ fontSize: '6px' }}>
                    {displayChar}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info badges */}
      <div className="absolute -right-2 -top-2 flex flex-col gap-1">
        <div className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-lg">
          {displaySeconds}s
        </div>
        {isFirst && (
          <div className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg">
            FIRST
          </div>
        )}
        {isLast && (
          <div className="px-2 py-1 bg-purple-500 text-white rounded-full text-xs font-bold shadow-lg">
            LAST
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniVestaboard;
