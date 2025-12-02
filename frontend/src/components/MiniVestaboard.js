import React, { useState, useEffect } from 'react';

const MiniVestaboard = ({ screenType, displaySeconds, stepNumber, isFirst, isLast }) => {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?type=${screenType}`, {
          credentials: 'include'
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

  const getCharacterColor = (code) => {
    if (code === 0) return 'bg-gray-900'; // Blank
    if (code >= 1 && code <= 26) return 'bg-red-600'; // Red letters
    if (code >= 27 && code <= 52) return 'bg-orange-500'; // Orange letters
    if (code >= 53 && code <= 62) return 'bg-white'; // White numbers
    if (code === 63) return 'bg-red-600'; // Red
    if (code === 64) return 'bg-orange-500'; // Orange
    if (code === 65) return 'bg-yellow-400'; // Yellow
    if (code === 66) return 'bg-green-500'; // Green
    if (code === 67) return 'bg-blue-500'; // Blue
    if (code === 68) return 'bg-purple-600'; // Violet
    if (code === 69) return 'bg-white'; // White
    return 'bg-gray-900';
  };

  const getCharacter = (code) => {
    if (code === 0) return '';
    if (code >= 1 && code <= 26) return String.fromCharCode(64 + code); // A-Z
    if (code >= 27 && code <= 52) return String.fromCharCode(70 + code); // a-z
    if (code >= 53 && code <= 62) return String.fromCharCode(code - 5); // 0-9
    return '';
  };

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
      <div className="bg-black p-2 rounded-lg shadow-xl border-2 border-gray-700" style={{ width: '330px' }}>
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(22, 1fr)' }}>
          {matrix && matrix.map((row, rowIdx) =>
            row.map((code, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`${getCharacterColor(code)} flex items-center justify-center text-white font-bold rounded-sm`}
                style={{ width: '13px', height: '13px', fontSize: '8px' }}
              >
                {getCharacter(code)}
              </div>
            ))
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
