"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A single background reel slot that CROSSFADES between clips instead of
 * hard-cutting. It keeps two stacked <video> layers: the visible one plays
 * while the next clip is preloaded into the hidden layer, then we fade between
 * them. The result is a smooth, premium dissolve every time `src` changes.
 */
export function ReelTile({ src }: { src: string }) {
  const [layers, setLayers] = useState<{ a: string; b: string }>({
    a: src,
    b: src,
  });
  const [active, setActive] = useState<"a" | "b">("a");
  const current = useRef(src);

  useEffect(() => {
    if (src === current.current) return;
    current.current = src;

    // Load the new clip into the hidden layer, then flip on the next frame so
    // the freshly-mounted <video> is ready before it fades in.
    setLayers((prev) =>
      active === "a" ? { ...prev, b: src } : { ...prev, a: src }
    );
    const frame = requestAnimationFrame(() =>
      setActive((prev) => (prev === "a" ? "b" : "a"))
    );
    return () => cancelAnimationFrame(frame);
  }, [src, active]);

  const poster = (clip: string) => clip.replace(".mp4", ".jpg");

  return (
    <div className="absolute inset-0">
      <video
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-in-out ${
          active === "a" ? "opacity-100" : "opacity-0"
        }`}
        src={layers.a}
        poster={poster(layers.a)}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      <video
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-in-out ${
          active === "b" ? "opacity-100" : "opacity-0"
        }`}
        src={layers.b}
        poster={poster(layers.b)}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
    </div>
  );
}
