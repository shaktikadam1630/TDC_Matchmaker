/**
 * Mock email provider. It "sends" by logging and returns a message id; the final text is
 * persisted on MatchAction so the UI can show exactly what went out.
 * To go live, implement the same `send()` contract with AWS SES / SendGrid and switch here.
 */
import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

const label = (v) => (v ? String(v).replace(/_/g, ' ') : null);

/** Basic, non-sensitive profile summary appended to every match email. */
export function profileCard(profile) {
  const rows = [
    ['Name', profile.fullName],
    ['Age', profile.age != null ? `${profile.age} years` : null],
    ['Location', [profile.city, profile.country].filter(Boolean).join(', ')],
    ['Height', profile.heightCm ? `${profile.heightCm} cm` : null],
    ['Education', [profile.degree, profile.college].filter(Boolean).join(', ')],
    ['Profession', [profile.designation, profile.company].filter(Boolean).join(' at ')],
    ['Community', [profile.religion, profile.caste].filter(Boolean).join(', ')],
    ['Marital status', label(profile.maritalStatus)],
    ['Languages', profile.languages?.join(', ')],
    ['Diet', label(profile.diet)],
  ];
  return rows.filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`).join('\n');
}

/** Strips control characters / HTML so user-edited text can't smuggle markup into the email. */
export const sanitizeText = (s) =>
  String(s).replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();

export function composeEmail({ subject, body, profile }) {
  return {
    subject: sanitizeText(subject),
    text: `${sanitizeText(body)}\n\n----- Suggested profile -----\n${profileCard(profile)}\n-----------------------------`,
  };
}

export async function sendEmail({ to, subject, text }) {
  const messageId = `mock-${randomUUID()}`;
  logger.info(`[mock-email] to=${to} subject="${subject}" id=${messageId}`);
  return { provider: 'mock', messageId };
}
