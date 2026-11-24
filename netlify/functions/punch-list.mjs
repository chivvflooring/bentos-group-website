import { handler } from '../lib/punch-list-intake.mjs';
import { intakeResponse } from '../lib/serve-intake.mjs';

export const config = {
  path: '/.netlify/functions/punch-list',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip'] }
};

export default function intake(request, context) {
  return intakeResponse(request, context, handler);
}
