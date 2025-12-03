// VBT Vestaboard System - Data Service Layer
// Provides data for screen rendering

const Birthday = require('../models/Birthday');
const Checkride = require('../models/Checkride');
const Event = require('../models/Event');
const Pilot = require('../models/Pilot');
const Recognition = require('../models/Recognition');
const { ORG_CONFIG } = require('../../shared/constants');

class DataService {
  /**
   * Get current birthday for display
   */
  async getLatestBirthday() {
    try {
      const birthday = await Birthday.findOne({ 
        orgId: ORG_CONFIG.ID,
        isCurrent: true
      });
      
      return birthday || null;
    } catch (error) {
      console.error('Error fetching birthday:', error);
      return null;
    }
  }

  /**
   * Get upcoming checkrides
   */
  async getUpcomingCheckrides() {
    try {
      const checkrides = await Checkride.find({ 
        orgId: ORG_CONFIG.ID 
      }).sort({ date: 1, time: 1 }).limit(5);
      
      return checkrides;
    } catch (error) {
      console.error('Error fetching checkrides:', error);
      return [];
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents() {
    try {
      const events = await Event.find({ 
        orgId: ORG_CONFIG.ID 
      }).sort({ date: 1, time: 1 }).limit(5);
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  /**
   * Get newest pilot information
   */
  async getNewestPilot() {
    try {
      const pilot = await Pilot.findOne({ 
        orgId: ORG_CONFIG.ID,
        isCurrent: true 
      });
      
      return pilot || null;
    } catch (error) {
      console.error('Error fetching newest pilot:', error);
      return null;
    }
  }

  /**
   * Get current employee recognition
   */
  async getCurrentRecognition() {
    try {
      const recognition = await Recognition.findOne({ 
        orgId: ORG_CONFIG.ID,
        isCurrent: true 
      });
      
      return recognition || null;
    } catch (error) {
      console.error('Error fetching recognition:', error);
      return null;
    }
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
