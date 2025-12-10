#!/usr/bin/env python3
"""
Panorama Stitcher with Depth-Aware Blending

Stitches RGB images from a rotating camera into a panorama.
Uses depth information to improve blending and reduce parallax errors.

Usage:
    python depth_pano_stitcher.py <input_folder> [-o output.png]
"""

import argparse
import numpy as np
import cv2
from pathlib import Path
from typing import List, Tuple, Optional
import re


def load_images_and_depths(folder: str) -> Tuple[List[np.ndarray], List[np.ndarray]]:
    """Load RGB images and depth maps from folder, sorted by index."""
    folder = Path(folder)

    rgb_files = list(folder.glob("rgb_*.png"))
    indices = []
    for f in rgb_files:
        match = re.search(r'rgb_(\d+)\.png', f.name)
        if match:
            indices.append(int(match.group(1)))
    indices.sort()

    images = []
    depths = []

    for idx in indices:
        img = cv2.imread(str(folder / f"rgb_{idx}.png"))
        if img is None:
            raise ValueError(f"Could not load rgb_{idx}.png")
        images.append(img)

        depth_path = folder / f"depth_{idx}.npy"
        if depth_path.exists():
            depths.append(np.load(str(depth_path)))
        else:
            depths.append(None)

    print(f"Loaded {len(images)} images")
    return images, depths


def cylindrical_warp(img: np.ndarray, focal_length: float) -> np.ndarray:
    """Project image to cylindrical coordinates for rotation-only camera motion."""
    h, w = img.shape[:2]
    cx, cy = w / 2, h / 2

    # Create coordinate maps
    y_i, x_i = np.indices((h, w))

    # Cylindrical projection
    theta = (x_i - cx) / focal_length
    h_cyl = (y_i - cy) / focal_length

    # Back-project to original coordinates
    x_src = focal_length * np.tan(theta) + cx
    y_src = h_cyl * focal_length / np.cos(theta) + cy

    # Remap
    return cv2.remap(img, x_src.astype(np.float32), y_src.astype(np.float32),
                     cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def find_translation(img1: np.ndarray, img2: np.ndarray) -> Tuple[int, int]:
    """Find horizontal translation between two cylindrical images using feature matching."""
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    # Use SIFT for better accuracy
    try:
        detector = cv2.SIFT_create(nfeatures=1000)
        matcher = cv2.BFMatcher(cv2.NORM_L2)
    except:
        detector = cv2.ORB_create(nfeatures=1000)
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING)

    kp1, desc1 = detector.detectAndCompute(gray1, None)
    kp2, desc2 = detector.detectAndCompute(gray2, None)

    if desc1 is None or desc2 is None:
        return 0, 0

    matches = matcher.knnMatch(desc1, desc2, k=2)

    # Ratio test
    good = []
    for m_n in matches:
        if len(m_n) == 2 and m_n[0].distance < 0.75 * m_n[1].distance:
            good.append(m_n[0])

    if len(good) < 4:
        return 0, 0

    # Get translation from matches (for cylindrical images, mainly horizontal)
    pts1 = np.float32([kp1[m.queryIdx].pt for m in good])
    pts2 = np.float32([kp2[m.trainIdx].pt for m in good])

    # Use RANSAC to find best translation
    dx_all = pts1[:, 0] - pts2[:, 0]
    dy_all = pts1[:, 1] - pts2[:, 1]

    # Robust median
    dx = int(np.median(dx_all))
    dy = int(np.median(dy_all))

    return dx, dy


