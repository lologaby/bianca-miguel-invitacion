import { useState } from 'react';
import type { PrivateEvent } from '../types/invitation';

/**
 * "Añadir al calendario", built in the browser from the invitation already on
 * screen.
 *
 * The reference site (bodaenelsunset.com) ships a static /calendar.ics, but this
 * invitation is private: the venue is only shown after a guest signs in, so a
 * public file would hand out the address to anyone who guessed the URL. Building
 * the file client-side from data the guest already has keeps the gate intact.
 */

/** RFC 5545 text escaping: commas, semicolons, backslashes and newlines. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** RFC 5545 requires lines of at most 75 octets, continued with a leading space. */
function foldLine(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let width = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    // continuation lines carry a leading space, so they get one octet less
    if (width + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = '';
      width = 0;
    }
    current += char;
    width += size;
  }
  if (current) out.push(current);
  return out.join('\r\n ');
}

function icsTimestamp(value: string | Date) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildIcs(event: PrivateEvent) {
  const place = [event.ceremony.name, event.ceremony.city].filter(Boolean).join(', ');
  const summary = `Boda de ${event.couple.first} y ${event.couple.second}`;
  const description = [
    `Ceremonia: ${event.ceremony.timeLabel ?? event.timeLabel} · ${event.ceremony.name}`,
    `Recepción: ${event.reception.timeLabel ?? 'Por confirmar'} · ${event.reception.name}`,
    event.dressCode ? `Vestimenta: ${event.dressCode.label}` : '',
  ].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bianca & Miguel//invitacion//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:bianca-miguel-${icsTimestamp(event.start)}@invitacion`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(event.start)}`,
    `DTEND:${icsTimestamp(event.end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `LOCATION:${escapeText(place)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n');
}

export function AddToCalendar({ event }: { event: PrivateEvent }) {
  const [saved, setSaved] = useState(false);

  function download() {
    const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boda-${event.couple.first.toLowerCase()}-${event.couple.second.toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // give the browser a moment to start the download before dropping the blob
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    setSaved(true);
  }

  return (
    <button className="calendar-save" type="button" onClick={download}>
      <span>{saved ? 'Descargado' : 'Añadir al calendario'}</span>
      <b aria-hidden="true">{saved ? '✓' : '↓'}</b>
    </button>
  );
}
