import express from 'express';
import helmet from 'helmet';
import { json } from 'body-parser';
import cors from 'cors';

import { ENV } from './utils/env';
import router from './routes';
import { serverErrors } from './errors';
import { authMiddleware } from './middleware/auth';
import { addOpenApiRoute } from './openapi';
import { uncaughtErrorLogger, httpLogger } from './logger';
import { statsdMiddleware } from './middleware/statsd';

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(statsdMiddleware);

addOpenApiRoute(app);
app.use(httpLogger);

app.use(helmet(), json(), cors());
app.use(authMiddleware);

if (ENV.AUTH_PATH_PREFIX) app.use(ENV.AUTH_PATH_PREFIX, router);
else app.use(router);

app.use(uncaughtErrorLogger, serverErrors);
export { app };
