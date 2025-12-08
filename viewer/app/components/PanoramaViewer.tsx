"use client";

import { useEffect, useRef } from "react";

export default function PanoramaViewer({ image }: { image: string }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    document.body.appendChild(script);

    script.onload = () => {
      // @ts-expect-error pannellum is loaded globally
      window.pannellum.viewer(viewerRef.current, {
        type: "equirectangular",
        panorama: image,
        autoLoad: true,
        autoRotate: -2,
      });
    };
  }, [image]);

  return <div ref={viewerRef} style={{ width: "100vw", height: "100vh" }} />;
}
