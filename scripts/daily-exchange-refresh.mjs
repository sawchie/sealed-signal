import { appendFile } from 'node:fs/promises';
import { validRefreshClaims } from '../lib/refresh-validation.ts';

const endpoint = 'https://pokescratch.com/api/prices/refresh';
if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error('Run through the authorized daily GitHub workflow.');
let result;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
    url.searchParams.set('audience', endpoint);
    const identity = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, signal: AbortSignal.timeout(15000) });
    if (!identity.ok) throw new Error(`Workflow identity HTTP ${identity.status}`);
    const { value: token } = await identity.json();
    if (!token || !validRefreshClaims(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()))) throw new Error('Unexpected workflow identity');
    const response = await fetch(`${endpoint}?exchange=1`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`Exchange refresh HTTP ${response.status}`);
    result = await response.json(); break;
  } catch (error) {
    if (attempt === 2) throw error;
    await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
  }
}
const summary = `## Daily exchange rates\n${result.currencies} currencies. ECB rate date: ${result.date}. Checked: ${result.checkedAt}. Weekends and holidays retain the latest published business-day rates.\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
