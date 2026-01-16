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

const MiniVestaboard = ({ screenType, screenConfig, displaySeconds, stepNumber, isFirst, isLast, onDragStart, onDragOver, onDrop, draggable = false }) => {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      // Always fetch preview from backend (handles customScreenId lookup from library)
      try {
        const res = await fetch(`/api/screens/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ screenType, screenConfig: screenConfig || {} })
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
  }, [screenType, screenConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded p-4" style={{ width: '330px', height: '90px' }}>
        <div className="text-white text-sm">Loading preview...</div>
      </div>
    );
  }

  return (
    <div 
      className={`relative inline-block ${draggable ? 'cursor-move' : ''} ${isDragging ? 'opacity-50' : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        setIsDragging(true);
        if (onDragStart) onDragStart(e);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        if (onDragOver) onDragOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (onDrop) onDrop(e);
      }}
    >
      {/* Drag handle - leftmost */}
      {draggable && (
        <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-10 text-gray-400 hover:text-blue-500 transition-colors">
          <span className="text-3xl leading-none">⋮⋮</span>
        </div>
      )}
      
      {/* Mini Vestaboard - Just the board itself */}
      <div className={`inline-block p-4 bg-gray-900 rounded-lg shadow-lg border-2 ${isDragging ? 'border-blue-500' : 'border-gray-700'} ${draggable ? 'hover:border-blue-400' : ''}`}>
        <div className="grid grid-cols-22 gap-[1px]">
          {matrix && matrix.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isColorCode = cell >= 63 && cell <= 70;
              const isTextCode = cell >= 1 && cell <= 62;
              
              // Outer cell: Physical unit (2.68" tall x 1.43" wide = 1.87 ratio)
              // Inner visible: Character display (1.04" tall x 0.82" wide)
              // Inner is 38.8% height and 57.3% width of outer
              const outerCellClass = 'w-4 flex items-center justify-center bg-gray-800 rounded-sm border border-gray-700';
              const outerCellStyle = { height: 'calc(1rem * 1.87)' };
              
              let innerCellClass = 'rounded-sm flex items-center justify-center text-xs font-mono font-bold';
              const innerCellStyle = { 
                width: '57.3%',  // 0.82/1.43 = 57.3%
                height: '38.8%'  // 1.04/2.68 = 38.8%
              };
              let displayChar = '';
              
              if (isColorCode) {
                innerCellClass += ` ${CHAR_COLORS[cell]}`;
              } else if (isTextCode) {
                innerCellClass += ' bg-gray-800 text-white';
                displayChar = CHAR_MAP_REVERSE[cell] || '?';
              } else {
                innerCellClass += ' bg-black';
              }
              
              return (
                <div 
                  key={`${rowIdx}-${colIdx}`} 
                  className={outerCellClass}
                  style={outerCellStyle}
                >
                  <div className={innerCellClass} style={innerCellStyle}>
                    <span className="text-white">
                      {displayChar}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info badges - only FIRST/LAST */}
      <div className="absolute -right-2 -top-2 flex flex-col gap-1">
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
