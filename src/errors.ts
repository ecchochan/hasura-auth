import { NextFunction, Response, Request } from 'express';
import { logger } from './logger';
import { statsd } from './utils/statsd';

/**
 * This is a custom error middleware for Express.
 * https://expressjs.com/en/guide/error-handling.html
 */
export async function errors(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Promise<unknown> {
  logger.error(error.message);

  statsd.increment('error', 1, 1, {
    route: req.url,
  });

  if (process.env.NODE_ENV === 'production') {
    return res.status(500).send();
  } else {
    return res.status(500).send({
      message: error.message,
    });
  }
}
