interface ApiResponse {
  statusCode: number;
  data: string;
  message: string;
  success: boolean;
}

class ApiResponse implements ApiResponse {
  constructor(statusCode: number, data: string, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
