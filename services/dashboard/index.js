/**
 * Dashboard Service - Main Entry Point
 * Exports the Dashboard and Profile service routers
 */

const router = require('./routes');
const profileRouter = require('./profileRoutes');

module.exports = {
  router,
  profileRouter
};
