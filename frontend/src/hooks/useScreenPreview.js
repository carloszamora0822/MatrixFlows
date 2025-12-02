import { useState, useCallback } from 'react';

/**
 * Custom hook for generating screen previews
 * Handles API calls to the screen preview endpoint
 */
export const useScreenPreview = () => {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  /**
   * Generate a preview for a specific screen type and configuration
   */
  const generatePreview = useCallback(async (screenType, screenConfig = {}) => {
    if (!screenType) {
      setError('Screen type is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🎨 Generating preview for ${screenType}...`);

      const response = await fetch('/api/screens/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          screenType, 
          screenConfig 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Preview generation failed');
      }

      // Validate matrix format
      if (!data.matrix || !Array.isArray(data.matrix) || data.matrix.length !== 6) {
        throw new Error('Invalid matrix format received from server');
      }

      // Validate each row
      for (let i = 0; i < data.matrix.length; i++) {
        if (!Array.isArray(data.matrix[i]) || data.matrix[i].length !== 22) {
          throw new Error(`Invalid matrix row ${i + 1}: expected 22 columns`);
        }
      }

      setMatrix(data.matrix);
      setLastGenerated({
        screenType,
        screenConfig,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Preview generated successfully for ${screenType}`);

    } catch (err) {
      console.error('❌ Preview generation error:', err);
      setError(err.message);
      setMatrix(null);
      setLastGenerated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear the current preview and error state
   */
  const clearPreview = useCallback(() => {
    setMatrix(null);
    setError(null);
    setLastGenerated(null);
  }, []);

  /**
   * Retry the last preview generation
   */
  const retryPreview = useCallback(() => {
    if (lastGenerated) {
      generatePreview(lastGenerated.screenType, lastGenerated.screenConfig);
    }
  }, [lastGenerated, generatePreview]);

  return {
    // State
    matrix,
    loading,
    error,
    lastGenerated,
    
    // Actions
    generatePreview,
    clearPreview,
    retryPreview,
    
    // Computed properties
    hasPreview: !!matrix,
    hasError: !!error,
    canRetry: !!lastGenerated && !!error
  };
};
