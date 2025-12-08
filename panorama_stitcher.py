"""
Simple Panorama Stitcher
Uses OpenCV's built-in stitcher for fast, reliable results.

To run this, do:
python panorama_stitcher.py ./images_folder output_image.jpg
"""

import cv2
import numpy as np
from pathlib import Path
import sys


def load_images(image_dir: str) -> list:
    """Load images from a directory in sorted order."""
    image_path = Path(image_dir)
    extensions = (".jpg", ".jpeg", ".png", ".bmp")

    image_files = sorted([
        f for f in image_path.iterdir()
        if f.suffix.lower() in extensions
    ])

    images = []
    for img_file in image_files:
        img = cv2.imread(str(img_file))
        if img is not None:
            images.append(img)
            print(f"Loaded: {img_file.name}")

    print(f"Total: {len(images)} images")
    return images


def stitch_panorama(images: list) -> np.ndarray:
    """Stitch images using OpenCV's Stitcher."""
    stitcher = cv2.Stitcher.create(cv2.Stitcher_PANORAMA)
    status, panorama = stitcher.stitch(images)

    if status == cv2.Stitcher_OK:
        return panorama
    elif status == cv2.Stitcher_ERR_NEED_MORE_IMGS:
        raise RuntimeError("Need more images or more overlap between them")
    elif status == cv2.Stitcher_ERR_HOMOGRAPHY_EST_FAIL:
        raise RuntimeError("Homography estimation failed - images may not overlap enough")
    elif status == cv2.Stitcher_ERR_CAMERA_PARAMS_ADJUST_FAIL:
        raise RuntimeError("Camera parameter adjustment failed")
    else:
        raise RuntimeError(f"Stitching failed with status code: {status}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python panorama_stitcher.py <image_directory> [output_file]")
        print("Example: python panorama_stitcher.py ./images panorama.jpg")
        sys.exit(1)

    image_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "panorama_output.jpg"

    # Load images
    images = load_images(image_dir)
    if len(images) < 2:
        print("Error: Need at least 2 images")
        sys.exit(1)

    # Stitch
    print("\nStitching...")
    panorama = stitch_panorama(images)

    # Save
    success = cv2.imwrite(output_file, panorama)
    if not success:
        print(f"Error: Failed to save panorama to {output_file}")
        print("Check if the path is valid and you have write permissions.")
        sys.exit(1)
    print(f"Saved: {output_file} ({panorama.shape[1]}x{panorama.shape[0]})")


if __name__ == "__main__":
    main()
