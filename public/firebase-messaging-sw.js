/* global self, clients, importScripts, firebase */

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

// Initialize Firebase Messaging for background notifications
const messaging = firebase.messaging();

// Handle background FCM messages and display rich notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 📨 Received background FCM message:', payload);
  
  // Extract notification details
  const notificationTitle = payload.notification?.title || 'Budget App';
  const notificationBody = payload.notification?.body || 'New notification';
  
  console.log('[firebase-messaging-sw.js] 🔔 Displaying notification:', {
    title: notificationTitle,
    body: notificationBody
  });
  
  if (payload.data) {
    console.log('[firebase-messaging-sw.js] 📦 Data payload:', payload.data);
  }
  
  // Create rich notification options
  const notificationOptions = {
    body: notificationBody,
    data: payload.data || {},
    requireInteraction: false,
    silent: false,
    tag: payload.data?.expenseId ? `expense-${payload.data.expenseId}` : 'budget-notification',
    timestamp: Date.now(),
    vibrate: [200, 100, 200]
  };
  
  // Show the custom notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

console.log('[firebase-messaging-sw.js] Firebase Messaging initialized for background notifications');

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
