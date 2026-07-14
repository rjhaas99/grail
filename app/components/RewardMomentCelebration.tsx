"use client";

import type { CollectorMomentBundle } from "../lib/collectorMoments";

export default function RewardMomentCelebration({
  bundle,
}: {
  bundle: CollectorMomentBundle | null;
}) {
  if (!bundle) {
    return null;
  }

  return (
    <div className="reward-moment-layer">
      <style>{rewardMomentStyles}</style>
      <section
        className="reward-moment-card"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={bundle.eyebrow}
      >
        <span className="reward-moment-coin" aria-hidden="true" />
        <span className="reward-moment-eyebrow">{bundle.eyebrow}</span>
        <h2>{bundle.title}</h2>

        <div className="reward-moment-values">
          {bundle.primaryText ? <strong>{bundle.primaryText}</strong> : null}
          {bundle.secondaryText ? <span>{bundle.secondaryText}</span> : null}
        </div>

        {bundle.storyLines.length > 0 ? (
          <ul className="reward-moment-bonuses">
            {bundle.storyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        <p>{bundle.footer}</p>
      </section>
    </div>
  );
}

const rewardMomentStyles = `
  .reward-moment-layer {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(0,0,0,0.34);
    backdrop-filter: blur(10px);
    animation: rewardMomentLayerIn 260ms ease both, rewardMomentLayerOut 420ms ease 2380ms forwards;
    pointer-events: none;
  }
  .reward-moment-card {
    width: min(420px, calc(100vw - 36px));
    border: 1px solid rgba(231,222,208,0.46);
    border-radius: 26px;
    background:
      radial-gradient(circle at 50% 2%, rgba(231,222,208,0.28), transparent 42%),
      radial-gradient(circle at 50% 100%, rgba(168,141,89,0.16), transparent 36%),
      rgba(7,7,8,0.97);
    box-shadow:
      0 0 72px rgba(231,222,208,0.24),
      0 30px 80px rgba(0,0,0,0.58),
      inset 0 1px 0 rgba(255,255,255,0.08);
    color: #fff;
    padding: 28px 24px 26px;
    display: grid;
    justify-items: center;
    text-align: center;
    animation: rewardMomentIn 420ms ease both, rewardMomentOut 420ms ease 2380ms forwards;
  }
  .reward-moment-coin {
    width: 58px;
    height: 58px;
    border: 1px solid rgba(231,222,208,0.52);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 45%, rgba(255,255,255,0.42), transparent 18%),
      linear-gradient(135deg, #E7DED0, #9f8d69);
    box-shadow: 0 0 28px rgba(231,222,208,0.32);
    animation: rewardMomentCoinPulse 1200ms ease infinite;
  }
  .reward-moment-eyebrow {
    margin-top: 18px;
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .reward-moment-card h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 24px;
    line-height: 29px;
    font-weight: 900;
  }
  .reward-moment-values {
    margin-top: 18px;
    display: grid;
    justify-items: center;
    gap: 5px;
  }
  .reward-moment-values strong {
    color: #E7DED0;
    font-size: 40px;
    line-height: 42px;
    font-weight: 900;
  }
  .reward-moment-values span {
    color: #fff;
    font-size: 17px;
    line-height: 22px;
    font-weight: 900;
  }
  .reward-moment-bonuses {
    width: 100%;
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
    display: grid;
    gap: 7px;
  }
  .reward-moment-bonuses li {
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 999px;
    background: rgba(231,222,208,0.065);
    color: #E7DED0;
    padding: 8px 11px;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }
  .reward-moment-card p {
    margin: 18px 0 0;
    border-top: 1px solid rgba(231,222,208,0.16);
    width: 100%;
    padding-top: 14px;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }
  @keyframes rewardMomentLayerIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes rewardMomentLayerOut {
    to {
      opacity: 0;
    }
  }
  @keyframes rewardMomentIn {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes rewardMomentOut {
    to {
      opacity: 0;
      transform: scale(0.98);
    }
  }
  @keyframes rewardMomentCoinPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.06);
    }
  }
  @media (max-width: 680px) {
    .reward-moment-values strong {
      font-size: 36px;
      line-height: 38px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reward-moment-layer,
    .reward-moment-card,
    .reward-moment-coin {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;
