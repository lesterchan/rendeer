// Require
const { URL } = require('url');
const md5 = require('md5');
const MemcachePlus = require('memcache-plus');
const puppeteer = require('puppeteer');
const pTimeout = require('p-timeout');
const config = require('./config.json');

// Setup memcache client
const { MEMCACHE_HOSTS, USE_MEMCACHE } = process.env;
let memcacheClient;
if (USE_MEMCACHE) {
  memcacheClient = new MemcachePlus({
    hosts: MEMCACHE_HOSTS.split(','),
    autodiscover: true,
  });
}

// Setup in-memory cache
const cache = new Map();

// Setup whitelisted URLs
const whitelistRegExp = new RegExp(`(${config.whitelist.join('|')})`, 'i');

// Variables
let browser;

/**
 * Fetch content from a URL
 *
 * @param {string} pageURL Page URL
 *
 * @return {object} Page Content with Meta
 */
const fetchContent = async (pageURL) => {
  // Launch browser
  if (!browser) {
    console.log('Launch browser!');
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  // Open page
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(config.page.timeout * 1000);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    const resourceType = request.resourceType();

    // Skip data URIs
    if (/^data:/i.test(url)) {
      request.continue();
      return;
    }

    // Ensure that only whitelisted URLs and GET method is allowed
    if (!whitelistRegExp.test(url) || method.toLowerCase() !== 'get' || /^(font|media|websocket|manifest)$/i.test(resourceType)) {
      request.abort();
    } else if (resourceType.toLowerCase() === 'image') {
      request.continue({
        url: 'data:image/gif;base64,R0lGODlhAQABAID/AP///wAAACwAAAAAAQABAAACAkQBADs=',
      });
    } else {
      request.continue();
    }
  });

  // Fetch page
  console.log(`Fetch: ${pageURL}`);
  await page.goto(pageURL, {
    waitUntil: 'networkidle0',
  });

  // Evaluate page
  const meta = await page.evaluate(() => {
    // Remove scripts except JSON-LD
    const scripts = document.querySelectorAll('script:not([type="application/ld+json"])');
    scripts.forEach((s) => s.parentNode.removeChild(s));

    // Remove import tags
    const imports = document.querySelectorAll('link[rel=import]');
    imports.forEach((i) => i.parentNode.removeChild(i));

    const { origin, pathname } = location;
    // Inject <base> for loading relative resources
    if (!document.querySelector('base')) {
      const base = document.createElement('base');
      base.href = origin + pathname;
      document.head.appendChild(base);
    }

    // Try to fix absolute paths
    const absEls = document.querySelectorAll('link[href^="/"], script[src^="/"], img[src^="/"]');
    absEls.forEach((el) => {
      const href = el.getAttribute('href');
      const src = el.getAttribute('src');
      if (src && /^\/[^/]/i.test(src)) {
        el.src = origin + src;
      } else if (href && /^\/[^/]/i.test(href)) {
        el.href = origin + href;
      }
    });

    // Respect Prerender status code
    const $statusCode = document.querySelector('meta[name="prerender-status-code"]');
    const statusCode = $statusCode && parseInt($statusCode.content, 10);

    // Respect Prerender headers
    const $headers = document.querySelectorAll('meta[name="prerender-header"]');
    const headers = {};
    if ($headers.length) {
      const headersList = $headers.map(($header) => $header.content.match(/^\s*([^:]+)\s*:\s*([^:]+)/i));
      headersList.forEach((h) => {
        headers[h[0]] = h[1];
      });
    }

    return {
      statusCode,
      headers,
    };
  });

  // Get page content
  let content = await pTimeout(page.content(), config.render.timeout * 1000, 'Render timed out');

  // Delete cookies
  page.cookies().then((cookies) => {
    const cookieNames = cookies.map((cookie) => ({ name: cookie.name }));
    return page.deleteCookie(...cookieNames).then(() => {
      // Close page
      page.close();
    });
  });

  // Remove comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  return { content, meta };
};

require('http').createServer(async (req, res) => {
  // AppEngine internal URLs
  if (req.url.substr(0, 4) === '/_ah') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Root URL
  if (req.url === '/') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': `public,max-age=${config.cacheControl.maxAge}`,
    });
    res.end();
    return;
  }

  // Favicon or robots.txt
  if (req.url === '/favicon.ico' || req.url === '/robots.txt') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Clear cache
  if (USE_MEMCACHE && req.url.substr(0, 7) === '/clear/') {
    const clearCacheUrl = req.url.replace(/(\/^)/, '').substr(7) || '';
    if (clearCacheUrl) {
      const clearCache = await memcacheClient.delete(md5(clearCacheUrl));
      if (clearCache) {
        console.log(`[Memcached] Clear: ${clearCacheUrl}`);
      }
    }
    res.writeHead(200);
    res.end();
    return;
  }

  const requestUrl = req.url.replace(/(\/^)/, '').substr(1) || '';

  // Missing URL
  if (!requestUrl) {
    res.writeHead(400, {
      'content-type': 'text/plain',
    });
    res.end('Oops. Something is wrong. Missing URL.');
    return;
  }

  let pageURL;

  try {
    const u = new URL(decodeURIComponent(requestUrl));
    pageURL = u.origin + decodeURIComponent(u.pathname);

    let cacheKey;
    let c;

    // Check memcache
    if (USE_MEMCACHE) {
      cacheKey = md5(pageURL);
      c = await memcacheClient.get(cacheKey);
      if (c) {
        console.log(`[Memcached] Get: ${cacheKey} ${pageURL}`);
      }
    }

    if (!c) {
      let cPromise = cache.get(pageURL);
      if (!cPromise) {
        cPromise = fetchContent(pageURL);
        cache.set(pageURL, cPromise);
      }
      c = await cPromise;

      const isNot2xx = /^[^2]\d\d$/.test(c.meta.statusCode);
      if (isNot2xx) {
        console.log(`[Localcache] Delete: ${pageURL}`);
        cache.delete(pageURL);
      }

      // Cache to memcache
      if (USE_MEMCACHE && !isNot2xx) {
        memcacheClient.set(cacheKey, { url: pageURL, ...c }, config.cache.expiry)
          .then(() => {
            console.log(`[Memcached] Set: ${cacheKey} ${pageURL}`);
          })
          .catch((e) => {
            console.log(`[Memcached] Error: ${e.message}`);
          });
      }
    }

    // Output HTML to browser
    const { content, meta = {} } = c;
    res.writeHead(meta.statusCode || 200, Object.assign({
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': `public,max-age=${config.cacheControl.maxAge}`,
    }, meta.headers));
    res.end(content);
  } catch (e) {
    // Log error
    console.error(`Crashed Page: ${pageURL}`);
    console.error(e);

    // Ensure cache of fetchPromise is deleted
    cache.delete(pageURL);

    // Output error
    const { message = '' } = e;
    res.writeHead(400, {
      'content-type': 'text/plain',
    });
    res.end(`Oops. Something is wrong.\n\n${message}`);

    // Handle websocket not opened error
    if (/not opened/i.test(message) && browser) {
      console.error('Web socket failed');
      try {
        // Sometimes it tries to close an already closed browser
        await browser.close();
      } catch (err) {
        console.log(`Chrome could not be killed: ${err.message}`);
      } finally {
        browser = null;
      }
    }
  }
}).listen(process.env.PORT || 3000);

process.on('SIGINT', () => {
  if (browser) {
    browser.close();
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
});
