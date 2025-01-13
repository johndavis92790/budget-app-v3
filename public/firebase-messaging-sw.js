/* global self, clients */
// Import Firebase scripts for messaging
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBp5gKa6XRrfwN91LKaYpVntnVVSkfK_JY",
  authDomain: "budget-app-v3.firebaseapp.com",
  projectId: "budget-app-v3",
  storageBucket: "budget-app-v3.appspot.com",
  messagingSenderId: "105746768311",
  appId: "1:105746768311:web:fbf3d17496b3c7bf5bc832"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background push notifications
self.addEventListener('push', function (event) {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  if (event.data) {
    // Parse the data payload
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push event data:', data);

    // Notification options
    const options = {
      body: data.data.body || "Default Body 2",
      icon: data.data.icon || '/favicon.ico',
      // Additional options for further customization
      data: {
        url: data.click_action || "/", // Add a URL to open when the notification is clicked
      }
    };

    // Show the notification
    event.waitUntil(
      self.registration.showNotification(data.data.title || "Default Title", options)
    );
  } else {
    console.warn('[firebase-messaging-sw.js] Push event but no data.');
  }
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  const notification = event.notification;
  const actionUrl = notification.data?.url || '/';

  // Close the notification
  notification.close();

  // Open the URL associated with the notification
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === actionUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
