"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CylinderPanoramaProps {
  imageUrl: string;
}

function CylinderPanorama({ imageUrl }: CylinderPanoramaProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera } = useThree();

  // Mouse/touch drag state
  const isDragging = useRef(false);
  const previousMouseX = useRef(0);
  const rotationY = useRef(0);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.repeat.x = -1; 
      setTexture(loadedTexture);
    });
  }, [imageUrl]);

  useEffect(() => {
    // Set up camera
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 75;
      camera.near = 0.1;
      camera.far = 1000;
      camera.position.set(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    // Mouse/touch handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMouseX.current = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouseX.current;
      rotationY.current -= deltaX * 0.003;
      previousMouseX.current = e.clientX;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        previousMouseX.current = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMouseX.current;
      rotationY.current -= deltaX * 0.003;
      previousMouseX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [camera]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = rotationY.current;
    }
  });

  if (!texture) return null;

  // Calculate cylinder height based on texture aspect ratio
  // For a 360 cylindrical panorama, the width covers 2*PI*radius
  const radius = 50;
  let imageAspect = 2; // fallback aspect
  if (
    texture.image &&
    typeof (texture.image as any).width === "number" &&
    typeof (texture.image as any).height === "number"
  ) {
    imageAspect =
      (texture.image as { width: number; height: number }).width /
      (texture.image as { width: number; height: number }).height;
  }
  // The circumference is 2*PI*radius, and this maps to the image width
  // So height = circumference / aspectRatio
  const circumference = 2 * Math.PI * radius;
  const cylinderHeight = circumference / imageAspect;

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[radius, radius, cylinderHeight, 64, 1, true]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

export default function CylindricalViewer({ image }: { image: string }) {
  return (
    <div className="w-full h-full bg-black">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        style={{ background: "black" }}
      >
        <CylinderPanorama imageUrl={image} />
      </Canvas>
    </div>
  );
}
