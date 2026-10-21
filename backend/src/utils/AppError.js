/** An error whose message is safe to show to API clients. */
export class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what = 'Resource') => new AppError(404, `${what} not found`, 'NOT_FOUND');
