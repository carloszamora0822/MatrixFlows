const timeUtils = require('../lib/timeUtils');
const moment = require('moment-timezone');

describe('TimeUtils - Scheduling System Tests', () => {
  
  describe('Midnight Rollover Tests', () => {
    test('should correctly handle midnight rollover with 30min interval at 11:50 PM', () => {
      // Mock current time to 11:50 PM Central
      const mockNow = moment.tz('2026-01-12 23:50:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, null);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should be 12:00 AM next day (midnight)
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-13 00:00');
      
      timeUtils.now.mockRestore();
    });

    test('should correctly handle midnight rollover with 15min interval at 11:55 PM', () => {
      const mockNow = moment.tz('2026-01-12 23:55:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const nextTrigger = timeUtils.calculateNextTrigger(15, null);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should be 12:00 AM next day
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-13 00:00');
      
      timeUtils.now.mockRestore();
    });

    test('should correctly handle midnight rollover with 60min interval at 11:30 PM', () => {
      const mockNow = moment.tz('2026-01-12 23:30:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const nextTrigger = timeUtils.calculateNextTrigger(60, null);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should be 12:00 AM next day
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-13 00:00');
      
      timeUtils.now.mockRestore();
    });
  });

  describe('Daily Window with Day-of-Week Tests', () => {
    test('should skip to next valid day when current day not in schedule', () => {
      // Sunday Jan 11, 2026 at 3:00 PM (Sunday = 0)
      const mockNow = moment.tz('2026-01-11 15:00:00', 'America/Chicago');
      const originalNow = timeUtils.now;
      timeUtils.now = jest.fn(() => mockNow);
      
      const windowConfig = {
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri only
      };
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, windowConfig);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should skip to Monday at 9:00 AM
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-12 09:00');
      expect(nextTriggerCentral.day()).toBe(1); // Monday
      
      timeUtils.now = originalNow;
    });

    test('should skip weekend and go to Monday when Friday after hours', () => {
      // Friday Jan 16, 2026 at 6:00 PM (after window)
      const mockNow = moment.tz('2026-01-16 18:00:00', 'America/Chicago');
      const originalNow = timeUtils.now;
      timeUtils.now = jest.fn(() => mockNow);
      
      const windowConfig = {
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri only
      };
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, windowConfig);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should skip to Monday at 9:00 AM
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-19 09:00');
      expect(nextTriggerCentral.day()).toBe(1); // Monday
      
      timeUtils.now = originalNow;
    });

    test('should handle end-of-day rollover with day-of-week restrictions', () => {
      // Thursday Jan 15, 2026 at 4:45 PM (15 min before end)
      const mockNow = moment.tz('2026-01-15 16:45:00', 'America/Chicago');
      const originalNow = timeUtils.now;
      timeUtils.now = jest.fn(() => mockNow);
      
      const windowConfig = {
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri only
      };
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, windowConfig);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Next 30min interval would be 5:00 PM, which is exactly at end time (still valid)
      // So it should trigger at 5:00 PM same day
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-15 17:00');
      expect(nextTriggerCentral.day()).toBe(4); // Thursday
      
      timeUtils.now = originalNow;
    });
  });

  describe('Interval Alignment Tests', () => {
    test('should align to 30-minute intervals correctly', () => {
      const mockNow = moment.tz('2026-01-12 14:23:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, null);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should align to 14:30
      expect(nextTriggerCentral.format('HH:mm')).toBe('14:30');
      
      timeUtils.now.mockRestore();
    });

    test('should align to 15-minute intervals correctly', () => {
      const mockNow = moment.tz('2026-01-12 14:23:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const nextTrigger = timeUtils.calculateNextTrigger(15, null);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should align to 14:30 (next 15-min boundary)
      expect(nextTriggerCentral.format('HH:mm')).toBe('14:30');
      
      timeUtils.now.mockRestore();
    });

    test('should align to 60-minute intervals correctly', () => {
      const mockNow = moment.tz('2026-01-12 14:23:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const nextTrigger = timeUtils.calculateNextTrigger(60, null);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should align to 15:00
      expect(nextTriggerCentral.format('HH:mm')).toBe('15:00');
      
      timeUtils.now.mockRestore();
    });
  });

  describe('Window Boundary Tests', () => {
    test('should move to next day when after window end', () => {
      // 6:00 PM, after 5:00 PM end time
      const mockNow = moment.tz('2026-01-12 18:00:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const windowConfig = {
        startTime: '09:00',
        endTime: '17:00'
      };
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, windowConfig);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should be next day at 9:00 AM
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-13 09:00');
      
      timeUtils.now.mockRestore();
    });

    test('should move to start time when before window start', () => {
      // 6:00 AM, before 9:00 AM start time
      const mockNow = moment.tz('2026-01-12 06:00:00', 'America/Chicago');
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const windowConfig = {
        startTime: '09:00',
        endTime: '17:00'
      };
      
      const nextTrigger = timeUtils.calculateNextTrigger(30, windowConfig);
      const nextTriggerCentral = moment(nextTrigger).tz('America/Chicago');
      
      // Should be same day at 9:00 AM
      expect(nextTriggerCentral.format('YYYY-MM-DD HH:mm')).toBe('2026-01-12 09:00');
      
      timeUtils.now.mockRestore();
    });
  });

  describe('isInWindow Tests', () => {
    test('should return true when in window', () => {
      const mockNow = moment.tz('2026-01-12 14:00:00', 'America/Chicago'); // Monday 2 PM
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const result = timeUtils.isInWindow('09:00', '17:00', [1, 2, 3, 4, 5]);
      expect(result).toBe(true);
      
      timeUtils.now.mockRestore();
    });

    test('should return false when outside time window', () => {
      const mockNow = moment.tz('2026-01-12 18:00:00', 'America/Chicago'); // Monday 6 PM
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const result = timeUtils.isInWindow('09:00', '17:00', [1, 2, 3, 4, 5]);
      expect(result).toBe(false);
      
      timeUtils.now.mockRestore();
    });

    test('should return false when wrong day of week', () => {
      const mockNow = moment.tz('2026-01-11 14:00:00', 'America/Chicago'); // Sunday 2 PM
      jest.spyOn(timeUtils, 'now').mockReturnValue(mockNow);
      
      const result = timeUtils.isInWindow('09:00', '17:00', [1, 2, 3, 4, 5]);
      expect(result).toBe(false);
      
      timeUtils.now.mockRestore();
    });
  });

  describe('Timezone Consistency Tests', () => {
    test('should always use Central Time regardless of server timezone', () => {
      const now = timeUtils.now();
      expect(now.format('z')).toContain('C'); // CST or CDT
      expect(timeUtils.getTimezone()).toBe('America/Chicago');
    });

    test('should convert any date to Central Time', () => {
      const utcDate = new Date('2026-01-12T20:00:00Z'); // 8 PM UTC
      const central = timeUtils.toCentral(utcDate);
      
      // Should be 2 PM Central (UTC-6)
      expect(central.format('HH:mm')).toBe('14:00');
      expect(central.tz()).toBe('America/Chicago');
    });
  });
});
