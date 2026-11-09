// Anti-abus (Cloudflare D1) : nombre de demandes de lien par adresse et par appareil.
// RGPD : seules des empreintes SHA-256 salées sont stockées, jamais l'e-mail ni l'IP,
// et elles sont effacées au bout de 24 h.

export const LIMITS = { perEmail: { max: 3, windowMs: 10 * 60_000 }, perIp: { max: 20, windowMs: 60 * 60_000 }, keepMs: 24 * 3600_000 }

export async function fingerprint(value, salt) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${value}`))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Renvoie le nombre de secondes à attendre si une limite est atteinte, sinon 0 (et enregistre la demande). */
export async function checkAndRecord(db, { email, ip, salt }, now = Date.now()) {
  if (!db) return 0
  const emailHash = await fingerprint(email.toLowerCase(), salt)
  const ipHash = await fingerprint(ip || 'inconnue', salt)
  await db.prepare('DELETE FROM email_requests WHERE created_at < ?').bind(now - LIMITS.keepMs).run()
  const count = async (column, hash, windowMs) => {
    const row = await db.prepare(`SELECT COUNT(*) AS n, MIN(created_at) AS first FROM email_requests WHERE ${column} = ? AND created_at >= ?`).bind(hash, now - windowMs).first()
    return { n: Number(row?.n ?? 0), first: Number(row?.first ?? now) }
  }
  for (const [column, hash, rule] of [['email_hash', emailHash, LIMITS.perEmail], ['ip_hash', ipHash, LIMITS.perIp]]) {
    const { n, first } = await count(column, hash, rule.windowMs)
    if (n >= rule.max) return Math.max(1, Math.ceil((first + rule.windowMs - now) / 1000))
  }
  await db.prepare('INSERT INTO email_requests (email_hash, ip_hash, created_at) VALUES (?, ?, ?)').bind(emailHash, ipHash, now).run()
  return 0
}
