import packageJson from '../../package.json';

type PackageRepo = string | { type?: string; url?: string };

function normalizeRepoUrl(repoUrl?: string) {
  if (!repoUrl) {
    return undefined;
  }

  return repoUrl.replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/$/, '');
}

function resolveRepoUrlFromPackage(repo: PackageRepo | undefined) {
  if (!repo) {
    return undefined;
  }

  const rawUrl = typeof repo === 'string' ? repo : repo.url;
  return normalizeRepoUrl(rawUrl);
}

const PACKAGE_REPO_URL = resolveRepoUrlFromPackage(packageJson.repository);
const DEFAULT_REPO_URL =
  PACKAGE_REPO_URL && !PACKAGE_REPO_URL.includes('OWNER/REPO') ? PACKAGE_REPO_URL : undefined;

function inferRepoUrlFromHost() {
  const { hostname, pathname } = window.location;

  if (hostname.endsWith('github.io')) {
    const owner = hostname.split('.')[0];
    const segments = pathname.split('/').filter(Boolean);
    const repo = segments[0];

    if (owner && repo) {
      return `https://github.com/${owner}/${repo}`;
    }
  }

  return undefined;
}

function inferBranchFromPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return undefined;
  }

  const candidate = segments[1];
  if (!candidate || candidate.includes('.') || candidate.toLowerCase() === 'assets') {
    return undefined;
  }

  return candidate;
}

export function resolveRepoUrl() {
  const envRepoUrl = normalizeRepoUrl(import.meta.env.VITE_REPO_URL?.trim());
  if (envRepoUrl) {
    return envRepoUrl;
  }

  const inferredUrl = normalizeRepoUrl(inferRepoUrlFromHost());
  if (inferredUrl) {
    return inferredUrl;
  }

  return DEFAULT_REPO_URL;
}

export function resolveDefaultBranch() {
  return inferBranchFromPath() || import.meta.env.VITE_DEFAULT_BRANCH?.trim() || 'main';
}

export function buildLicenseUrl() {
  const repoUrl = resolveRepoUrl();
  if (!repoUrl) {
    return 'LICENSE';
  }
  return `${repoUrl}/blob/${resolveDefaultBranch()}/LICENSE`;
}
