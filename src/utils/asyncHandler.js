// Async handler function with comments and docstrings
/**
 * Middleware to handle asynchronous functions
 * @param {Function} fn - Asynchronous function to execute
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
};
