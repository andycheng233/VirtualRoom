"use client";

import dynamic from "next/dynamic";

const CylindricalViewer = dynamic(() => import("./CylindricalViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="text-white text-sm">Loading panorama...</div>
    </div>
  ),
});

export default function PanoramaViewer({ image }: { image: string }) {
  return <CylindricalViewer image={image} />;
}
