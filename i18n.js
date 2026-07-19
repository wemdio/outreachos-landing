(function (root, factory) {
  var api = factory(root);
  root.OutreachLandingI18n = api;

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  if (root.document && root.OUTREACHOS_LANDING_TRANSLATIONS) {
    api.init();
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var SUPPORTED = ['ru', 'en', 'es'];
  var STORAGE_KEY = 'outreachos:client-locale';
  var COOKIE_NAME = 'outreachos-client-locale';
  var TRANSLATABLE_ATTRIBUTES = ['alt', 'aria-label', 'placeholder', 'title', 'content'];
  var originalText = new WeakMap();
  var originalAttributes = new WeakMap();
  var activeLocale = 'ru';
  var observer = null;

  function normalizeLocale(value) {
    if (typeof value !== 'string') return 'ru';
    var locale = value.trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED.indexOf(locale) === -1 ? 'ru' : locale;
  }

  function translateText(source, locale, catalogs) {
    if (locale === 'ru' || !source) return null;
    var leading = (source.match(/^\s*/) || [''])[0];
    var trailing = (source.match(/\s*$/) || [''])[0];
    var core = source.slice(leading.length, source.length - trailing.length);
    var normalized = core.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    var catalog = catalogs && catalogs[locale];
    var translation = catalog && catalog[normalized];
    return translation === undefined ? null : leading + translation + trailing;
  }

  function isSkipped(node) {
    var element = node.nodeType === 1 ? node : node.parentElement;
    return Boolean(element && element.closest('[data-i18n-skip]'));
  }

  function rememberText(node, value) {
    var remembered = originalText.get(node);
    if (remembered === undefined || (/\p{Script=Cyrillic}/u.test(value) && value !== remembered)) {
      originalText.set(node, value);
      return value;
    }
    return remembered;
  }

  function applyTextNode(node, locale, catalogs) {
    if (isSkipped(node)) return;
    var current = node.nodeValue || '';
    if (locale === 'ru') {
      var original = originalText.get(node);
      if (original !== undefined && current !== original) node.nodeValue = original;
      originalText.delete(node);
      return;
    }

    var source = rememberText(node, current);
    var translated = translateText(source, locale, catalogs);
    if (translated !== null && translated !== current) node.nodeValue = translated;
  }

  function rememberAttribute(element, attribute, value) {
    var values = originalAttributes.get(element);
    if (!values) {
      values = {};
      originalAttributes.set(element, values);
    }
    if (values[attribute] === undefined || (/\p{Script=Cyrillic}/u.test(value) && value !== values[attribute])) {
      values[attribute] = value;
    }
    return values[attribute];
  }

  function applyAttributes(element, locale, catalogs) {
    if (isSkipped(element)) return;
    for (var i = 0; i < TRANSLATABLE_ATTRIBUTES.length; i += 1) {
      var attribute = TRANSLATABLE_ATTRIBUTES[i];
      if (!element.hasAttribute(attribute)) continue;
      var current = element.getAttribute(attribute) || '';
      var values = originalAttributes.get(element);

      if (locale === 'ru') {
        if (values && values[attribute] !== undefined && current !== values[attribute]) {
          element.setAttribute(attribute, values[attribute]);
        }
        if (values) delete values[attribute];
        continue;
      }

      var source = rememberAttribute(element, attribute, current);
      var translated = translateText(source, locale, catalogs);
      if (translated !== null && translated !== current) element.setAttribute(attribute, translated);
    }
  }

  function applySubtree(target, locale, catalogs) {
    if (!target || isSkipped(target)) return;
    if (target.nodeType === 3) {
      applyTextNode(target, locale, catalogs);
      return;
    }
    if (target.nodeType !== 1 && target.nodeType !== 9) return;

    if (target.nodeType === 1) applyAttributes(target, locale, catalogs);
    var walker = root.document.createTreeWalker(
      target,
      root.NodeFilter.SHOW_ELEMENT | root.NodeFilter.SHOW_TEXT,
    );
    var node = walker.nextNode();
    while (node) {
      if (node.nodeType === 3) applyTextNode(node, locale, catalogs);
      else applyAttributes(node, locale, catalogs);
      node = walker.nextNode();
    }
  }

  function readCookie() {
    var parts = (root.document.cookie || '').split(';');
    for (var i = 0; i < parts.length; i += 1) {
      var pair = parts[i].trim().split('=');
      if (pair.shift() !== COOKIE_NAME) continue;
      return normalizeLocale(decodeURIComponent(pair.join('=')));
    }
    return null;
  }

  function readPreference() {
    var params = new URLSearchParams(root.location.search);
    var query = params.get('lang');
    if (query && SUPPORTED.indexOf(normalizeLocale(query)) !== -1) return normalizeLocale(query);
    try {
      var stored = root.localStorage.getItem(STORAGE_KEY);
      if (stored) return normalizeLocale(stored);
    } catch (error) {}
    return readCookie() || normalizeLocale(root.navigator.language);
  }

  function writePreference(locale) {
    try { root.localStorage.setItem(STORAGE_KEY, locale); } catch (error) {}
    var domain = root.location.hostname.endsWith('outreachos.pro') ? '; Domain=.outreachos.pro' : '';
    root.document.cookie = COOKIE_NAME + '=' + locale + '; Path=/; Max-Age=31536000; SameSite=Lax' + domain;
  }

  function updateControls(locale) {
    var buttons = root.document.querySelectorAll('[data-language-switcher] [data-lang]');
    for (var i = 0; i < buttons.length; i += 1) {
      var selected = buttons[i].getAttribute('data-lang') === locale;
      buttons[i].classList.toggle('is-active', selected);
      buttons[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
  }

  function applyLocale(value, options) {
    var locale = normalizeLocale(value);
    var catalogs = root.OUTREACHOS_LANDING_TRANSLATIONS || {};
    activeLocale = locale;
    root.document.documentElement.lang = locale;
    applySubtree(root.document.head, locale, catalogs);
    applySubtree(root.document.body, locale, catalogs);
    updateControls(locale);

    if (!options || options.persist !== false) writePreference(locale);
    root.dispatchEvent(new CustomEvent('outreachos:locale-change', { detail: { locale: locale } }));
    return locale;
  }

  function bindControls() {
    var switcher = root.document.querySelector('[data-language-switcher]');
    if (!switcher || switcher.getAttribute('data-i18n-bound') === 'true') return;
    switcher.setAttribute('data-i18n-bound', 'true');
    switcher.addEventListener('click', function (event) {
      var button = event.target.closest('[data-lang]');
      if (!button) return;
      var locale = applyLocale(button.getAttribute('data-lang'));
      var url = new URL(root.location.href);
      url.searchParams.set('lang', locale);
      root.history.replaceState({}, '', url.pathname + url.search + url.hash);
    });
  }

  function observeChanges() {
    if (observer || !root.MutationObserver) return;
    observer = new MutationObserver(function (mutations) {
      var catalogs = root.OUTREACHOS_LANDING_TRANSLATIONS || {};
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];
        if (mutation.type === 'characterData') {
          applyTextNode(mutation.target, activeLocale, catalogs);
        } else if (mutation.type === 'attributes') {
          applyAttributes(mutation.target, activeLocale, catalogs);
        } else {
          for (var j = 0; j < mutation.addedNodes.length; j += 1) {
            applySubtree(mutation.addedNodes[j], activeLocale, catalogs);
          }
        }
      }
    });
    observer.observe(root.document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });
  }

  function init() {
    bindControls();
    applyLocale(readPreference());
    observeChanges();
  }

  return {
    init: init,
    applyLocale: applyLocale,
    normalizeLocale: normalizeLocale,
    translateText: translateText,
  };
});
