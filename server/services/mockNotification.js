/**
 * Mock Notification Service
 * Simulates a notification engine with channels and delivery.
 */

let notifState = getDefaultState();

function getDefaultState() {
  return {
    notifications: [],
    channels: {
      inApp: { enabled: true, count: 0 },
      email: { enabled: true, count: 0 },
      sms: { enabled: true, count: 0 },
      push: { enabled: true, count: 0 },
      slack: { enabled: false, count: 0 },
    },
    subscriptions: [
      { userId: 'U001', channels: ['inApp', 'email'], preferences: { marketing: true, alerts: true } },
      { userId: 'U002', channels: ['inApp', 'email', 'sms'], preferences: { marketing: true, alerts: true } },
      { userId: 'U003', channels: ['inApp'], preferences: { marketing: false, alerts: true } },
    ],
  };
}

export function getState() {
  return JSON.parse(JSON.stringify(notifState));
}

export function resetState() {
  notifState = getDefaultState();
  return getState();
}

export function sendNotification({ title, message, type, channel, recipients, priority }) {
  const notification = {
    id: `NOTIF${String(notifState.notifications.length + 1).padStart(4, '0')}`,
    title,
    message,
    type: type || 'info',
    channel: channel || 'inApp',
    recipients: recipients || ['all'],
    priority: priority || 'normal',
    status: 'delivered',
    sentAt: new Date().toISOString(),
    readBy: [],
  };
  notifState.notifications.push(notification);
  if (notifState.channels[notification.channel]) {
    notifState.channels[notification.channel].count++;
  }
  return { success: true, notification };
}

export function sendBulkNotification({ title, message, type, channels, priority }) {
  const results = (channels || ['inApp']).map(channel =>
    sendNotification({ title, message, type, channel, recipients: ['all'], priority })
  );
  return {
    success: true,
    totalSent: results.length,
    notifications: results.map(r => r.notification),
  };
}

export default {
  getState,
  resetState,
  sendNotification,
  sendBulkNotification,
};
