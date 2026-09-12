import catalog from '../data/catalog-import.json' with { type: 'json' };
import { appendFile } from 'node:fs/promises';

const endpoint = 'https://pokescratch.com/api/prices/refresh';
if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
  throw new Error('Run this script through the authorized GitHub Actions workflow, not a local shell.');
}
const groups = [...new Set(catalog.items.map(item => item.sourceGroupId))];
const failures = [], completed = [];
for (const group of groups) {
  let offset = 0;
  do {
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const authUrl = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
      authUrl.searchParams.set('audience', endpoint);
      const identity = await fetch(authUrl, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, signal: AbortSignal.timeout(15000) });
      if (!identity.ok) throw new Error(`GitHub identity HTTP ${identity.status}`);
      const { value: token } = await identity.json();
      if (!token) throw new Error('Missing workflow identity');
      const response = await fetch(`${endpoint}?group=${group}&offset=${offset}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`Refresh HTTP ${response.status}`);
      result = await response.json();
      break;
    } catch (error) {
      if (attempt === 2) failures.push({ group, offset, error: error.message });
      else await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
    }
  }
  if (result) { completed.push(result); console.log(JSON.stringify(result)); }
  offset = result?.nextOffset ?? null;
  } while (offset !== null);
}
const summary = `## Daily market refresh\n${groups.length - failures.length}/${groups.length} groups completed. ${completed.reduce((sum, group) => sum + group.available, 0)} provider quotes available. Missing quotes retain their previous values.\n\n${failures.map(f => `- Group ${f.group}, offset ${f.offset}: ${f.error}`).join('\n')}\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
if (failures.length) process.exitCode = 1;
