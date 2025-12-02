/**
 * METAR Safety Analyzer
 * Analyzes METAR data to determine flight safety conditions
 * Based on VFR/MVFR/IFR/LIFR weather minimums
 */

class MetarAnalyzer {
  /**
   * Analyze METAR and return safety assessment
   * @param {string} metarText - Raw METAR text
   * @returns {object} Safety assessment with color code
   */
  analyzeSafety(metarText) {
    const analysis = {
      safety: 'SAFE',      // SAFE, RISKY, UNSAFE
      color: 62,           // Green (62), Yellow (66), Red (63)
      visibility: null,
      ceiling: null,
      windSpeed: null,
      conditions: []
    };

    try {
      // Extract visibility (in statute miles)
      const visMatch = metarText.match(/\s(\d{1,2})SM\s/);
      if (visMatch) {
        analysis.visibility = parseInt(visMatch[1]);
      }

      // Extract ceiling (cloud coverage and altitude)
      const ceilingMatch = metarText.match(/(BKN|OVC)(\d{3})/);
      if (ceilingMatch) {
        analysis.ceiling = parseInt(ceilingMatch[2]) * 100; // Convert to feet
      }

      // Extract wind speed (in knots)
      const windMatch = metarText.match(/(\d{5})(G\d{2})?KT/);
      if (windMatch) {
        const windStr = windMatch[1];
        analysis.windSpeed = parseInt(windStr.slice(3, 5));
        
        // Check for gusts
        if (windMatch[2]) {
          const gustSpeed = parseInt(windMatch[2].slice(1));
          analysis.windSpeed = Math.max(analysis.windSpeed, gustSpeed);
        }
      }

      // Check for hazardous weather conditions
      const hazards = [
        { pattern: /\+RA|\+SN|\+TSRA/, condition: 'Heavy precipitation', severity: 'UNSAFE' },
        { pattern: /FZRA/, condition: 'Freezing rain', severity: 'UNSAFE' },
        { pattern: /\+FC|FC/, condition: 'Funnel cloud/Tornado', severity: 'UNSAFE' },
        { pattern: /TS/, condition: 'Thunderstorm', severity: 'RISKY' },
        { pattern: /-RA|-SN/, condition: 'Light precipitation', severity: 'RISKY' },
        { pattern: /BR|FG/, condition: 'Mist/Fog', severity: 'RISKY' },
        { pattern: /FU|HZ/, condition: 'Smoke/Haze', severity: 'RISKY' }
      ];

      for (const hazard of hazards) {
        if (hazard.pattern.test(metarText)) {
          analysis.conditions.push(hazard.condition);
          if (hazard.severity === 'UNSAFE' && analysis.safety !== 'UNSAFE') {
            analysis.safety = 'UNSAFE';
          } else if (hazard.severity === 'RISKY' && analysis.safety === 'SAFE') {
            analysis.safety = 'RISKY';
          }
        }
      }

      // Apply VFR/MVFR/IFR/LIFR criteria
      // VFR: Ceiling > 3000 ft AND Visibility > 5 SM (SAFE - Green)
      // MVFR: Ceiling 1000-3000 ft OR Visibility 3-5 SM (RISKY - Yellow)
      // IFR: Ceiling 500-1000 ft OR Visibility 1-3 SM (RISKY - Yellow)
      // LIFR: Ceiling < 500 ft OR Visibility < 1 SM (UNSAFE - Red)

      if (analysis.visibility !== null || analysis.ceiling !== null) {
        // LIFR conditions - UNSAFE
        if ((analysis.ceiling !== null && analysis.ceiling < 500) || 
            (analysis.visibility !== null && analysis.visibility < 1)) {
          analysis.safety = 'UNSAFE';
        }
        // IFR conditions - RISKY
        else if ((analysis.ceiling !== null && analysis.ceiling < 1000) || 
                 (analysis.visibility !== null && analysis.visibility < 3)) {
          if (analysis.safety === 'SAFE') analysis.safety = 'RISKY';
        }
        // MVFR conditions - RISKY
        else if ((analysis.ceiling !== null && analysis.ceiling < 3000) || 
                 (analysis.visibility !== null && analysis.visibility < 5)) {
          if (analysis.safety === 'SAFE') analysis.safety = 'RISKY';
        }
      }

      // Wind speed criteria
      // > 25 knots = UNSAFE (Red)
      // 15-25 knots = RISKY (Yellow)
      // < 15 knots = SAFE (Green)
      if (analysis.windSpeed !== null) {
        if (analysis.windSpeed > 25) {
          analysis.safety = 'UNSAFE';
        } else if (analysis.windSpeed >= 15 && analysis.safety === 'SAFE') {
          analysis.safety = 'RISKY';
        }
      }

      // Set color based on safety
      if (analysis.safety === 'SAFE') {
        analysis.color = 62; // Green
      } else if (analysis.safety === 'RISKY') {
        analysis.color = 66; // Yellow
      } else {
        analysis.color = 63; // Red
      }

      console.log(`🛩️  METAR Safety Analysis: ${analysis.safety} (Color: ${analysis.color})`);
      if (analysis.visibility) console.log(`   Visibility: ${analysis.visibility} SM`);
      if (analysis.ceiling) console.log(`   Ceiling: ${analysis.ceiling} ft`);
      if (analysis.windSpeed) console.log(`   Wind: ${analysis.windSpeed} kt`);
      if (analysis.conditions.length > 0) console.log(`   Conditions: ${analysis.conditions.join(', ')}`);

      return analysis;

    } catch (error) {
      console.error('METAR analysis error:', error);
      // Default to RISKY if we can't analyze
      return {
        safety: 'RISKY',
        color: 66,
        visibility: null,
        ceiling: null,
        windSpeed: null,
        conditions: ['Unable to analyze']
      };
    }
  }

  /**
   * Get human-readable safety description
   */
  getSafetyDescription(safety) {
    const descriptions = {
      SAFE: 'VFR - Safe for flight',
      RISKY: 'MVFR/IFR - Marginal conditions',
      UNSAFE: 'LIFR - Unsafe for flight'
    };
    return descriptions[safety] || 'Unknown';
  }
}

module.exports = new MetarAnalyzer();
