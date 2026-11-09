import { UpstreamError } from './google.js'

/** Envoi transactionnel par l'API Brevo (le SMTP Brevo du cours, en HTTP). */
export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.BREVO_API_KEY || !env.SENDER_EMAIL) throw new UpstreamError('Brevo non configuré', 503)
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: env.SENDER_NAME || 'NOVART', email: env.SENDER_EMAIL },
      to: [{ email: to }],
      subject, htmlContent: html, textContent: text,
      tags: ['connexion'],
    }),
  })
  if (!response.ok) throw new UpstreamError(`Brevo a refusé l’envoi (${response.status})`, response.status)
  return (await response.json().catch(() => ({}))).messageId ?? ''
}
