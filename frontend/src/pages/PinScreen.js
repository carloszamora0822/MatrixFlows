import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const PinScreen = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    boardId: '',
    customMessage: '',
    borderColor1: 'red',
    borderColor2: 'orange',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTimeLocal: '09:00',
    endTimeLocal: '17:00'
  });

  const [previewMatrix, setPreviewMatrix] = useState(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/boards', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setBoards(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, boardId: data[0].boardId }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate preview matrix when message or colors change
  useEffect(() => {
    if (formData.customMessage) {
      generatePreview();
    }
  }, [formData.customMessage, formData.borderColor1, formData.borderColor2]);

  const colorCodeMap = {
    red: 63,
    orange: 64,
    yellow: 65,
    green: 66,
    blue: 67,
    purple: 68,
    white: 69
  };

  const generatePreview = () => {
    // Create 6x22 matrix
    const matrix = Array(6).fill(null).map(() => Array(22).fill(0));
    
    const color1 = colorCodeMap[formData.borderColor1];
    const color2 = colorCodeMap[formData.borderColor2];
    
    // Add alternating colored border
    // Top and bottom rows
    for (let col = 0; col < 22; col++) {
      matrix[0][col] = col % 2 === 0 ? color1 : color2;
      matrix[5][col] = col % 2 === 0 ? color1 : color2;
    }
    
    // Left and right columns
    for (let row = 1; row < 5; row++) {
      matrix[row][0] = row % 2 === 0 ? color1 : color2;
      matrix[row][21] = row % 2 === 0 ? color1 : color2;
    }
    
    // Convert message to character codes
    const message = formData.customMessage.toUpperCase();
    const charToCode = (char) => {
      if (char === ' ') return 0;
      if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 64; // A=1, B=2, etc.
      if (char >= '0' && char <= '9') return 27 + (char.charCodeAt(0) - 48); // 0-9 = 27-36
      if (char === '!') return 37;
      if (char === '/') return 59;
      if (char === '-') return 44;
      if (char === '.') return 56;
      if (char === ',') return 55;
      if (char === ':') return 50;
      return 0;
    };
    
    // Word wrap the message to fit within available width
    const availableWidth = 18; // 22 - 4 (borders + padding)
    const words = message.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= availableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length <= availableWidth ? word : word.substring(0, availableWidth);
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Use all 4 available rows (rows 1-4, inside top/bottom border)
    const displayLines = lines.slice(0, 4);
    
    // Center vertically
    const availableRows = 4; // rows 1-4 (inside top/bottom border)
    const startRow = Math.floor((availableRows - displayLines.length) / 2) + 1;
    
    // Render each line centered horizontally
    displayLines.forEach((line, lineIdx) => {
      const charCodes = line.split('').map(charToCode);
      const row = startRow + lineIdx;
      const startCol = Math.floor((availableWidth - charCodes.length) / 2) + 2;
      
      for (let i = 0; i < charCodes.length; i++) {
        const col = startCol + i;
        if (col >= 2 && col <= 19) { // Keep within inner area
          matrix[row][col] = charCodes[i];
        }
      }
    });
    
    setPreviewMatrix(matrix);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!previewMatrix) {
      alert('Please enter a message first');
      return;
    }

    try {
      const response = await fetch('/api/pin-screen/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          boardId: formData.boardId,
          screenConfigs: [{
            screenType: 'CUSTOM_MESSAGE',
            screenConfig: { 
              message: formData.customMessage,
              matrix: previewMatrix 
            },
            displaySeconds: 20
          }],
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTimeLocal: formData.startTimeLocal,
          endTimeLocal: formData.endTimeLocal
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n\nYour custom screen is now pinned!`);
        navigate('/workflows');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error?.message || 'Failed to pin screen'}`);
      }
    } catch (error) {
      alert('❌ Network error occurred');
    }
  };

  const colorOptions = [
    { value: 'red', label: '🔴 Red', class: 'bg-red-500' },
    { value: 'orange', label: '🟠 Orange', class: 'bg-orange-500' },
    { value: 'yellow', label: '🟡 Yellow', class: 'bg-yellow-500' },
    { value: 'green', label: '🟢 Green', class: 'bg-green-500' },
    { value: 'blue', label: '🔵 Blue', class: 'bg-blue-500' },
    { value: 'purple', label: '🟣 Purple', class: 'bg-purple-500' },
    { value: 'white', label: '⚪ White', class: 'bg-white' }
  ];

  const CHAR_COLORS = {
    0: 'bg-black',
    63: 'bg-red-500',
    64: 'bg-orange-500',
    65: 'bg-yellow-500',
    66: 'bg-green-500',
    67: 'bg-blue-500',
    68: 'bg-purple-500',
    69: 'bg-white'
  };

  const CHAR_MAP = {
    0: '', 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 10: 'J',
    11: 'K', 12: 'L', 13: 'M', 14: 'N', 15: 'O', 16: 'P', 17: 'Q', 18: 'R', 19: 'S', 20: 'T',
    21: 'U', 22: 'V', 23: 'W', 24: 'X', 25: 'Y', 26: 'Z',
    27: '1', 28: '2', 29: '3', 30: '4', 31: '5', 32: '6', 33: '7', 34: '8', 35: '9', 36: '0',
    37: '!', 59: '/'
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent mb-2">
            📌 Pin Custom Screen
          </h1>
          <p className="text-gray-600">Create a custom message to display on your Vestaboard</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Message Settings</h2>
              
              {/* Board Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Board
                </label>
                <select
                  value={formData.boardId}
                  onChange={(e) => setFormData({ ...formData, boardId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  required
                >
                  {boards.map(board => (
                    <option key={board.boardId} value={board.boardId}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  value={formData.customMessage}
                  onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="Event today at 10/16"
                  rows="4"
                  maxLength="80"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{formData.customMessage.length}/80 characters • Auto-wraps to 4 lines</p>
              </div>

              {/* Border Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Border Color 1
                  </label>
                  <select
                    value={formData.borderColor1}
                    onChange={(e) => setFormData({ ...formData, borderColor1: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  >
                    {colorOptions.map(color => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Border Color 2
                  </label>
                  <select
                    value={formData.borderColor2}
                    onChange={(e) => setFormData({ ...formData, borderColor2: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  >
                    {colorOptions.map(color => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTimeLocal}
                    onChange={(e) => setFormData({ ...formData, startTimeLocal: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTimeLocal}
                    onChange={(e) => setFormData({ ...formData, endTimeLocal: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
                >
                  📌 Pin Screen
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/workflows')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>

          {/* Right: Live Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Live Preview</h2>
            {previewMatrix ? (
              <div className="bg-gray-900 p-4 rounded-lg inline-block">
                <div className="grid grid-cols-22 gap-0.5">
                  {previewMatrix.map((row, rowIdx) =>
                    row.map((cell, colIdx) => {
                      const isColorCode = cell >= 63 && cell <= 70;
                      const isTextCode = cell >= 1 && cell <= 62;
                      
                      let cellClass = 'w-[14px] h-[14px] flex items-center justify-center text-xs font-mono rounded-sm';
                      let displayChar = '';
                      
                      if (isColorCode) {
                        cellClass += ` ${CHAR_COLORS[cell]}`;
                      } else if (isTextCode) {
                        cellClass += ' bg-gray-800 text-white';
                        displayChar = CHAR_MAP[cell] || '?';
                      } else {
                        cellClass += ' bg-black';
                      }
                      
                      return (
                        <div key={`${rowIdx}-${colIdx}`} className={cellClass}>
                          {!isColorCode && (
                            <span className="font-bold text-white" style={{ fontSize: '6px' }}>
                              {displayChar}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">✍️</div>
                <p>Type a message to see preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PinScreen;
