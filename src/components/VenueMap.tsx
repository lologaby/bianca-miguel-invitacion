import type { PrivateEvent } from '../types/invitation';
import './venue-map.css';

/**
 * Where the day happens, on a map.
 *
 * Follows the pattern from the reference site (bodaenelsunset.com): an embedded
 * Google map, desaturated so it sits inside the palette instead of shouting in
 * Google's own colours, in a rounded frame with a single directions action
 * floating over it. It regains its colour on hover, which is the whole trick —
 * the map is decoration until the moment someone actually needs it.
 *
 * Uses the search-query embed, so no API key and no coordinates to keep in sync.
 *
 * referrerPolicy is `origin`, not `no-referrer`: Google refuses to render the
 * embed with no referrer at all, but `origin` sends only the scheme and host —
 * never the path or query, so a guest's invite token stays out of Google's logs.
 */
export function VenueMap({ event }: { event: PrivateEvent }) {
  const query = `${event.reception.name}, ${event.reception.city ?? event.reception.note}`;
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  const directions = event.reception.mapsUrl && event.reception.mapsUrl !== '#'
    ? event.reception.mapsUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <section className="venue-map-v28" id="lugar" aria-labelledby="venue-map-title">
      <header>
        <h2 id="venue-map-title">Dónde</h2>
        <p className="venue-map-address">{event.reception.name} · {event.reception.city ?? event.reception.note}</p>
      </header>

      <div className="venue-map-frame">
        {/*
          Sits behind the map. If Google's embed is blocked — a strict corporate
          network, a content blocker, an old browser — the guest still sees the
          venue and the directions button rather than an empty rectangle.
        */}
        <div className="venue-map-fallback" aria-hidden="true">
          <span>{event.reception.city ?? event.reception.note}</span>
          <strong>{event.reception.name}</strong>
        </div>
        <iframe
          className="venue-map-embed"
          title={`Mapa de ${event.reception.name}`}
          src={embed}
          loading="lazy"
          referrerPolicy="origin"
        />
        <a className="venue-map-action" href={directions} target="_blank" rel="noreferrer">
          Cómo llegar<span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
