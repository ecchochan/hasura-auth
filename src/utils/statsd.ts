import { StatsD } from 'hot-shots';
import { ENV } from './env';

export const statsd = new StatsD({
  host: ENV.AUTH_HOTSHOTS_HOST || 'localhost',
  port: parseInt(ENV.AUTH_HOTSHOTS_PORT || '8125'),
  prefix: ENV.AUTH_HOTSHOTS_PREFIX ? ENV.AUTH_HOTSHOTS_PREFIX + '.' : undefined,
  globalTags: { env: process.env.NODE_ENV || '' },
});
