const test = require('node:test');
const assert = require('node:assert/strict');

function fakeElement() {
  return {
    nodeType: 1,
    closest: () => null,
    hasAttribute: () => false,
  };
}

function runInit(search, navigatorLanguage = 'ru-RU') {
  const saved = new Map();
  const keys = [
    'document',
    'location',
    'localStorage',
    'navigator',
    'NodeFilter',
    'CustomEvent',
    'dispatchEvent',
    'MutationObserver',
  ];
  for (const key of keys) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }

  let cookie = '';
  const stored = new Map();
  const documentElement = fakeElement();
  documentElement.lang = '';

  Object.defineProperties(globalThis, {
    document: {
      configurable: true,
      value: {
        documentElement,
        head: fakeElement(),
        body: fakeElement(),
        querySelector: () => null,
        querySelectorAll: () => [],
        createTreeWalker: () => ({ nextNode: () => null }),
        get cookie() { return cookie; },
        set cookie(value) { cookie = value; },
      },
    },
    location: {
      configurable: true,
      value: {
        search,
        hostname: 'outreachos.pro',
        href: `https://outreachos.pro/${search}`,
      },
    },
    localStorage: {
      configurable: true,
      value: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
      },
    },
    navigator: { configurable: true, value: { language: navigatorLanguage } },
    NodeFilter: { configurable: true, value: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 } },
    CustomEvent: {
      configurable: true,
      value: class CustomEvent {
        constructor(type, options) {
          this.type = type;
          this.detail = options?.detail;
        }
      },
    },
    dispatchEvent: { configurable: true, value: () => true },
    MutationObserver: { configurable: true, value: undefined },
  });

  const runtimePath = require.resolve('../i18n.js');
  delete require.cache[runtimePath];
  const runtime = require(runtimePath);

  try {
    runtime.init();
    return {
      locale: documentElement.lang,
      stored: stored.get('outreachos:client-locale') ?? null,
      cookie,
    };
  } finally {
    delete require.cache[runtimePath];
    for (const key of keys) {
      const descriptor = saved.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('special language links persist the locale for the app subdomain', () => {
  for (const locale of ['en', 'es']) {
    const result = runInit(`?lang=${locale}`);
    assert.equal(result.locale, locale);
    assert.equal(result.stored, locale);
    assert.match(result.cookie, new RegExp(`outreachos-client-locale=${locale}`));
    assert.match(result.cookie, /Domain=\.outreachos\.pro/);
  }
});

test('unsupported language links fall back to and persist Russian', () => {
  const result = runInit('?lang=de', 'en-US');
  assert.equal(result.locale, 'ru');
  assert.equal(result.stored, 'ru');
  assert.match(result.cookie, /outreachos-client-locale=ru/);
});
