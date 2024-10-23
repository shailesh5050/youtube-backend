class ApiResponse {
  /**
   * API response object
   * @param {Number} statusCode - HTTP status code
   * @param {Object} data - Response data
   * @param {String} message - Response message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = true;
  }
}

export default ApiResponse;