def depth_aware_blend(img1: np.ndarray, img2: np.ndarray,
                      depth1: Optional[np.ndarray], depth2: Optional[np.ndarray],
                      x_offset: int) -> Tuple[np.ndarray, Optional[np.ndarray]]:
    """
    Blend two images with depth-aware weighting.

    In overlap regions, pixels with closer depth get more weight since
    they're less likely to have parallax errors.
    """
    h1, w1 = img1.shape[:2]
    h2, w2 = img2.shape[:2]

    # Output dimensions
    out_w = max(w1, x_offset + w2)
    out_h = max(h1, h2)

    result = np.zeros((out_h, out_w, 3), dtype=np.float32)
    result_depth = np.zeros((out_h, out_w), dtype=np.float32) if depth1 is not None else None
    weight_sum = np.zeros((out_h, out_w), dtype=np.float32)

    # Place img1
    result[:h1, :w1] += img1.astype(np.float32)
    weight1 = np.ones((h1, w1), dtype=np.float32)

    # Apply depth weighting to img1 in overlap region
    overlap_start = max(0, x_offset)
    overlap_end = min(w1, x_offset + w2)

    if overlap_end > overlap_start and depth1 is not None:
        overlap_region = depth1[:, overlap_start:overlap_end].astype(np.float32)
        # Inverse depth weighting (closer = higher weight)
        overlap_region[overlap_region == 0] = 65535
        depth_weight1 = 1.0 / (overlap_region / 1000.0 + 0.1)  # Convert to meters
        depth_weight1 = np.clip(depth_weight1, 0.1, 10)
        weight1[:, overlap_start:overlap_end] *= depth_weight1

    weight_sum[:h1, :w1] += weight1
    if result_depth is not None and depth1 is not None:
        result_depth[:h1, :w1] += depth1.astype(np.float32) * weight1

    # Place img2 with offset
    x_start = max(0, x_offset)
    x_end = min(out_w, x_offset + w2)
    img2_x_start = max(0, -x_offset)
    img2_x_end = img2_x_start + (x_end - x_start)

    weight2 = np.ones((h2, w2), dtype=np.float32)

    # Apply depth weighting to img2 in overlap region
    img2_overlap_start = max(0, w1 - x_offset) if x_offset < w1 else 0
    img2_overlap_end = min(w2, w1 - x_offset + (overlap_end - overlap_start)) if x_offset < w1 else 0

    if img2_overlap_end > img2_overlap_start and depth2 is not None:
        overlap_region2 = depth2[:, img2_overlap_start:img2_overlap_end].astype(np.float32)
        overlap_region2[overlap_region2 == 0] = 65535
        depth_weight2 = 1.0 / (overlap_region2 / 1000.0 + 0.1)
        depth_weight2 = np.clip(depth_weight2, 0.1, 10)
        weight2[:, img2_overlap_start:img2_overlap_end] *= depth_weight2

    result[:h2, x_start:x_end] += img2[:, img2_x_start:img2_x_end].astype(np.float32) * \
                                   weight2[:, img2_x_start:img2_x_end, np.newaxis]
    weight_sum[:h2, x_start:x_end] += weight2[:, img2_x_start:img2_x_end]

    if result_depth is not None and depth2 is not None:
        result_depth[:h2, x_start:x_end] += depth2[:, img2_x_start:img2_x_end].astype(np.float32) * \
                                             weight2[:, img2_x_start:img2_x_end]

    # Normalize
    weight_sum[weight_sum == 0] = 1
    result = result / weight_sum[:, :, np.newaxis]

    if result_depth is not None:
        result_depth = result_depth / weight_sum

    return result.astype(np.uint8), result_depth.astype(np.uint16) if result_depth is not None else None


