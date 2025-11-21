const DEFAULT_REPO_URL = 'https://github.com/MaxPr1me/hydro-xml-to-excel';

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

export function resolveRepoUrl() {
  const envRepoUrl = import.meta.env.VITE_REPO_URL?.trim();
  if (envRepoUrl) {
    return envRepoUrl.replace(/\/$/, '');
  }

  const inferredUrl = inferRepoUrlFromHost();
  if (inferredUrl) {
    return inferredUrl;
  }

  return DEFAULT_REPO_URL;
}

export function buildLicenseUrl() {
  const branch = import.meta.env.VITE_DEFAULT_BRANCH?.trim() || 'main';
  return `${resolveRepoUrl()}/blob/${branch}/LICENSE`;
}
