const { VESTABOARD_CHAR_MAP } = require('../../shared/constants');
const templates = require('./templates');
const dataService = require('./dataService');

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
   */
  async renderBirthday(config) {
    const template = templates.birthday;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Get birthday data
    const birthday = await dataService.getLatestBirthday();
    if (!birthday) {
      return this.renderErrorScreen('No birthday data found');
    }

    // Apply placeholders with proper text alignment
    const row1Text = this.centerText('VBT WISHES', 1, 20);
    const row2Text = this.centerText(birthday.firstName.toUpperCase(), 1, 20);
    const row3Text = this.centerText('A HAPPY BIRTHDAY!', 1, 20);
    const row4Text = this.centerText(birthday.date, 1, 20);

    // Insert into matrix (preserving red border)
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 1] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 1] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 1] = row3Text[i];
    for (let i = 0; i < row4Text.length; i++) matrix[4][i + 1] = row4Text[i];

    return matrix;
  }

  /**
   * Render Checkrides screen
   */
  async renderCheckrides(config) {
    const template = templates.checkrides;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Get checkride data
    const checkrides = await dataService.getUpcomingCheckrides();
    if (!checkrides || checkrides.length === 0) {
      return this.renderErrorScreen('No checkride data found');
    }

    // Take first checkride
    const checkride = checkrides[0];
    
    const row1Text = this.centerText('UPCOMING CHECKRIDE', 1, 20);
    const row2Text = this.centerText(`${checkride.time} - ${checkride.callsign}`, 1, 20);
    const row3Text = this.centerText(checkride.type, 1, 20);
    const row4Text = this.centerText(checkride.destination, 1, 20);

    // Insert into matrix
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 1] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 1] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 1] = row3Text[i];
    for (let i = 0; i < row4Text.length; i++) matrix[4][i + 1] = row4Text[i];

    return matrix;
  }

  /**
   * Render Upcoming Events screen
   */
  async renderUpcomingEvents(config) {
    const template = templates.upcomingEvents;
    const matrix = JSON.parse(JSON.stringify(template));
    
    // Get event data
    const events = await dataService.getUpcomingEvents();
    if (!events || events.length === 0) {
      return this.renderErrorScreen('No event data found');
    }

    // Take first event
    const event = events[0];
    
    const row1Text = this.centerText('UPCOMING EVENT', 1, 20);
    const row2Text = this.centerText(event.date, 1, 20);
    const row3Text = this.centerText(event.time, 1, 20);
    const row4Text = this.centerText(event.description.substring(0, 20), 1, 20);

    // Insert into matrix
    for (let i = 0; i < row1Text.length; i++) matrix[1][i + 1] = row1Text[i];
    for (let i = 0; i < row2Text.length; i++) matrix[2][i + 1] = row2Text[i];
    for (let i = 0; i < row3Text.length; i++) matrix[3][i + 1] = row3Text[i];
    for (let i = 0; i < row4Text.length; i++) matrix[4][i + 1] = row4Text[i];

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
      return this.renderErrorScreen('No newest pilot data found');
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
      return this.renderErrorScreen('No recognition data found');
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
   * Render Custom Message screen
   */
  async renderCustomMessage(config) {
    // This will be implemented in Sprint 4
    return this.renderErrorScreen('Custom messages coming in Sprint 4');
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