def stitch_panorama(images: List[np.ndarray],
                    depths: List[np.ndarray],
                    focal_length: Optional[float] = None) -> Tuple[np.ndarray, Optional[np.ndarray]]:
    """
    Stitch images into panorama using cylindrical projection and depth-aware blending.
    """
    if len(images) == 0:
        return None, None
    if len(images) == 1:
        return images[0], depths[0]

    h, w = images[0].shape[:2]

    # Estimate focal length from typical RealSense D435 FOV (~69 degrees horizontal)
    if focal_length is None:
        focal_length = w / (2 * np.tan(np.radians(34.5)))

    print(f"Using focal length: {focal_length:.1f} pixels")

    # Project all images to cylindrical coordinates
    print("Projecting to cylindrical coordinates...")
    cyl_images = []
    cyl_depths = []
    for i, (img, depth) in enumerate(zip(images, depths)):
        cyl_img = cylindrical_warp(img, focal_length)
        cyl_images.append(cyl_img)

        if depth is not None:
            cyl_depth = cylindrical_warp(depth.astype(np.float32), focal_length).astype(np.uint16)
            cyl_depths.append(cyl_depth)
        else:
            cyl_depths.append(None)

    # Find translations between consecutive images
    print("Finding image alignments...")
    translations = [(0, 0)]  # First image at origin
    cumulative_x = 0
    cumulative_y = 0

    for i in range(len(cyl_images) - 1):
        dx, dy = find_translation(cyl_images[i], cyl_images[i + 1])
        cumulative_x += dx
        cumulative_y += dy
        translations.append((cumulative_x, cumulative_y))
        print(f"  Image {i} -> {i+1}: dx={dx}, dy={dy}")

    # Normalize translations (shift so minimum is at origin)
    min_x = min(t[0] for t in translations)
    min_y = min(t[1] for t in translations)
    translations = [(t[0] - min_x, t[1] - min_y) for t in translations]

    # Calculate output size
    max_x = max(t[0] + w for t in translations)
    max_y = max(t[1] + h for t in translations)

    print(f"Output size: {max_x}x{max_y}")

    # Create output arrays
    result = np.zeros((max_y, max_x, 3), dtype=np.float32)
    result_depth = np.zeros((max_y, max_x), dtype=np.float32) if cyl_depths[0] is not None else None
    weight_sum = np.zeros((max_y, max_x), dtype=np.float32)

    # Blend all images with depth-aware weighting
    print("Blending with depth-aware weights...")
    for i, (img, depth, (tx, ty)) in enumerate(zip(cyl_images, cyl_depths, translations)):
        print(f"  Adding image {i+1}/{len(cyl_images)}")

        # Create weight map (higher weight for center, uses depth in overlaps)
        weight = np.ones((h, w), dtype=np.float32)

        # Horizontal feathering (fade at edges)
        fade_width = w // 4
        for x in range(fade_width):
            factor = x / fade_width
            weight[:, x] *= factor
            weight[:, w - 1 - x] *= factor

        # Depth-based weighting (closer objects get more weight)
        if depth is not None:
            depth_f = depth.astype(np.float32)
            depth_f[depth_f == 0] = 65535  # Invalid depth gets low weight
            depth_weight = 1.0 / (depth_f / 1000.0 + 0.5)  # Convert mm to m
            depth_weight = np.clip(depth_weight / depth_weight.max(), 0.3, 1.0)
            weight *= depth_weight

        # Add to result
        y_start, y_end = ty, ty + h
        x_start, x_end = tx, tx + w

        result[y_start:y_end, x_start:x_end] += img.astype(np.float32) * weight[:, :, np.newaxis]
        weight_sum[y_start:y_end, x_start:x_end] += weight

        if result_depth is not None and depth is not None:
            result_depth[y_start:y_end, x_start:x_end] += depth.astype(np.float32) * weight

    # Normalize by weights
    weight_sum[weight_sum == 0] = 1
    result = result / weight_sum[:, :, np.newaxis]

    if result_depth is not None:
        result_depth = (result_depth / weight_sum).astype(np.uint16)

    # Crop to valid region
    gray = cv2.cvtColor(result.astype(np.uint8), cv2.COLOR_BGR2GRAY)
    coords = cv2.findNonZero((gray > 0).astype(np.uint8))
    if coords is not None:
        x, y, w_crop, h_crop = cv2.boundingRect(coords)
        result = result[y:y+h_crop, x:x+w_crop]
        if result_depth is not None:
            result_depth = result_depth[y:y+h_crop, x:x+w_crop]

    return result.astype(np.uint8), result_depth


def main():
    parser = argparse.ArgumentParser(description="Stitch panorama with depth-aware blending")
    parser.add_argument("input_folder", help="Folder with rgb_*.png and depth_*.npy")
    parser.add_argument("-o", "--output", default="panorama.png", help="Output file")
    parser.add_argument("-d", "--depth-output", default=None, help="Output depth map (.npy)")
    parser.add_argument("--focal", type=float, default=None, help="Focal length in pixels")
    args = parser.parse_args()

    images, depths = load_images_and_depths(args.input_folder)

    if len(images) == 0:
        print("No images found")
        return

    print(f"Image size: {images[0].shape[1]}x{images[0].shape[0]}")

    panorama, pano_depth = stitch_panorama(images, depths, args.focal)

    if panorama is None:
        print("Stitching failed")
        return

    cv2.imwrite(args.output, panorama)
    print(f"Saved: {args.output} ({panorama.shape[1]}x{panorama.shape[0]})")

    if args.depth_output and pano_depth is not None:
        np.save(args.depth_output, pano_depth)
        print(f"Saved depth: {args.depth_output}")


if __name__ == "__main__":
    main()
