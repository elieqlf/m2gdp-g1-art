import { longDay, type Activity } from './activity'

export const activityUrl = (a: Activity) => `${window.location.origin}/#/activite/${encodeURIComponent(a.id)}`
/** Partage natif sur mobile, copie du lien sinon. Renvoie le message à afficher. */
export async function shareActivity(a: Activity): Promise<string> {
  const data = { title: a.title, text: `${a.title} — ${longDay(a.date)}, ${a.placeName}`, url: activityUrl(a) }
  try {
    if (navigator.share) { await navigator.share(data); return '' }
    await navigator.clipboard.writeText(data.url)
    return 'Lien de l’activité copié.'
  } catch (error) {
    return (error as Error)?.name === 'AbortError' ? '' : 'Partage indisponible sur cet appareil.'
  }
}
/** Rappel : fichier .ics importable dans n'importe quel agenda. */
export function downloadReminder(a: Activity) {
  const stamp = (day: string, time: string) => `${day.replaceAll('-', '')}T${time.replace(':', '')}00`
  const escape = (text: string) => text.replace(/[\\,;]/g, m => `\\${m}`).replace(/\n/g, '\\n')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NOVART//Activites//FR', 'BEGIN:VEVENT', `UID:${a.id}@novart`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Paris:${stamp(a.date, a.startTime)}`, `DTEND;TZID=Europe/Paris:${stamp(a.date, a.endTime)}`, `SUMMARY:${escape(a.title)}`, `LOCATION:${escape(`${a.placeName}, ${a.address}`)}`,
    `DESCRIPTION:${escape(`${a.description}\n${activityUrl(a)}`)}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${escape(a.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  link.download = `novart-${a.id}.ics`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
