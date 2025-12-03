const { VESTABOARD_CHAR_MAP } = require('../../shared/constants');
const templates = require('./templates');
const dataService = require('./dataService');
const metarClient = require('./clients/metarClient');
const weatherClient = require('./clients/weatherClient');
const metarAnalyzer = require('./metarAnalyzer');

class ScreenEngine {
  constructor() {
    this.charMap = VESTABOARD_CHAR_MAP;
  }

  /**
   * Convert text to character codes
   */
  textToCodes(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    return text.toUpperCase().split('').map(char => this.charMap[char] || 0);
  }

  /**
   * Center text in a column range
   */
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

  /**
   * Left align text in a column range
   */
  leftAlignText(text, startCol, endCol) {
    const codes = this.textToCodes(text);
    const availableWidth = endCol - startCol + 1;
    const result = new Array(availableWidth).fill(0);
    
    for (let i = 0; i < codes.length && i < availableWidth; i++) {
      result[i] = codes[i];
    }
    return result;
  }

  /**
   * Right align text in a column range
   */
  rightAlignText(text, startCol, endCol) {
    const codes = this.textToCodes(text);
    const availableWidth = endCol - startCol + 1;
    const result = new Array(availableWidth).fill(0);
    const startPos = Math.max(0, availableWidth - codes.length);
    
    for (let i = 0; i < codes.length && i < availableWidth; i++) {
      result[startPos + i] = codes[i];
    }
    return result;
  }

