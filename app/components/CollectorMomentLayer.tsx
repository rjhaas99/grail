"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  bundleCollectorMoments,
  defaultCollectorMomentConfig,
  shouldUseCollectorMomentOverlay,
  type CollectorMoment,
  type CollectorMomentBundle,
  type CollectorMomentConfig,
} from "../lib/collectorMoments";
import RewardMomentCelebration from "./RewardMomentCelebration";

type CollectorMomentLayerProps = {
  moments: CollectorMoment[];
  isReady: boolean;
  isEnabled?: boolean;
  config?: CollectorMomentConfig;
};

export default function CollectorMomentLayer({
  moments,
  isReady,
  isEnabled = true,
  config = defaultCollectorMomentConfig,
}: CollectorMomentLayerProps) {
  const [activeBundle, setActiveBundle] = useState<CollectorMomentBundle | null>(null);
  const seenMomentIdsRef = useRef<Set<string>>(new Set());
  const hasSeededMomentIdsRef = useRef(false);

  const overlayBundles = useMemo(() => {
    return bundleCollectorMoments(moments, config).filter((bundle) =>
      shouldUseCollectorMomentOverlay(bundle.priority),
    );
  }, [config, moments]);

  useEffect(() => {
    if (!isReady || !isEnabled || typeof window === "undefined") {
      return;
    }

    const momentIds = moments.map((moment) => moment.id).filter(Boolean);

    if (!hasSeededMomentIdsRef.current) {
      seenMomentIdsRef.current = new Set(momentIds);
      hasSeededMomentIdsRef.current = true;
      return;
    }

    const newBundle = overlayBundles.find((bundle) =>
      bundle.moments.some((moment) => !seenMomentIdsRef.current.has(moment.id)),
    );
    momentIds.forEach((id) => seenMomentIdsRef.current.add(id));

    if (!newBundle) {
      return;
    }

    const showTimeout = window.setTimeout(() => {
      setActiveBundle(newBundle);
    }, 0);
    const hideTimeout = window.setTimeout(() => {
      setActiveBundle(null);
    }, config.overlayDurationMs);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [config.overlayDurationMs, isEnabled, isReady, moments, overlayBundles]);

  useEffect(() => {
    if (isEnabled) {
      return;
    }

    seenMomentIdsRef.current = new Set();
    hasSeededMomentIdsRef.current = false;
  }, [isEnabled]);

  return <RewardMomentCelebration bundle={isEnabled ? activeBundle : null} />;
}
