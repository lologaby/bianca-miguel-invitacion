import type { PrivateEvent } from '../types/invitation';
import './venue-map.css';

/**
 * Where the day happens — both places, each on its own map: the church for the
 * ceremony and the wine cellar for the reception.
 *
 * Follows the pattern from the reference site (bodaenelsunset.com): an embedded
 * Google map, desaturated so it sits inside the palette instead of shouting in
 * Google's own colours, in a rounded frame with a single directions action
 * floating over it. It regains its colour on hover, which is the whole trick —
 * the map is decoration until the moment someone actually needs it.
 *
 * Uses the search-query embed, so no API key and no coordinates to keep in sync.
 * Every venue string comes from the event data, which on a real deployment is
 * PRIVATE_EVENT_JSON on the host — the real places are never in this repository,
 * and the demo build carries placeholders.
 *
 * referrerPolicy is `origin`, not `no-referrer`: Google refuses to render the
 * embed with no referrer at all, but `origin` sends only the scheme and host —
 * never the path or query, so a guest's invite token stays out of Google's logs.
 */
export function VenueMap({ event }: { event: PrivateEvent }) {
  const places = [
    { id: 'ceremonia', label: 'La ceremonia', place: event.ceremony },
    { id: 'recepcion', label: 'La recepción', place: event.reception },
  ].filter(({ place }) => place?.name);

  return (
    <section className="venue-map-v28" id="lugar" aria-labelledby="venue-map-title">
      <header>
        <h2 id="venue-map-title">Dónde</h2>
      </header>

      <div className="venue-map-places">
        {places.map(({ id, label, place }) => {
          const where = ('city' in place ? place.city : undefined) ?? ('note' in place ? place.note : undefined) ?? '';
          const query = where ? `${place.name}, ${where}` : place.name;
          // z=16 rather than 15: a tighter frame carries fewer unrelated pins and road shields
          const embed = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
          const directions = place.mapsUrl && place.mapsUrl !== '#'
            ? place.mapsUrl
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

          return (
            <article className="venue-map-place" key={id}>
              <p className="venue-map-label">{label}</p>
              <p className="venue-map-address">{place.name}{where ? <> · {where}</> : null}</p>

              <div className="venue-map-frame">
                {/*
                  Sits behind the map. If Google's embed is blocked — a strict
                  corporate network, a content blocker, an old browser — the guest
                  still sees the venue and the directions link, not an empty box.
                */}
                <div className="venue-map-fallback" aria-hidden="true">
                  <span>{where}</span>
                  <strong>{place.name}</strong>
                </div>
                <iframe
                  className="venue-map-embed"
                  title={`Mapa de ${place.name}`}
                  src={embed}
                  loading="lazy"
                  referrerPolicy="origin"
                />
                {/*
                  Our own mark on the venue. Google's query embed drops no pin, so
                  the frame arrived with no indication of which building anyone was
                  looking at. The embed centres on the match, so centre is the place.
                */}
                <span className="venue-map-pin" aria-hidden="true" />
              </div>

              {/*
                Below the frame, not floating inside it: at the bottom centre it
                landed on Google's attribution strip, logo showing through.
              */}
              <a className="venue-map-action" href={directions} target="_blank" rel="noreferrer">
                Cómo llegar<span aria-hidden="true">↗</span>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
