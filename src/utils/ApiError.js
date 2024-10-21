class ApiError extends Error {
  constructor(
    message = 'Something went wrong',
    statusCode = 500, // Default statusCode to 500
    error = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.stack = stack;
    this.success = false;
    this.errors = error;

    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export { ApiError };
