// E-mail de connexion NOVART : texte validé par le directeur artistique (09/11), tutoiement.

const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const RED = '#DA0B19'
const INK = '#545454'
const CREAM = '#FFFEF1'

export const SUBJECT = 'Ton lien sécurisé pour accéder à NOVART'

export function signInEmail(link, appUrl = 'https://novart-app.web.app') {
  const safeLink = escape(link)
  const logo = `${escape(appUrl.replace(/\/$/, ''))}/images/novart-logo-primary.png`
  const text = [
    'Voici ton lien sécurisé pour accéder à NOVART :',
    link,
    '',
    'Si c’est ta première visite, tu pourras créer ton profil après connexion. Si tu as déjà un compte, ce lien te permettra de te connecter.',
    '',
    'Ce lien est personnel. Si tu n’as pas demandé cet e-mail, tu peux l’ignorer.',
    'À bientôt,',
    'L’équipe NOVART',
  ].join('\n')
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Poppins,Helvetica,Arial,sans-serif;color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;">Ton lien pour accéder à NOVART, valable pour une seule connexion.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;">
        <tr><td align="center" style="padding:32px 32px 8px;">
          <img src="${logo}" width="120" alt="NOVART" style="display:block;width:120px;height:auto;border:0;color:${RED};font-size:28px;font-weight:700;">
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.6;">
          <p style="margin:0 0 20px;">Voici ton lien sécurisé pour accéder à NOVART :</p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 24px;">
          <a href="${safeLink}" style="display:inline-block;padding:14px 28px;border-radius:14px;background:${RED};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Accéder à NOVART</a>
        </td></tr>
        <tr><td style="padding:0 32px;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 16px;">Si c’est ta première visite, tu pourras créer ton profil après connexion. Si tu as déjà un compte, ce lien te permettra de te connecter.</p>
          <p style="margin:0 0 16px;">Ce lien est personnel. Si tu n’as pas demandé cet e-mail, tu peux l’ignorer.</p>
          <p style="margin:0 0 24px;">À bientôt,<br>L’équipe NOVART</p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #f0e6e6;font-size:12px;line-height:1.5;color:#8a8a8a;">
          Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :<br>
          <a href="${safeLink}" style="color:${RED};word-break:break-all;">${safeLink}</a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8a8a8a;">NOVART · L’art se crée ensemble, à Lyon.</p>
    </td></tr>
  </table>
</body></html>`
  return { subject: SUBJECT, html, text }
}
