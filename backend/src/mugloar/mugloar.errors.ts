// Typed errors for the game API. The exception filter maps them to HTTP responses.

export class GameNotFoundError extends Error {
  constructor() {
    super('Game not found');
  }
}

export class AdNotFoundError extends Error {
  constructor() {
    super('Ad not found, expired or already solved');
  }
}

export class GameOverError extends Error {
  constructor() {
    super('Game over');
  }
}

export class RateLimitedError extends Error {
  constructor() {
    super('The game API rejected the request because of too many requests');
  }
}

export class UpstreamUnavailableError extends Error {}

// The request did not reach the game API, or we got no answer.
export class UpstreamNetworkError extends UpstreamUnavailableError {
  constructor() {
    super('Could not reach the game API');
  }
}

// The game API answered with a 5xx status.
export class UpstreamServerError extends UpstreamUnavailableError {
  constructor(status: number) {
    super(`The game API answered with status ${status}`);
  }
}

export class UpstreamTimeoutError extends Error {
  constructor() {
    super('The game API did not answer in time');
  }
}
