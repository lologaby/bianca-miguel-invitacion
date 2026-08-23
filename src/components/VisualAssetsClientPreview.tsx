export { LineIcon, VineRule, WaxSeal } from './VisualAssetsPolishedComplete';
import './grape-polish.css';

const privateAsset = (name: string) => `${import.meta.env.BASE_URL}private-assets/${name}`;

export function HeroStillLife() {
  return (
    <picture className="client-cover-art" aria-hidden="true">
      <img
        src={privateAsset('cover-art.png')}
        alt=""
        width="941"
        height="1672"
        loading="eager"
        decoding="async"
      />
    </picture>
  );
}
