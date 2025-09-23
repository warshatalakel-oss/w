// Import Babel standalone script. This will be available as `Babel` in the global scope.
importScripts("https://unpkg.com/@babel/standalone@7/babel.min.js");

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept only .ts and .tsx files from the same origin
  if (url.origin === self.origin && (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) {
            return response;
          }

          return response.text().then((sourceCode) => {
            // Transpile the code using Babel
            try {
              const transpiledCode = Babel.transform(sourceCode, {
                presets: ["react", "typescript"],
                filename: url.pathname // Important for sourcemaps and error messages
              }).code;
              
              const headers = new Headers(response.headers);
              headers.set('Content-Type', 'application/javascript; charset=utf-8');
              
              // Return a new Response with the transpiled code and correct headers
              return new Response(transpiledCode, { headers });
            } catch (e) {
                console.error('Babel transformation failed in Service Worker for:', url.pathname, e);
                // Return an error response if transpilation fails
                return new Response(`Babel transformation failed in ${url.pathname}:\n${e.message}`, { 
                  status: 500,
                  headers: { 'Content-Type': 'text/plain' }
                });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker fetch error:', error);
          return new Response(`Service Worker fetch error for ${url.pathname}: ${error}`, { status: 500 });
        })
    );
  }
});

// Service worker lifecycle events
self.addEventListener('install', event => {
  // Activate new service worker as soon as it's installed
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  // Take control of all clients as soon as the service worker is activated
  event.waitUntil(self.clients.claim());
});
