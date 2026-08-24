export { LineIcon, VineRule, WaxSeal } from './VisualAssetsPolishedComplete';

export function HeroStillLife() {
  return (
    <picture className="client-cover-art client-cover-art--idea" aria-hidden="true">
      <source media="(max-width: 620px)" srcSet={`${import.meta.env.BASE_URL}private-assets/cover-art-470.webp`} />
      <img
        src={`${import.meta.env.BASE_URL}private-assets/cover-art.webp`}
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
