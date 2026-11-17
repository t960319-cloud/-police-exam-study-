import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Agent preflight only: never merges, deletes, deploys, or writes study data.
const root = fileURLToPath(new URL('../', import.meta.url));
const settings = JSON.parse(fs.readFileSync(path.join(root, 'docs/project-settings.json'), 'utf8'));
const problems = [];
const warnings = [];
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const normalize = value => value.replace(/\.git\/?$/, '').replace(/\/$/, '');
const report = { checkedAt: new Date().toISOString(), productionUrl: settings.productionUrl, productionWrites: 0 };

try {
  if (normalize(git(['remote', 'get-url', 'origin'])) !== normalize(settings.repository)) {
    problems.push('wrong_repository');
  } else {
    const fetched = spawnSync('git', ['fetch', 'origin', settings.sourceBranch], { cwd: root, encoding: 'utf8', timeout: 30000 });
    if (fetched.status !== 0) problems.push('git_fetch_failed');
    else {
      report.head = git(['rev-parse', 'HEAD']);
      report.remoteHead = git(['rev-parse', `origin/${settings.sourceBranch}`]);
      const [ahead, behind] = git(['rev-list', '--left-right', '--count', `HEAD...origin/${settings.sourceBranch}`]).split(/\s+/).map(Number);
      report.source = { ahead, behind };
      if (behind) problems.push('integrate_remote_before_next_change');
    }
  }
  report.worktreeEntries = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
  if (report.worktreeEntries) warnings.push('preserve_existing_work_before_integration');
} catch { problems.push('git_check_failed'); }

try {
  const policy = JSON.parse(fs.readFileSync('/etc/codex/network-policy.json', 'utf8'));
  report.startupNetworkMode = policy.http_network_policy?.type ?? 'unknown';
  if (report.startupNetworkMode !== settings.expectedNetworkMode) warnings.push('check_live_environment_policy_against_shared_setup');
} catch { warnings.push('startup_policy_unavailable_check_environment_status'); }

report.http = ['/', '/api/session'].map(endpoint => {
  const url = new URL(endpoint, settings.productionUrl).href;
  const result = spawnSync('curl', ['--silent', '--show-error', '--max-time', '20', '--output', '/dev/null', '--write-out', '%{http_code} %{http_connect}', url], { encoding: 'utf8', timeout: 25000 });
  const [http, connect] = (result.stdout ?? '').trim().split(/\s+/).map(Number);
  if (result.status !== 0 || http !== 200) problems.push(`connection_failed:${endpoint}`);
  return { endpoint, http: Number.isFinite(http) ? http : null, connect: Number.isFinite(connect) ? connect : null, curlExit: result.status };
});
report.problems = problems;
report.warnings = warnings;
report.scope = 'Git source and anonymous HTTP only; browser, runtime-policy enforcement, login, and production persistence require separate evidence.';
const output = path.join(root, '.sites-runtime/workspace-readiness.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = problems.length ? 1 : 0;
