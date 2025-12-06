interface ApiErrorOptions {
  statusCode: number;
  message: string;
  errors?: any;
  stack?: string;
}

class ApiError extends Error {
  public statusCode: number;
  public errors: unknown;
  public message: string;

  constructor({
    statusCode = 500,
    message = 'Internal server error',
    errors = [],
    stack = '',
  }: ApiErrorOptions) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
