export { LineIcon, VineRule, WaxSeal } from './VisualAssetsPolishedComplete';
import './grape-polish.css';

const privateAsset = (name: string) => `${import.meta.env.BASE_URL}private-assets/${name}`;

export function HeroStillLife() {
  return (
    <picture className="client-cover-art" aria-hidden="true">
      <img
        src={privateAsset('cover-art.webp')}
        srcSet={`${privateAsset('cover-art-470.webp')} 470w, ${privateAsset('cover-art.webp')} 941w`}
        sizes="(max-width: 900px) 100vw, 50vw"
        alt=""
        width="941"
        height="1672"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}
