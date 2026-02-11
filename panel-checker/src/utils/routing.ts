const normalizePath = (value: string) => {
  if (!value) {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;

  return withoutTrailingSlash || '/';
};

export const resolveBasePath = () => {
  const configuredBase = import.meta.env.VITE_BASE_PATH;

  if (typeof configuredBase === 'string' && configuredBase.trim()) {
    return normalizePath(configuredBase);
  }

  return '/hydro-xml-to-excel';
};

export const routeForLocale = (locale: 'en' | 'fr', suffix = '') => {
  const normalizedSuffix = suffix.replace(/^\//, '');

  if (!normalizedSuffix) {
    return `/${locale}`;
  }

  return `/${locale}/${normalizedSuffix}`;
};
