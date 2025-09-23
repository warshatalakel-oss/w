
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if the request is for a .ts or .tsx file
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the fetch fails, just return the failed response
          if (!response.ok) {
            return response;
          }

          // If successful, read the response body as text
          return response.text().then((text) => {
            // Create new headers and set the correct Content-Type
            const headers = new Headers(response.headers);
            headers.set('Content-Type', 'application/javascript; charset=utf-8');
            
            // Return a new Response with the original text but the corrected headers
            return new Response(text, { headers });
          });
        })
        .catch((error) => {
          // Handle network errors
          console.error('Service Worker fetch error:', error);
          return new Response(`Service Worker fetch error: ${error}`, { status: 500 });
        })
    );
  }
});

// Basic service worker lifecycle
self.addEventListener('install', event => {
  // Skips the waiting phase to activate the new service worker immediately.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  // Takes control of uncontrolled clients (tabs) immediately.
  event.waitUntil(self.clients.claim());
});
