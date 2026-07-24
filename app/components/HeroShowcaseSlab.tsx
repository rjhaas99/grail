import Image from "next/image";
import type { CSSProperties } from "react";

type HeroShowcaseSlabProps = {
  imageUrl: string | null;
  title: string;
  width: string;
  height: string;
  prominence?: "center" | "side";
  className?: string;
};

export default function HeroShowcaseSlab({
  imageUrl,
  title,
  width,
  height,
  prominence = "side",
  className,
}: HeroShowcaseSlabProps) {
  const style = {
    "--hero-showcase-width": width,
    "--hero-showcase-height": height,
  } as CSSProperties;

  return (
    <div
      className={[
        "hero-showcase-slab",
        `hero-showcase-slab-${prominence}`,
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-label={`GRAIL featured showcase for ${title}`}
    >
      <style>{heroShowcaseSlabStyles}</style>

      <span className="hero-showcase-outer-edge" aria-hidden="true" />
      <span className="hero-showcase-inner-bevel" aria-hidden="true" />
      <span className="hero-showcase-glass-sheen" aria-hidden="true" />

      <div className="hero-showcase-nameplate" aria-hidden="true">
        <span>GRAIL FEATURED</span>
      </div>

      <div className="hero-showcase-image-bay">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            sizes={width}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span className="hero-showcase-empty">Photo pending</span>
        )}
      </div>
    </div>
  );
}

const heroShowcaseSlabStyles = `
  .hero-showcase-slab {
    --hero-showcase-radius: 28px;
    --hero-showcase-inset: 15px;
    --hero-showcase-nameplate-height: 38px;
    --hero-showcase-nameplate-top: 12px;
    --hero-showcase-image-top: 60px;
    --hero-showcase-image-bottom: 15px;
    --hero-showcase-nameplate-font: 10px;
    position: relative;
    width: var(--hero-showcase-width);
    height: var(--hero-showcase-height);
    border-radius: var(--hero-showcase-radius);
    isolation: isolate;
    overflow: visible;
    background:
      linear-gradient(142deg, rgba(255,255,255,0.28), rgba(255,255,255,0.07) 19%, rgba(10,11,13,0.66) 48%, rgba(221,176,101,0.12) 100%),
      linear-gradient(180deg, rgba(38,40,44,0.92), rgba(9,10,12,0.86));
    border: 1px solid rgba(231,222,208,0.26);
    outline: 1px solid rgba(255,220,170,0.18);
    box-shadow:
      0 45px 70px rgba(0,0,0,.45),
      0 18px 30px rgba(0,0,0,.30),
      inset 0 1px 0 rgba(255,255,255,0.30),
      inset 0 -1px 0 rgba(0,0,0,0.58);
  }

  .hero-showcase-slab-center {
    --hero-showcase-radius: 30px;
    --hero-showcase-inset: 17px;
    --hero-showcase-nameplate-height: 42px;
    --hero-showcase-nameplate-top: 13px;
    --hero-showcase-image-top: 66px;
    --hero-showcase-image-bottom: 17px;
    --hero-showcase-nameplate-font: 10px;
  }

  .hero-showcase-slab-side {
    --hero-showcase-radius: 24px;
    --hero-showcase-inset: 13px;
    --hero-showcase-nameplate-height: 32px;
    --hero-showcase-nameplate-top: 10px;
    --hero-showcase-image-top: 50px;
    --hero-showcase-image-bottom: 13px;
    --hero-showcase-nameplate-font: 8px;
  }

  .hero-showcase-slab::before {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -19px;
    width: 72%;
    height: 16px;
    transform: translateX(-50%) scaleX(.82);
    border-radius: 999px;
    background: rgba(0,0,0,.72);
    filter: blur(16px);
    opacity: .30;
    pointer-events: none;
    z-index: -2;
  }

  .hero-showcase-slab::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -29px;
    width: 72%;
    height: 28px;
    transform: translateX(-50%);
    background: linear-gradient(
      to bottom,
      rgba(255,215,120,.20),
      transparent
    );
    opacity: .08;
    pointer-events: none;
    z-index: -2;
  }

  .hero-showcase-outer-edge,
  .hero-showcase-inner-bevel,
  .hero-showcase-glass-sheen {
    position: absolute;
    pointer-events: none;
    border-radius: inherit;
  }

  .hero-showcase-outer-edge {
    inset: 0;
    z-index: 1;
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.12),
      inset 0 0 24px rgba(255,255,255,0.05),
      inset 0 -18px 34px rgba(0,0,0,0.34);
  }

  .hero-showcase-inner-bevel {
    inset: 7px;
    z-index: 2;
    border: 1px solid rgba(231,222,208,0.16);
    background:
      linear-gradient(135deg, rgba(255,255,255,0.11), transparent 20%, transparent 78%, rgba(214,171,103,0.08));
    mix-blend-mode: screen;
    opacity: 0.72;
  }

  .hero-showcase-glass-sheen {
    inset: 1px;
    z-index: 5;
    overflow: hidden;
  }

  .hero-showcase-glass-sheen::before {
    content: "";
    position: absolute;
    left: -18%;
    top: 0;
    width: 52%;
    height: 100%;
    transform: skewX(-18deg);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent);
    opacity: 0.28;
  }

  .hero-showcase-nameplate {
    position: absolute;
    left: var(--hero-showcase-inset);
    right: var(--hero-showcase-inset);
    top: var(--hero-showcase-nameplate-top);
    height: var(--hero-showcase-nameplate-height);
    z-index: 4;
    border-radius: calc(var(--hero-showcase-radius) * 0.45);
    border: 1px solid rgba(231,222,208,0.20);
    background:
      linear-gradient(120deg, rgba(231,222,208,0.18), rgba(10,11,13,0.76) 32%, rgba(5,6,8,0.84) 70%, rgba(214,171,103,0.15)),
      rgba(8,9,11,0.82);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.18),
      inset 0 -1px 0 rgba(0,0,0,0.46);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-showcase-nameplate span {
    color: rgba(231,222,208,0.86);
    font-size: var(--hero-showcase-nameplate-font);
    line-height: 1;
    font-weight: 900;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    text-shadow: 0 1px 12px rgba(0,0,0,0.72);
  }

  .hero-showcase-image-bay {
    position: absolute;
    left: var(--hero-showcase-inset);
    right: var(--hero-showcase-inset);
    top: var(--hero-showcase-image-top);
    bottom: var(--hero-showcase-image-bottom);
    z-index: 3;
    border-radius: calc(var(--hero-showcase-radius) * 0.48);
    border: 1px solid rgba(231,222,208,0.13);
    background:
      radial-gradient(circle at 50% 8%, rgba(255,255,255,0.08), transparent 34%),
      linear-gradient(180deg, rgba(0,0,0,0.16), rgba(0,0,0,0.36));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.12),
      inset 0 0 20px rgba(0,0,0,0.34);
    overflow: hidden;
  }

  .hero-showcase-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(231,222,208,0.62);
    font-size: 10px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-align: center;
    text-transform: uppercase;
  }
`;
