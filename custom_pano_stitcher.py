#!/usr/bin/env python3
"""
Custom Panorama Stitcher with cylindrical projection, loop closure correction, and edge fill.

Usage:
    python custom_pano_stitcher.py <input_folder> [-o output.png]

Arguments:
    input_folder    Folder containing rgb_*.png or IMG_*.jpeg/jpg files

Options:
    -o, --output    Output file path (default: custom_panorama.png)

Examples:
    python custom_pano_stitcher.py ./locations/becton/waypoint_1/flat
    python custom_pano_stitcher.py ./my_images -o panorama.png
"""

import argparse
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple
import re
import sys

class PanoramaStitcher:
    """Stitches images into a cylindrical panorama with automatic cropping."""

    def __init__(self):
        """Initialize SIFT detector and FLANN matcher."""
        self.detector = cv2.SIFT_create(nfeatures=2000)
        index_params = dict(algorithm=1, trees=5)
        search_params = dict(checks=50)
        self.matcher = cv2.FlannBasedMatcher(index_params, search_params)

    def load_images(self, folder: str) -> List[np.ndarray]:
        """Load and sort images from the specified folder.
        
        Supports two patterns:
        - rgb_*.png files (sorted by number)
        - IMG_*.jpeg files (sorted by number)
        """
        folder_path = Path(folder)
        
        # Try rgb_*.png pattern first
        rgb_files = sorted(
            list(folder_path.glob("rgb_*.png")),
            key=lambda x: int(re.search(r"rgb_(\d+)", x.name).group(1)),
        )
        
        # If no rgb files, try IMG_*.jpeg pattern
        if not rgb_files:
            img_files = sorted(
                list(folder_path.glob("IMG_*.jpeg")),
                key=lambda x: int(re.search(r"IMG_(\d+)", x.name).group(1)),
            )
            if img_files:
                rgb_files = img_files
            else:
                # Also try .jpg extension
                img_files = sorted(
                    list(folder_path.glob("IMG_*.jpg")),
                    key=lambda x: int(re.search(r"IMG_(\d+)", x.name).group(1)),
                )
                if img_files:
                    rgb_files = img_files

        if not rgb_files:
            print("ERROR: No rgb_*.png or IMG_*.jpeg files found.")
            sys.exit(1)

        print(f"Loading {len(rgb_files)} images...")
        images = []
        for file_path in rgb_files:
            img = cv2.imread(str(file_path))
            if img is not None:
                images.append(img)
        return images

    def cylindrical_warp(
        self, img: np.ndarray, focal_length: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Project image onto cylindrical surface and return warped image with weight map."""
        height, width = img.shape[:2]
        x_indices = np.arange(width)
        y_indices = np.arange(height)
        x_grid, y_grid = np.meshgrid(x_indices, y_indices)

        dist_x = 1.0 - np.abs(x_grid - width / 2) / (width / 2)
        dist_y = 1.0 - np.abs(y_grid - height / 2) / (height / 2)
        weight_map = (dist_x * dist_y).astype(np.float32)

        theta = (x_grid - width / 2) / focal_length
        h_cyl = (y_grid - height / 2) / focal_length

        x_src = focal_length * np.tan(theta) + width / 2
        y_src = h_cyl * focal_length / np.cos(theta) + height / 2

        img_warped = cv2.remap(
            img,
            x_src.astype(np.float32),
            y_src.astype(np.float32),
            cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0),
        )

        weight_warped = cv2.remap(
            weight_map,
            x_src.astype(np.float32),
            y_src.astype(np.float32),
            cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=0,
        )

        return img_warped, weight_warped

    def find_shift(
        self, img1: np.ndarray, img2: np.ndarray
    ) -> Tuple[float, float]:
        """Find horizontal and vertical shift between two images using feature matching."""
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        keypoints1, descriptors1 = self.detector.detectAndCompute(gray1, None)
        keypoints2, descriptors2 = self.detector.detectAndCompute(gray2, None)

        if (
            descriptors1 is None
            or descriptors2 is None
            or len(keypoints1) < 5
            or len(keypoints2) < 5
        ):
            return 0.0, 0.0

        matches = self.matcher.knnMatch(descriptors1, descriptors2, k=2)
        good_matches = []
        for match_pair in matches:
            if len(match_pair) == 2:
                m, n = match_pair
                if m.distance < 0.7 * n.distance:
                    good_matches.append(m)

        if len(good_matches) < 5:
            return 0.0, 0.0

        points1 = np.float32(
            [keypoints1[m.queryIdx].pt for m in good_matches]
        )
        points2 = np.float32(
            [keypoints2[m.trainIdx].pt for m in good_matches]
        )

        diff = points1 - points2
        dx = np.median(diff[:, 0])
        dy = np.median(diff[:, 1])

        return dx, dy

    def correct_loop_closure(
        self, panorama: np.ndarray, shift_threshold: int = 15
    ) -> np.ndarray:
        """Correct loop closure error by aligning left and right edges of panorama."""
        height, width = panorama.shape[:2]
        overlap_width = min(width // 8, 300)

        img_left = panorama[:, :overlap_width]
        img_right = panorama[:, width - overlap_width :]

        if img_left.size == 0 or img_right.size == 0:
            return panorama

        gray_left = cv2.cvtColor(img_left, cv2.COLOR_BGR2GRAY)
        gray_right = cv2.cvtColor(img_right, cv2.COLOR_BGR2GRAY)

        keypoints_left, descriptors_left = self.detector.detectAndCompute(
            gray_left, None
        )
        keypoints_right, descriptors_right = self.detector.detectAndCompute(
            gray_right, None
        )

        if descriptors_left is None or descriptors_right is None:
            return panorama

        matches = self.matcher.knnMatch(descriptors_left, descriptors_right, k=2)
        good_matches = []
        for match_pair in matches:
            if len(match_pair) == 2:
                m, n = match_pair
                if m.distance < 0.7 * n.distance:
                    good_matches.append(m)

        if len(good_matches) < shift_threshold:
            return panorama

        points_left = np.float32(
            [keypoints_left[m.queryIdx].pt for m in good_matches]
        )
        points_right = np.float32(
            [keypoints_right[m.trainIdx].pt for m in good_matches]
        )

        homography, _ = cv2.findHomography(
            points_right, points_left, cv2.RANSAC, 5.0
        )

        corrected_panorama = cv2.warpPerspective(
            panorama,
            homography,
            (width, height),
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0),
        )

        print("Successfully applied Loop Closure Correction.")
        return corrected_panorama

    def check_black_on_border(
        self, mask: np.ndarray, x_min: int, y_min: int, x_max: int, y_max: int
    ) -> bool:
        """Check if there are any black pixels on the border of the specified region."""
        if np.any(mask[y_min, x_min:x_max] == 0):
            return True
        if np.any(mask[y_max - 1, x_min:x_max] == 0):
            return True
        if np.any(mask[y_min:y_max, x_min] == 0):
            return True
        if np.any(mask[y_min:y_max, x_max - 1] == 0):
            return True
        return False
    
    def fill_black_edges(self, panorama: np.ndarray) -> np.ndarray:
        """Fill black edges using OpenCV inpainting."""
        gray = cv2.cvtColor(panorama, cv2.COLOR_BGR2GRAY)
        black_mask = (gray < 5).astype(np.uint8) * 255

        if np.sum(black_mask) == 0:
            print("No black edges to fill.")
            return panorama

        # Inpaint all black regions
        result = cv2.inpaint(panorama, black_mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)

        print("Filled black edges using inpainting.")
        return result

    def stitch(
        self, images: List[np.ndarray]
    ) -> np.ndarray:
        """Stitch images into a cylindrical panorama."""
        height, width = images[0].shape[:2]

        focal_length = width / (2 * np.tan(np.radians(69 / 2)))
        print(f"Auto-calculated Focal Length: {focal_length:.1f}px")

        print("Warping images...")
        warped_data = [
            self.cylindrical_warp(img, focal_length) for img in images
        ]
        warped_images = [data[0] for data in warped_data]
        weight_maps = [data[1] for data in warped_data]

        print("Aligning...")
        shifts = []
        for i in range(len(warped_images)):
            current_img = warped_images[i]
            next_img = warped_images[(i + 1) % len(warped_images)]
            dx, dy = self.find_shift(current_img, next_img)
            shifts.append((dx, dy))

        total_dy = sum(shift[1] for shift in shifts)
        y_drift = total_dy / len(warped_images)

        absolute_shifts = [(0, 0)]
        current_x, current_y = 0, 0
        for dx, dy in shifts[:-1]:
            current_x += dx
            current_y += dy - y_drift
            absolute_shifts.append((current_x, current_y))

        min_x = min(shift[0] for shift in absolute_shifts)
        max_x = max(shift[0] + width for shift in absolute_shifts)
        min_y = min(shift[1] for shift in absolute_shifts)
        max_y = max(shift[1] + height for shift in absolute_shifts)

        canvas_width = int(max_x - min_x)
        canvas_height = int(max_y - min_y)

        panorama = np.zeros((canvas_height, canvas_width, 3), dtype=np.uint8)
        global_weights = np.zeros(
            (canvas_height, canvas_width), dtype=np.float32
        ) - 1.0

        for warped_img, weight_map, (abs_x, abs_y) in zip(
            warped_images, weight_maps, absolute_shifts
        ):
            x_offset = int(abs_x - min_x)
            y_offset = int(abs_y - min_y)

            img_height, img_width = warped_img.shape[:2]

            roi_y = slice(y_offset, y_offset + img_height)
            roi_x = slice(x_offset, x_offset + img_width)

            current_weights = global_weights[roi_y, roi_x]
            better_mask = (weight_map > current_weights) & (weight_map > 0.01)

            target_region = panorama[roi_y, roi_x]
            target_region[better_mask] = warped_img[better_mask]

            current_weights[better_mask] = weight_map[better_mask]
            global_weights[roi_y, roi_x] = current_weights

        panorama = self.correct_loop_closure(panorama)
        panorama = self.fill_black_edges(panorama)

        return panorama


def main():
    """Main entry point for command-line interface."""
    parser = argparse.ArgumentParser(
        description="Custom panorama stitcher."
    )
    parser.add_argument(
        "input_folder", help="Folder containing rgb_X.png files."
    )
    parser.add_argument(
        "-o",
        "--output",
        default="custom_panorama.png",
        help="Output file path.",
    )
    args = parser.parse_args()

    stitcher = PanoramaStitcher()
    images = stitcher.load_images(args.input_folder)

    if not images:
        print("Stitching failed: No valid images loaded.")
        return

    result = stitcher.stitch(images)
    if result is not None:
        cv2.imwrite(args.output, result)
        print(f"Success! Saved to {args.output}")
    else:
        print("Stitching failed.")


if __name__ == "__main__":
    main()

