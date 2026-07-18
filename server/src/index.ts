import { env } from './config/env.js';
import { createApp } from './app.js';

createApp().listen(env.port, () => {
  console.log(`Payment API listening on http://localhost:${env.port}`);
});
