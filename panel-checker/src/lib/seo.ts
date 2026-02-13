import { Language } from '../content/i18n';

type SeoCopy = {
  title: string;
  description: string;
  softwareDescription: string;
};

const SEO_COPY: Record<Language, SeoCopy> = {
  en: {
    title: 'LEEP SPARK Tool | Electrical Panel Sizing Calculator Canada',
    description:
      'Save thousands by avoiding unnecessary electrical panel upgrades. Analyze one year of real utility data using the LEEP SPARK Tool.',
    softwareDescription:
      'Static web app for Canadian panel upgrade assessments using Green Button, CSV, and XLSX interval demand data.'
  },
  fr: {
    title: 'Outil LEEP SPARK | Calculateur canadien de dimensionnement de panneau électrique',
    description:
      'Économisez des milliers de dollars en évitant les mises à niveau inutiles du panneau électrique. Analysez une année complète de données réelles du service public avec l’outil LEEP SPARK.',
    softwareDescription:
      'Application Web statique pour évaluer les mises à niveau de panneaux au Canada avec des données intervalle Green Button, CSV et XLSX.'
  }
};

const ORG_NAME = 'CanmetENERGY-Ottawa';

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let node = document.head.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, name);
    document.head.appendChild(node);
  }
  node.content = content;
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  const selectorExtras = extra
    ? Object.entries(extra)
        .map(([key, value]) => `[${key}="${value}"]`)
        .join('')
    : '';
  let node = document.head.querySelector(`link[rel="${rel}"]${selectorExtras}`) as HTMLLinkElement | null;
  if (!node) {
    node = document.createElement('link');
    node.rel = rel;
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => node?.setAttribute(key, value));
    }
    document.head.appendChild(node);
  }
  node.href = href;
}

export function applySeo(lang: Language, pathname: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const baseUrl = `${window.location.origin}${pathname}`;
  const enUrl = `${baseUrl}?lang=en`;
  const frUrl = `${baseUrl}?lang=fr`;
  const canonical = lang === 'fr' ? frUrl : enUrl;
  const copy = SEO_COPY[lang];

  document.title = copy.title;
  upsertMeta('description', copy.description);
  upsertMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  upsertMeta('google-site-verification', 'REPLACE_WITH_SEARCH_CONSOLE_TOKEN');

  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:locale', lang === 'fr' ? 'fr_CA' : 'en_CA', 'property');
  upsertMeta('og:locale:alternate', lang === 'fr' ? 'en_CA' : 'fr_CA', 'property');
  upsertMeta('og:site_name', 'LEEP SPARK Tool', 'property');
  upsertMeta('og:title', copy.title, 'property');
  upsertMeta('og:description', copy.description, 'property');
  upsertMeta('og:url', canonical, 'property');

  upsertMeta('twitter:card', 'summary');
  upsertMeta('twitter:title', copy.title);
  upsertMeta('twitter:description', copy.description);
  upsertMeta('twitter:url', canonical);

  upsertLink('canonical', canonical);
  upsertLink('alternate', enUrl, { hreflang: 'en-CA' });
  upsertLink('alternate', frUrl, { hreflang: 'fr-CA' });
  upsertLink('alternate', enUrl, { hreflang: 'x-default' });

  let ldJson = document.getElementById('software-application-ld') as HTMLScriptElement | null;
  if (!ldJson) {
    ldJson = document.createElement('script');
    ldJson.type = 'application/ld+json';
    ldJson.id = 'software-application-ld';
    document.head.appendChild(ldJson);
  }

  ldJson.text = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'LEEP SPARK Tool',
      inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
      description: copy.softwareDescription,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'CAD'
      },
      provider: {
        '@type': 'Organization',
        name: ORG_NAME
      },
      url: canonical
    },
    null,
    2
  );
}
