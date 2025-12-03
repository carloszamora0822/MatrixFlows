const express = require('express');
const router = express.Router();
const { ORG_CONFIG } = require('../../../shared/constants');

// Import models
const Workflow = require('../../models/Workflow');
const Checkride = require('../../models/Checkride');
const Event = require('../../models/Event');
const Birthday = require('../../models/Birthday');
const Pilot = require('../../models/Pilot');
const Recognition = require('../../models/Recognition');
const CustomScreen = require('../../models/CustomScreen');

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
const getStats = async (req, res) => {
  try {
    const orgId = ORG_CONFIG.ID;
    const Vestaboard = require('../../models/Vestaboard');
    const BoardState = require('../../models/BoardState');

    // Get all ACTIVE vestaboards (boards)
    const boards = await Vestaboard.find({ orgId, isActive: true });
    
    // Get board states with last matrix for each board
    const boardsWithDisplay = await Promise.all(boards.map(async (board) => {
      const boardObj = board.toObject();
      const boardState = await BoardState.findOne({ boardId: board.boardId });
      
      if (boardState) {
        boardObj.lastMatrix = boardState.lastMatrix;
        boardObj.lastUpdateAt = boardState.lastUpdateAt;
        boardObj.currentWorkflowId = boardState.currentWorkflowId;
        boardObj.currentStepIndex = boardState.currentStepIndex;
      }
      
      // Manually get the workflow if there's a defaultWorkflowId
      if (board.defaultWorkflowId) {
        const workflow = await Workflow.findOne({ workflowId: board.defaultWorkflowId });
        boardObj.defaultWorkflowId = workflow;
      }
      
      return boardObj;
    }));

    // Count all data entries
    const [
      workflowCount,
      checkrideCount,
      eventCount,
      birthdayCount,
      pilotCount,
      recognitionCount,
      customScreenCount,
      workflows
    ] = await Promise.all([
      Workflow.countDocuments({ orgId }),
      Checkride.countDocuments({ orgId }),
      Event.countDocuments({ orgId }),
      Birthday.countDocuments({ orgId }),
      Pilot.countDocuments({ orgId }),
      Recognition.countDocuments({ orgId }),
      CustomScreen.countDocuments({ orgId }),
      Workflow.find({ orgId, 'schedule.enabled': true }).limit(5)
    ]);

    // Get active workflows
    const activeWorkflows = await Workflow.countDocuments({ 
      orgId, 
      'schedule.enabled': true 
    });

    // Get today's checkrides
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const todaysCheckrides = await Checkride.find({ orgId, date: todayStr }).limit(5);

    // Get this week's birthdays
    const thisWeekBirthdays = await Birthday.find({ orgId }).limit(5);

    // Get upcoming events (next 7 days)
    const upcomingEvents = await Event.find({ orgId })
      .sort({ date: 1, time: 1 })
      .limit(5);

    // Get current displays
    const currentBirthday = await Birthday.findOne({ orgId, isCurrent: true });
    const currentPilot = await Pilot.findOne({ orgId, isCurrent: true });
    const currentRecognition = await Recognition.findOne({ orgId, isCurrent: true });

    // Calculate total data entries
    const totalDataEntries = checkrideCount + eventCount + birthdayCount + 
                             pilotCount + recognitionCount + customScreenCount;

    res.json({
      stats: {
        workflows: {
          total: workflowCount,
          active: activeWorkflows
        },
        data: {
          total: totalDataEntries,
          checkrides: checkrideCount,
          events: eventCount,
          birthdays: birthdayCount,
          pilots: pilotCount,
          recognitions: recognitionCount,
          customScreens: customScreenCount
        },
        today: {
          checkrides: todaysCheckrides.length
        }
      },
      current: {
        birthday: currentBirthday,
        pilot: currentPilot,
        recognition: currentRecognition
      },
      boards: boardsWithDisplay,
      workflows,
      todaysCheckrides,
      thisWeekBirthdays,
      upcomingEvents
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch dashboard stats' } });
  }
};

/**
 * GET /api/dashboard/activity
 * Get recent activity (last 10 updates)
 */
const getActivity = async (req, res) => {
  try {
    const orgId = ORG_CONFIG.ID;

    // Get recent items sorted by updatedAt
    const [checkrides, events, birthdays, pilots, recognitions, customScreens] = await Promise.all([
      Checkride.find({ orgId }).sort({ updatedAt: -1 }).limit(3).lean(),
      Event.find({ orgId }).sort({ updatedAt: -1 }).limit(3).lean(),
      Birthday.find({ orgId }).sort({ updatedAt: -1 }).limit(3).lean(),
      Pilot.find({ orgId }).sort({ updatedAt: -1 }).limit(3).lean(),
      Recognition.find({ orgId }).sort({ updatedAt: -1 }).limit(3).lean(),
      CustomScreen.find({ orgId }).sort({ updatedAt: -1 }).limit(3).lean()
    ]);

    // Combine and tag with type
    const activity = [
      ...checkrides.map(item => ({ ...item, type: 'checkride', icon: '✈️' })),
      ...events.map(item => ({ ...item, type: 'event', icon: '📅' })),
      ...birthdays.map(item => ({ ...item, type: 'birthday', icon: '🎂' })),
      ...pilots.map(item => ({ ...item, type: 'pilot', icon: '🎓' })),
      ...recognitions.map(item => ({ ...item, type: 'recognition', icon: '⭐' })),
      ...customScreens.map(item => ({ ...item, type: 'custom_screen', icon: '🎨' }))
    ];

    // Sort by updatedAt and take top 10
    activity.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.json(activity.slice(0, 10));
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch activity' } });
  }
};

// Routes
router.get('/stats', getStats);
router.get('/activity', getActivity);

module.exports = router;
