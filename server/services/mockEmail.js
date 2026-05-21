/**
 * Mock Email/SMS Service
 * Simulates sending emails and SMS notifications.
 */

let emailState = getDefaultState();

function getDefaultState() {
  return {
    sentEmails: [],
    sentSMS: [],
    drafts: [],
    templates: [
      { id: 'TPL001', name: 'Discount Campaign', subject: 'Exclusive Offer Just For You!', type: 'marketing' },
      { id: 'TPL002', name: 'Price Update Notice', subject: 'Important: Pricing Update', type: 'transactional' },
      { id: 'TPL003', name: 'Order Confirmation', subject: 'Your Order Has Been Confirmed', type: 'transactional' },
      { id: 'TPL004', name: 'Re-engagement', subject: 'We Miss You!', type: 'marketing' },
      { id: 'TPL005', name: 'Delivery Update', subject: 'Your Delivery Status Update', type: 'notification' },
    ],
    stats: {
      totalSent: 0,
      totalDelivered: 0,
      openRate: 0,
      clickRate: 0,
    }
  };
}

export function getState() {
  return JSON.parse(JSON.stringify(emailState));
}

export function resetState() {
  emailState = getDefaultState();
  return getState();
}

export function sendEmail({ to, subject, body, templateId, tags }) {
  const email = {
    id: `EMAIL${String(emailState.sentEmails.length + 1).padStart(4, '0')}`,
    to,
    subject,
    body,
    templateId: templateId || null,
    tags: tags || [],
    status: 'delivered',
    sentAt: new Date().toISOString(),
    deliveredAt: new Date(Date.now() + 2000).toISOString(),
    opened: false,
    clicked: false,
  };
  emailState.sentEmails.push(email);
  emailState.stats.totalSent++;
  emailState.stats.totalDelivered++;
  emailState.stats.openRate = Math.min(0.35, emailState.stats.openRate + 0.02);
  return { success: true, email };
}

export function sendBulkEmail({ recipients, subject, body, templateId, tags }) {
  const results = recipients.map(to => sendEmail({ to, subject, body, templateId, tags }));
  return {
    success: true,
    totalSent: results.length,
    emails: results.map(r => r.email),
  };
}

export function sendSMS({ to, message, type }) {
  const sms = {
    id: `SMS${String(emailState.sentSMS.length + 1).padStart(4, '0')}`,
    to,
    message,
    type: type || 'notification',
    status: 'delivered',
    sentAt: new Date().toISOString(),
  };
  emailState.sentSMS.push(sms);
  return { success: true, sms };
}

export function createDraft({ subject, body, templateId, audience }) {
  const draft = {
    id: `DRAFT${String(emailState.drafts.length + 1).padStart(3, '0')}`,
    subject,
    body,
    templateId,
    audience,
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
  emailState.drafts.push(draft);
  return { success: true, draft };
}

export default {
  getState,
  resetState,
  sendEmail,
  sendBulkEmail,
  sendSMS,
  createDraft,
};
