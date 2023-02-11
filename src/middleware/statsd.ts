import { statsd } from '@/utils/statsd';
import { Request, Response, NextFunction } from 'express';

export const statsdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = process.hrtime.bigint();
  statsd.increment('request', 1, 1, {
    route: req.path,
  });

  res.on('finish', () => {
    const responseTime = process.hrtime.bigint() - startTime;
    const milliseconds = Number(responseTime / BigInt(1000000));
    statsd.histogram('response_time', milliseconds, 1, {
      route: req.path,
    });
  });

  next();
};
