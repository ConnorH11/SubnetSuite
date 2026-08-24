(function () {
  const routes = [
    'subnet', 'vlsm', 'supernet', 'ipv6', 'acl', 'route', 'binary', 'converter',
    'visualizer', 'simulator', 'flashcards', 'practice-test', 'publicip',
    'maclookup', 'cheatsheet', 'overlap', 'headers', 'bandwidth', 'ports', 'about'
  ];
  const legacyRoutes = {
    ipsubnet: 'subnet',
    routegenerator: 'route',
    binarycalc: 'binary',
    supernetting: 'supernet',
    aclgenerator: 'acl',
    pingtraceroute: 'publicip'
  };
  const monthPattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)$/i;
  const monthOnlyPattern = /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)$/i;
  const cleanToken = token => decodeURIComponent(token || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const canonicalForRoute = route => route ? `/${route}/` : '/';

  const url = new URL(window.location.href);
  const segments = url.pathname.split('/').filter(Boolean);
  const first = cleanToken(segments[0]);
  const canonicalRoute = routes.includes(first) ? first : legacyRoutes[first];

  let targetPath = null;

  if (url.protocol === 'http:' || url.hostname.startsWith('www.')) {
    url.protocol = 'https:';
    url.hostname = 'subnetsuite.com';
    targetPath = url.pathname;
  }

  if (url.searchParams.has('ref')) {
    url.searchParams.delete('ref');
    targetPath = url.pathname;
  }

  if (canonicalRoute && (legacyRoutes[first] || segments.length > 1 || !url.pathname.endsWith('/'))) {
    targetPath = canonicalForRoute(canonicalRoute);
  } else if (!canonicalRoute) {
    for (const route of routes) {
      if (first.startsWith(route) && monthPattern.test(first.slice(route.length))) {
        targetPath = canonicalForRoute(route);
        break;
      }
    }
    if (monthOnlyPattern.test(first)) {
      targetPath = '/';
    }
  }

  if (!targetPath) return;

  url.pathname = targetPath;
  if (targetPath !== window.location.pathname || url.search !== window.location.search || url.hostname !== window.location.hostname || url.protocol !== window.location.protocol) {
    window.location.replace(url.toString());
  }
})();