  /**
   * Wrap text to fit within specified width
   */
  wrapText(text, maxWidth) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, truncate it
          lines.push(word.substring(0, maxWidth));
          currentLine = '';
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Main render method
   */
  async render(screenType, screenConfig = {}) {
    try {
      console.log(`🎨 Rendering screen type: ${screenType}`);
      
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
        case 'WEATHER':
          return await this.renderWeather(screenConfig);
        case 'METAR':
          return await this.renderMetar(screenConfig);
        case 'CUSTOM_MESSAGE':
          return await this.renderCustomMessage(screenConfig);
        default:
          throw new Error(`Unknown screen type: ${screenType}`);
      }
    } catch (error) {
      console.error(`❌ Screen rendering error for ${screenType}:`, error);
      return this.renderErrorScreen(error.message);
    }
  }

  /**
   * Render Birthday screen
   * Prioritizes today's birthdays, falls back to current birthday
   */
  async renderBirthday(config) {
    const template = templates.birthday;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Check if there's a birthday TODAY
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    
    const Birthday = require('../models/Birthday');
    const { ORG_CONFIG } = require('../../shared/constants');
    
    // First, try to find today's birthday
    let birthday = await Birthday.findOne({
      orgId: ORG_CONFIG.ID,
      date: todayStr
    });
    
    // If no birthday today, use the current birthday
    if (!birthday) {
      birthday = await dataService.getLatestBirthday();
    }
    
    if (!birthday) {
      console.warn('⚠️ BIRTHDAY screen has no data assigned. Please set a current birthday.');
      return null; // Skip this screen in workflow
    }

    // Apply placeholders with proper text alignment
    const row1Text = this.centerText('OZ1 WISHES', 1, 20);
    const row2Text = this.centerText(birthday.firstName.toUpperCase(), 1, 20);
    const row3Text = this.centerText('A HAPPY BIRTHDAY!', 1, 20);
    const row4Text = this.centerText(birthday.date, 1, 20);

    // Insert into matrix (preserving colorful border)
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 1] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 1] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 1] = row3Text[i];
    for (let i = 0; i < row4Text.length; i++) matrix[4][i + 1] = row4Text[i];

    return matrix;
  }

  /**
   * Render Checkrides screen - shows TODAY's checkrides only
   * Format: [####] [CALLSIGN] [TYPE]
   */
  async renderCheckrides(config) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    
    // Get checkride data (sorted chronologically)
    const allCheckrides = await dataService.getUpcomingCheckrides();
    if (!allCheckrides || allCheckrides.length === 0) {
      console.warn('⚠️ CHECKRIDES screen has no data assigned. Please add checkrides.');
      return null; // Skip this screen in workflow
    }

    // Filter to only show TODAY's checkrides
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const todaysCheckrides = allCheckrides.filter(c => c.date === todayStr);
    
    if (todaysCheckrides.length === 0) {
      console.warn('⚠️ CHECKRIDES screen has no checkrides for today.');
      return null; // Skip this screen in workflow
    }

    // Get custom border color
    const colorMap = {
      red: 63, orange: 64, yellow: 65, green: 66,
      blue: 67, purple: 68, white: 69
    };
    const borderColor = colorMap[config.borderColor1] || 63; // Default red

    // Row 0: Header "CHECKRIDES" - horizontal colored border, centered
    const headerText = 'CHECKRIDES';
    const headerCodes = this.textToCodes(headerText);
    const headerStart = Math.floor((22 - headerCodes.length) / 2);
    
    // Fill entire top row with colored border
    for (let i = 0; i < 22; i++) {
      matrix[0][i] = borderColor;
    }
    // Overlay centered text
    for (let i = 0; i < headerCodes.length && (headerStart + i) < 22; i++) {
      matrix[0][headerStart + i] = headerCodes[i];
    }

    // Rows 1-5: Display up to 5 of today's checkrides
    // Format: [####] [NAME  ] [TYPE] [CALLSIGN]
    const maxCheckrides = Math.min(todaysCheckrides.length, 5);
    for (let row = 0; row < maxCheckrides; row++) {
      const checkride = todaysCheckrides[row];
      
      // Parse time to get just number (e.g., "14:30" -> "1430")
      const timeNum = checkride.time.replace(':', '').padStart(4, ' ');
      
      // Format name (6 chars max, padded for consistent spacing)
      const name = checkride.name.substring(0, 6).padEnd(6, ' ');
      
      // Format type (3 chars: IFR, PPL, etc)
      const type = checkride.type.substring(0, 3).padEnd(3, ' ');
      
      // Format callsign (6 chars max)
      const callsign = checkride.callsign.substring(0, 6).padEnd(6, ' ');
      
      // Build line: "1430 JOHN   PPL N123AB"
      const lineText = `${timeNum} ${name} ${type} ${callsign}`;
      const lineCodes = this.textToCodes(lineText);
      
      // No vertical borders - just text
      for (let col = 0; col < lineCodes.length && col < 22; col++) {
        matrix[row + 1][col] = lineCodes[col];
      }
    }

    return matrix;
  }

  /**
   * Render Upcoming Events screen - shows upcoming events one per row
   * Format: MM/DD [space] [16 char description]
   */
  async renderUpcomingEvents(config) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    
    // Get event data (sorted chronologically, limit to 5)
    const events = await dataService.getUpcomingEvents();
    if (!events || events.length === 0) {
      console.warn('⚠️ UPCOMING_EVENTS screen has no data assigned. Please add events.');
      return null; // Skip this screen in workflow
    }

    // Get custom border color
    const colorMap = {
      red: 63, orange: 64, yellow: 65, green: 66,
      blue: 67, purple: 68, white: 69
    };
    const borderColor = colorMap[config.borderColor1] || 66; // Default green

    // Row 0: Header "UPCOMING EVENTS" - horizontal colored border, centered
    const headerText = 'UPCOMING EVENTS';
    const headerCodes = this.textToCodes(headerText);
    const headerStart = Math.floor((22 - headerCodes.length) / 2);
    
    // Fill entire top row with colored border
    for (let i = 0; i < 22; i++) {
      matrix[0][i] = borderColor;
    }
    // Overlay centered text
    for (let i = 0; i < headerCodes.length && (headerStart + i) < 22; i++) {
      matrix[0][headerStart + i] = headerCodes[i];
    }

    // Rows 1-5: Display up to 5 events
    // Format: "MM/DD DESCRIPTION TEXT"
    const maxEvents = Math.min(events.length, 5);
    for (let row = 0; row < maxEvents; row++) {
      const event = events[row];
      
      // Format date as MM/DD (5 chars)
      const dateStr = event.date; // Already in MM/DD format
      
      // Format description (16 chars max to fit: 5 for date + 1 space + 16 desc = 22 total)
      const desc = event.description.substring(0, 16).padEnd(16, ' ');
      
      // Build line: "MM/DD DESCRIPTION..."
      const lineText = `${dateStr} ${desc}`;
      const lineCodes = this.textToCodes(lineText);
      
      // No vertical borders - just text
      for (let col = 0; col < lineCodes.length && col < 22; col++) {
        matrix[row + 1][col] = lineCodes[col];
      }
    }

    return matrix;
  }

  /**
   * Render Newest Pilot screen
   */
  async renderNewestPilot(config) {
    const template = templates.newestPilot;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Get newest pilot data
    const pilot = await dataService.getNewestPilot();
    if (!pilot) {
      console.warn('⚠️ NEWEST_PILOT screen has no data assigned. Please set a current pilot.');
      return null; // Skip this screen in workflow
    }

    const row1Text = this.centerText('CONGRATULATIONS', 4, 17);
    const row2Text = this.centerText(pilot.name.toUpperCase(), 4, 17);
    const row3Text = this.centerText('NEW PILOT!', 4, 17);

    // Insert into matrix (preserving wing design)
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 4] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 4] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 4] = row3Text[i];

    return matrix;
  }

  /**
   * Render Employee Recognition screen
   */
  async renderEmployeeRecognition(config) {
    const template = templates.employeeRecognition;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Get recognition data
    const recognition = await dataService.getCurrentRecognition();
    if (!recognition) {
      console.warn('⚠️ EMPLOYEE_RECOGNITION screen has no data assigned. Please set a current recognition.');
      return null; // Skip this screen in workflow
    }

    // Get custom border colors from config OR from the recognition itself
    const colorMap = {
      red: 63, orange: 64, yellow: 65, green: 66,
      blue: 67, purple: 68, white: 69
    };
    const color1 = colorMap[config.borderColor1 || recognition.borderColor1] || 65; // Default yellow
    const color2 = colorMap[config.borderColor2 || recognition.borderColor2] || 64; // Default orange

    // Apply alternating colored border
    for (let col = 0; col < 22; col++) {
      matrix[0][col] = col % 2 === 0 ? color1 : color2;
      matrix[5][col] = col % 2 === 0 ? color1 : color2;
    }
    
    for (let row = 1; row < 5; row++) {
      matrix[row][0] = row % 2 === 0 ? color1 : color2;
      matrix[row][21] = row % 2 === 0 ? color1 : color2;
    }

    const fullName = `${recognition.firstName} ${recognition.lastName}`.toUpperCase();
    
    const row1Text = this.centerText('EMPLOYEE OF', 1, 20);
    const row2Text = this.centerText('THE MONTH', 1, 20);
    const row3Text = this.centerText(fullName, 1, 20);

    // Insert into matrix
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 1] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 1] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 1] = row3Text[i];

    return matrix;
  }

  /**
   * Render Weather screen
   */
  async renderWeather(config) {
    try {
      const weather = await weatherClient.getWeather(config.locationOverride);
      
      // Select template based on weather condition and time of day
      const template = this.selectWeatherTemplate(weather.condition, weather.isNight);
      const matrix = JSON.parse(JSON.stringify(template));
      
      console.log(`🌤️  Weather: ${weather.condition}, ${weather.temperature}°F, ${weather.isNight ? '🌙 Night' : '☀️ Day'}`);

      // Replace temperature placeholders (36, 36 = "00")
      // Both day and night templates have same positions now
      const tempCodes = this.numberToCodes(weather.temperature);
      this.replacePlaceholders(matrix, [36, 36], tempCodes, 2, 0); // Row 2

      // Replace wind speed placeholders
      const windCodes = this.numberToCodes(weather.windSpeed);
      this.replacePlaceholders(matrix, [36, 36], windCodes, 3, 0); // Row 3

      return matrix;

    } catch (error) {
      console.error('Weather rendering error:', error);
      return this.renderWeatherError(error.message);
    }
  }

  /**
   * Render METAR screen with safety color coding - FULL SCREEN with borders
   */
  async renderMetar(config) {
    try {
      const metar = await metarClient.getMetar(config.stationId || 'KVBT');
      const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));

      // Analyze METAR for safety
      const safety = metarAnalyzer.analyzeSafety(metar.rawText);
      const safetyColor = safety.color; // 66=Green, 65=Yellow, 63=Red

      // Row 0: TOP BORDER - full row with safety color
      for (let col = 0; col < 22; col++) {
        matrix[0][col] = safetyColor;
      }
      // Header text on top border
      const headerText = `METAR ${metar.stationId}`;
      const headerCodes = this.textToCodes(headerText);
      const startCol = Math.floor((22 - headerCodes.length) / 2);
      for (let i = 0; i < headerCodes.length; i++) {
        matrix[0][startCol + i] = headerCodes[i];
      }

      // Rows 1-4: METAR data with colored left/right borders (use FULL width)
      // Remove "METAR KVBT" from the beginning since it's already in the header
      const metarTextWithoutHeader = metar.rawText.replace(/^METAR\s+\w+\s+/, '');
      const metarLines = this.wrapTextToLines(metarTextWithoutHeader, 20, 4); // 4 rows, 20 chars each
      
      for (let row = 0; row < 4; row++) {
        // Left border
        matrix[row + 1][0] = safetyColor;
        
        // METAR text (or blank if no more lines)
        if (row < metarLines.length) {
          const lineCodes = this.textToCodes(metarLines[row]);
          for (let col = 0; col < lineCodes.length && col < 20; col++) {
            matrix[row + 1][col + 1] = lineCodes[col];
          }
        }
        
        // Right border
        matrix[row + 1][21] = safetyColor;
      }

      // Row 5: BOTTOM BORDER - full row with safety color
      for (let col = 0; col < 22; col++) {
        matrix[5][col] = safetyColor;
      }

      console.log(`✅ METAR rendered with ${safety.safety} status (Color: ${safetyColor})`);
      if (safety.details) {
        console.log(`   Visibility: ${safety.details.visibility || 'N/A'}`);
        console.log(`   Wind: ${safety.details.windSpeed || 'N/A'}`);
        console.log(`   Conditions: ${safety.details.conditions || 'N/A'}`);
      }
      return matrix;

    } catch (error) {
      console.error('METAR rendering error:', error);
      return this.renderMetarError(error.message);
    }
  }

  /**
   * Select weather template based on condition and time of day
   */
  selectWeatherTemplate(condition, isNight = false) {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
      // Use stars at night, sun during day
      return isNight ? templates.weatherClearNight : templates.weatherSunny;
    }
    // Default to cloudy for rain, clouds, etc.
    return templates.weatherCloudy;
  }

  /**
   * Convert number to character codes (zero-padded to 2 digits)
   */
  numberToCodes(number) {
    const padded = number.toString().padStart(2, '0'); // Always 2 digits: "5" → "05"
    return padded.split('').map(digit => this.charMap[digit] || 0);
  }

  /**
   * Replace placeholder pattern in matrix with new codes
   */
  replacePlaceholders(matrix, searchPattern, replacementCodes, startRow, occurrence) {
    let found = 0;
    for (let row = startRow; row < matrix.length; row++) {
      for (let col = 0; col <= matrix[row].length - searchPattern.length; col++) {
        let matches = true;
        for (let i = 0; i < searchPattern.length; i++) {
          if (matrix[row][col + i] !== searchPattern[i]) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          if (found === occurrence) {
            // Replace with new codes
            for (let i = 0; i < replacementCodes.length && i < searchPattern.length; i++) {
              matrix[row][col + i] = replacementCodes[i];
            }
            return;
          }
          found++;
        }
      }
    }
  }

  /**
   * Wrap text to multiple lines
   */
  wrapTextToLines(text, maxWidth, maxLines) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if (lines.length >= maxLines) break;
      
      if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word.substring(0, maxWidth));
        }
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Render weather error screen
   */
  renderWeatherError(message) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    const errorText = this.centerText('WEATHER ERROR', 0, 21);
    const messageText = this.centerText('DATA UNAVAILABLE', 0, 21);
    
    for (let i = 0; i < errorText.length; i++) matrix[1][i] = errorText[i];
    for (let i = 0; i < messageText.length; i++) matrix[3][i] = messageText[i];
    
    return matrix;
  }

  /**
   * Render METAR error screen
   */
  renderMetarError(message) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    const errorText = this.centerText('METAR ERROR', 0, 21);
    const messageText = this.centerText('DATA UNAVAILABLE', 0, 21);
    
    for (let i = 0; i < errorText.length; i++) matrix[1][i] = errorText[i];
    for (let i = 0; i < messageText.length; i++) matrix[3][i] = messageText[i];
    
    return matrix;
  }

  /**
   * Render Custom Message screen
   * Fetches from CustomScreen library (source of truth) or uses provided matrix
   */
  async renderCustomMessage(config) {
    try {
      // If customScreenId is provided, fetch from library (SOURCE OF TRUTH!)
      if (config.customScreenId) {
        const CustomScreen = require('../models/CustomScreen');
        const customScreen = await CustomScreen.findOne({ 
          screenId: config.customScreenId 
        });
        
        if (customScreen && customScreen.matrix) {
          console.log(`✅ Using custom screen from library: ${customScreen.name}`);
          return customScreen.matrix;
        } else {
          console.warn(`⚠️  Custom screen ${config.customScreenId} not found, generating fallback`);
        }
      }
      
      // If a pre-generated matrix is provided, use it (for pin screen)
      if (config.matrix && Array.isArray(config.matrix)) {
        console.log(`✅ Using pre-generated custom message matrix`);
        return config.matrix;
      }

      // Generate matrix with alternating border colors
      const message = (config.message || 'CUSTOM MESSAGE').toUpperCase();
      const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
      
      // Color code mapping
      const colorMap = {
        red: 63, orange: 64, yellow: 65, green: 66,
        blue: 67, purple: 68, white: 69
      };
      
      const color1 = colorMap[config.borderColor1] || 63;
      const color2 = colorMap[config.borderColor2] || 64;
      
      // Add alternating colored border
      for (let col = 0; col < 22; col++) {
        matrix[0][col] = col % 2 === 0 ? color1 : color2;
        matrix[5][col] = col % 2 === 0 ? color1 : color2;
      }
      
      for (let row = 1; row < 5; row++) {
        matrix[row][0] = row % 2 === 0 ? color1 : color2;
        matrix[row][21] = row % 2 === 0 ? color1 : color2;
      }
      
      // Support manual line breaks with backslash
      // Split by backslash first, then word wrap each segment
      const availableWidth = 18;
      const segments = message.split('\\');
      const lines = [];
      
      for (const segment of segments) {
        const words = segment.trim().split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= availableWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            // If word is too long, don't break it, just use what fits
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
      }
      
      // Center vertically and horizontally
      const displayLines = lines.slice(0, 4);
      const startRow = Math.floor((4 - displayLines.length) / 2) + 1;
      
      displayLines.forEach((line, lineIdx) => {
        const charCodes = this.textToCodes(line);
        const row = startRow + lineIdx;
        const startCol = Math.floor((availableWidth - charCodes.length) / 2) + 2;
        
        for (let i = 0; i < charCodes.length; i++) {
          const col = startCol + i;
          if (col >= 2 && col <= 19) {
            matrix[row][col] = charCodes[i];
          }
        }
      });
      
      console.log(`✅ Generated custom message with ${config.borderColor1}/${config.borderColor2} border`);
      return matrix;

    } catch (error) {
      console.error('Custom message rendering error:', error);
      return this.renderErrorScreen('Failed to render custom message');
    }
  }

  /**
   * Render error screen
   */
  renderErrorScreen(message) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    
    // Red border
    for (let col = 0; col < 22; col++) {
      matrix[0][col] = 63; // Red top border
      matrix[5][col] = 63; // Red bottom border
    }
    for (let row = 0; row < 6; row++) {
      matrix[row][0] = 63;  // Red left border
      matrix[row][21] = 63; // Red right border
    }
    
    const errorText = this.centerText('ERROR', 1, 20);
    const messageLines = this.wrapText(message, 20);
    
    // Insert error text
    for (let i = 0; i < errorText.length; i++) {
      matrix[1][i + 1] = errorText[i];
    }
    
    // Insert message lines
    for (let lineIndex = 0; lineIndex < Math.min(messageLines.length, 3); lineIndex++) {
      const lineText = this.centerText(messageLines[lineIndex], 1, 20);
      for (let i = 0; i < lineText.length; i++) {
        matrix[2 + lineIndex][i + 1] = lineText[i];
      }
    }
    
    return matrix;
  }

  /**
   * Create blank matrix
   */
  createBlankMatrix() {
    return new Array(6).fill(null).map(() => new Array(22).fill(0));
  }

  /**
   * Validate matrix format
   */
  validateMatrix(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 6) {
      return false;
    }

    for (const row of matrix) {
      if (!Array.isArray(row) || row.length !== 22) {
        return false;
      }
      for (const cell of row) {
        if (!Number.isInteger(cell) || cell < 0 || cell > 70) {
          return false;
        }
      }
    }

    return true;
  }
}

module.exports = new ScreenEngine();
