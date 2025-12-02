// VBT Vestaboard System - Data Service Layer
// Provides data for screen rendering

class DataService {
  /**
   * Get latest birthday for display
   */
  async getLatestBirthday() {
    // For Sprint 2, return mock data
    // This will be replaced with real database queries in Sprint 3
    return {
      firstName: 'John',
      date: 'Dec 15'
    };
  }

  /**
   * Get upcoming checkrides
   */
  async getUpcomingCheckrides() {
    // For Sprint 2, return mock data
    return [
      {
        time: '10:00 AM',
        callsign: 'N123AB',
        type: 'PPL Checkride',
        destination: 'KVBT'
      }
    ];
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents() {
    // For Sprint 2, return mock data
    return [
      {
        date: 'Dec 20',
        time: '6:00 PM',
        description: 'Holiday Party'
      }
    ];
  }

  /**
   * Get newest pilot information
   */
  async getNewestPilot() {
    // For Sprint 2, return mock data
    return {
      name: 'Sarah Johnson',
      isCurrent: true
    };
  }

  /**
   * Get current employee recognition
   */
  async getCurrentRecognition() {
    // For Sprint 2, return mock data
    return {
      firstName: 'Mike',
      lastName: 'Davis',
      isCurrent: true
    };
  }

  /**
   * Get METAR data (placeholder for Sprint 4)
   */
  async getMetarData(stationId = 'KVBT') {
    // Placeholder for Sprint 4
    return null;
  }

  /**
   * Get weather data (placeholder for Sprint 4)
   */
  async getWeatherData(location = 'Bentonville,US') {
    // Placeholder for Sprint 4
    return null;
  }

  /**
   * Get custom message (placeholder for Sprint 4)
   */
  async getCustomMessage(messageId) {
    // Placeholder for Sprint 4
    return null;
  }
}

module.exports = new DataService();
