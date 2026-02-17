"use client";

import dynamic from "next/dynamic";
import type { LottieComponentProps } from "lottie-react";

const LottiePlayer = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-muted rounded-lg" />,
});

interface LottieAnimationProps {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LottieAnimation({
  path,
  loop = true,
  autoplay = true,
  className,
  style,
}: LottieAnimationProps) {
  // Dynamic import of the JSON
  const animationData = require(`../../public/lottie/${path}`);

  const defaultOptions: Partial<LottieComponentProps> = {
    animationData,
    loop,
    autoplay,
  };

  return (
    <div className={className} style={style}>
      <LottiePlayer {...defaultOptions} />
    </div>
  );
}
