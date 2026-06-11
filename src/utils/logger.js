const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

const formatTimestamp = () => new Date().toISOString();

const logger = {
  debug: (...args) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) console.log(`[${formatTimestamp()}] [DEBUG]`, ...args);
  },
  info: (...args) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) console.log(`[${formatTimestamp()}] [INFO]`, ...args);
  },
  warn: (...args) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) console.warn(`[${formatTimestamp()}] [WARN]`, ...args);
  },
  error: (...args) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) console.error(`[${formatTimestamp()}] [ERROR]`, ...args);
  }
};

module.exports = logger;
