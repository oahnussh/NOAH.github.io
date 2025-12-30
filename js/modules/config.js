import { fetchJson } from './http.js';

export async function loadConfig(state) {
  // Optional: allow override via site.config.json
  // { "owner": "NOAH", "repo": "NOAH.github.io", "branch": "main" }
  try {
    const cfg = await fetchJson('site.config.json');
    if (cfg && typeof cfg === 'object') {
      if (typeof cfg.owner === 'string') state.config.owner = cfg.owner;
      if (typeof cfg.repo === 'string') state.config.repo = cfg.repo;
      if (typeof cfg.branch === 'string') state.config.branch = cfg.branch;
    }
  } catch {
    // ignore
  }

  if (!state.config.owner || !state.config.repo) {
    const host = location.hostname || '';
    const sub = host.split('.')[0];
    // For username.github.io, repo is usually username.github.io
    state.config.owner = state.config.owner || sub;
    state.config.repo = state.config.repo || `${sub}.github.io`;
  }
}
