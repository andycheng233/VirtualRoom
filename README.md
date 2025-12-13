# VirtualRoom - Yale GeoGuessr

A GeoGuessr-style web application for Yale campus that allows users to guess locations from 360-degree panoramic images. This project combines custom panorama stitching (Computer Vision) with an interactive React-based frontend.

**CPSC 4800 (Computer Vision) Final Project**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Custom Panorama Stitcher](#custom-panorama-stitcher)
5. [Depth Panorama Stitcher](#depth-panorama-stitcher)
6. [Frontend Architecture](#frontend-architecture)
7. [Game Mechanics](#game-mechanics)
8. [Getting Started](#getting-started)

---

## Project Overview

VirtualRoom creates an immersive location-guessing game using custom-stitched 360-degree panoramas from Yale campus locations. The workflow is:

1. **Capture** - Collect sequential images by rotating a camera around a fixed point
2. **Stitch** - Use custom Python scripts to create seamless cylindrical panoramas
3. **Display** - Render panoramas in an interactive 3D viewer using Three.js
4. **Play** - Guess locations on a map and earn points based on accuracy

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Panorama Stitching | Python, OpenCV, NumPy |
| Image Capture | Intel RealSense D435i, PyRealSense2 |
| Frontend Framework | Next.js 16.0.7, React 19.2 |
| 3D Rendering | Three.js, React Three Fiber |
| Maps | Mapbox GL |
| Styling | Tailwind CSS 4 |
| Language | TypeScript, Python |

---

## Project Structure

```
VirtualRoom/
├── custom_pano_stitcher.py       # Main panorama stitching script
├── cv2_stitcher.py               # OpenCV built-in stitcher (alternative)
├── depth_pano_stitcher.py        # Depth-based panorama stitching
├── image_collect.py              # RealSense camera image collection
├── requirements.txt              # Python dependencies
├── locations/                    # Location folders, each with RGB + Depth Frames
    ├── becton_rbg/
    ├── berkeley/
    ├── ceid/
    ├── church/
    ├── franklin/
    ├── hq/
    ├── je_courtyard_images/
    ├── marsh/
    ├── morse_undeground/
    ├── pwg/
    ├── rosenktranz/
    ├── schwarzman/
    ├── tsai_city/
    └── watson/
└── viewer/                       # Next.js frontend application
    ├── app/
    │   ├── page.tsx              # Main page
    │   ├── layout.tsx            # Root layout with GameProvider
    │   ├── components/
    │   │   ├── CylindricalViewer.tsx    # 3D panorama renderer
    │   │   ├── PanoramaViewer.tsx       # SSR-safe wrapper
    │   │   ├── game/                    # Game UI components
    │   │   └── map/                     # Mapbox integration
    │   ├── context/
    │   │   └── GameContext.tsx          # Game state management
    │   ├── data/
    │   │   └── locations.ts             # Yale location definitions
    │   └── utils/
    │       └── scoring.ts               # Distance & scoring logic
    └── public/
        └── panoramas/                   # Generated panorama images
```

---

## Custom Panorama Stitcher

**File:** `custom_pano_stitcher.py`

The custom stitcher creates 360-degree cylindrical panoramas from sequential images captured by rotating a camera around a fixed point. It uses computer vision techniques to align and blend images seamlessly.

### Usage

```bash
python custom_pano_stitcher.py <input_folder> [-o output.png]

# Examples:
python custom_pano_stitcher.py ./locations/je_courtyard_images -o je_custom_pano.png
python custom_pano_stitcher.py ./locations/becton_rbg -o becton_custom_pano.png
```

### Pipeline Overview

```
Load Images → Cylindrical Warp → Find Shifts → Composite → Loop Closure → Clean Up
```

### Detailed Algorithm

#### 1. Image Loading (`load_images`)

Loads images from a folder in numerical order. Supports two naming patterns:
- `rgb_*.png` - Output from RealSense cameras
- `IMG_*.jpeg` / `IMG_*.jpg` - iPhone or standard camera output

#### 2. Cylindrical Warping (`cylindrical_warp`)

Converts planar images to cylindrical projections, essential for creating seamless 360° panoramas.

**How it works:**
- For each pixel in the output, calculate corresponding position in the input image
- Uses the cylindrical projection equations:
  ```
  theta = (x - center_x) / focal_length
  h = (y - center_y) / focal_length

  input_x = focal_length * tan(theta) + center_x
  input_y = h * sqrt(1 + tan²(theta)) + center_y
  ```

**Focal length calculation:**
```python
focal_length = image_width / (2 * tan(69° / 2))
```
Assumes a 69-degree field of view (typical for smartphones).

**Weight map:** Also generates a weight map where pixels near the image center have higher weights. This is used during compositing to prefer data from the center of images (less distorted) over edges.

#### 3. Feature Matching (`find_shift`)

Determines the horizontal and vertical offset between consecutive images using SIFT feature detection.

**Algorithm:**
1. Detect SIFT keypoints and descriptors in both images
2. Match features using FLANN (Fast Library for Approximate Nearest Neighbors)
3. Apply Lowe's ratio test (threshold: 0.7) to filter good matches
4. Calculate median shift from matched keypoint positions
5. Return (dx, dy) shift values

**SIFT** (Scale-Invariant Feature Transform) is robust to:
- Scale changes
- Rotation
- Illumination variations
- Viewpoint changes

#### 4. Panorama Composition (`stitch`)

Combines all cylindrically-warped images into a single panorama:

1. **Compute all pairwise shifts** between consecutive images (including wrap-around from last to first)
2. **Normalize vertical drift** - Calculates cumulative Y-drift and subtracts average to keep horizon level
3. **Calculate absolute positions** for each image based on cumulative shifts
4. **Create canvas** large enough to hold all positioned images
5. **Composite images** using weight maps - higher weight areas override lower weight areas

```python
# Weight-based compositing
for each image at position (x, y):
    if new_weight[pixel] > existing_weight[pixel]:
        canvas[pixel] = image[pixel]
        weight_canvas[pixel] = new_weight[pixel]
```

#### 5. Loop Closure Correction (`correct_loop_closure`)

When stitching 360° panoramas, the right edge should seamlessly connect with the left edge. This step corrects any accumulated drift.

**Algorithm:**
1. Extract left edge (first 1/8 or 300px) and right edge of panorama
2. Detect SIFT features in both edges
3. Match features and compute homography using RANSAC
4. Apply perspective warp to correct misalignment

#### 6. Black Border Removal (`trim_black_borders`)

Removes black borders created during cylindrical warping and stitching:
- Iteratively checks all four borders
- Trims 2px horizontally, 1px vertically per iteration
- Continues until a clean rectangle is achieved

#### 7. Edge Inpainting (`fill_black_edges`)

Fills remaining small black gaps using the Telea inpainting algorithm:
- Creates mask of near-black pixels (grayscale < 5)
- Uses `cv2.inpaint()` with 7px radius
- Produces natural-looking fill based on surrounding pixels

### Key Dependencies

| Library | Purpose |
|---------|---------|
| OpenCV | SIFT, FLANN, warping, inpainting |
| NumPy | Array operations, coordinate transforms |
| argparse | Command-line argument parsing |

---

## Depth Panorama Stitcher

**File:** `depth_pano_stitcher.py`

A variant of the stitcher that uses **RealSense depth** to improve blending in overlap regions and reduce **parallax ghosting** (common indoors with nearby walls/objects).

### Usage

```bash
python depth_pano_stitcher.py <input_folder> -o output.png

# Optional: save stitched depth panorama
python depth_pano_stitcher.py <input_folder> -o output.png -d pano_depth.npy
python depth_pano_stitcher.py <input_folder> -o output.png -d pano_depth.png
```

### How it works

- Loads `rgb_*.png` + `depth_*.npy`
- Cylindrical warps **RGB + depth**
- Aligns consecutive frames via SIFT/ORB translation `(dx, dy)`
- Blends with a weight map that prefers:
  - image centers (less distortion)
  - **closer depth pixels** in overlaps (less parallax error)
- Crops to valid content and optionally exports stitched depth

## Frontend Architecture

### How Panoramas are Displayed

The frontend uses Three.js with React Three Fiber to create an immersive 3D viewing experience.

#### CylindricalViewer Component

**File:** `viewer/app/components/CylindricalViewer.tsx`

Creates a 3D cylinder with the panorama texture mapped to its interior surface. The user is positioned inside the cylinder and can look around by dragging.

**Key implementation details:**

```
                    ┌─────────────┐
                   /               \
                  │    Cylinder    │
                  │    (r=50)      │
                  │                │
                  │   📷 Camera    │ ← User at origin
                  │    (0,0,0)     │
                  │                │
                  │   Panorama     │
                  │   Texture      │
                   \               /
                    └─────────────┘
```

**Geometry:**
- Cylinder with radius 50 units
- Height calculated from panorama aspect ratio
- 64 segments for smooth curvature
- Open-ended (no caps)
- Rendered from inside (`THREE.BackSide`)

**Texture mapping:**
- Panorama wraps horizontally around cylinder
- `RepeatWrapping` with `repeat.x = -1` (flips for correct orientation)
- `sRGB` color space for accurate colors

**User interaction:**
- **Mouse drag** or **touch drag** to rotate view horizontally
- Rotation speed: `deltaX * 0.003` radians per pixel
- Smooth, responsive feel

```typescript
// Rotation on drag
const handleMove = (clientX: number) => {
  const deltaX = clientX - startX;
  rotationY.current -= deltaX * 0.003;
  startX = clientX;
};
```

#### PanoramaViewer Wrapper

**File:** `viewer/app/components/PanoramaViewer.tsx`

Wraps CylindricalViewer with:
- Dynamic import (`ssr: false`) - Three.js requires browser APIs
- Loading state display
- Clean interface for parent components

---

## Game Mechanics

### Game Flow

```
┌────────────┐     ┌───────────┐     ┌──────────────┐     ┌────────────┐
│   Start    │ ──► │  Playing  │ ──► │ Round Result │ ──► │ Game Over  │
│   Screen   │     │ (5 rounds)│     │   (score)    │     │  (grades)  │
└────────────┘     └───────────┘     └──────────────┘     └────────────┘
                        │                    │
                        ▼                    │
                   View Panorama ◄───────────┘
                   Click Map to Guess
                   Submit Guess
```

### State Management

**File:** `viewer/app/context/GameContext.tsx`

Uses React's `useReducer` for predictable state updates:

```typescript
interface GameState {
  status: "idle" | "playing" | "round_result" | "game_over";
  currentRound: number;
  totalRounds: number;  // 5
  totalScore: number;
  locations: Location[];
  rounds: GameRound[];
}
```

**Actions:**
- `START_GAME` - Initialize with 5 random locations
- `SUBMIT_GUESS` - Record guess, calculate distance/score
- `NEXT_ROUND` - Advance to next location
- `RESET_GAME` - Return to start screen

### Scoring System

**File:** `viewer/app/utils/scoring.ts`

**Distance calculation:** Haversine formula (great-circle distance on Earth)

**Point calculation:**
| Distance | Points |
|----------|--------|
| ≤ 10m | 5,000 (perfect) |
| 50m | ~3,033 |
| 100m | ~1,839 |
| 200m | ~670 |
| ≥ 500m | 0 |

**Formula:**
```javascript
if (distance <= 10) return 5000;
if (distance >= 500) return 0;
return Math.round(5000 * Math.exp(-0.01 * (distance - 10)));
```

### Map Integration

**File:** `viewer/app/components/map/MapContainer.tsx`

Uses Mapbox GL for interactive maps:
- **Guess mode:** Click to place marker, draggable repositioning
- **Result mode:** Shows guess (red) and actual (green) with connecting line
- Constrained to Yale campus bounds
- Zoom level 15 (building-level detail)

### Game UI Components

| Component | Purpose |
|-----------|---------|
| `StartScreen.tsx` | Title, instructions, start button |
| `GameContainer.tsx` | Panorama viewer, mini-map, submit button |
| `MapModal.tsx` | Full-screen map for precise guessing |
| `ResultsOverlay.tsx` | Round score, distance, comparison map |
| `GameOverScreen.tsx` | Final grade, breakdown, replay button |

### Grading Scale

| Score % | Grade |
|---------|-------|
| 95%+ | A+ |
| 90%+ | A |
| 85%+ | A- |
| 80%+ | B+ |
| ... | ... |
| < 60% | F |

---

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+
- Mapbox access token

### Creating New Panoramas

1. **Capture images** by rotating camera around a fixed point (RealSense script requires a Windows/Linux computer)
   ```bash
   # Using RealSense camera
   python image_collect.py

   # Or use smartphone - take 15-20 overlapping photos
   ```

2. **Stitch panorama:**
   ```bash
   python custom_pano_stitcher.py ./my_images -o my_panorama.png
   ```

3. **Add to game:**
   - Move panorama to `viewer/public/panoramas/`
   - Update `viewer/app/data/locations.ts`:
   ```typescript
   {
     id: "my-location",
     name: "My Location Name",
     coordinates: { lat: 41.XXXXX, lng: -72.XXXXX },
     panoramaUrl: "/panoramas/my_panorama.png"
   }
   ```

### Running the Frontend

```bash
cd viewer
npm install

# Set Mapbox token
export NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here

# Development
npm run dev    # http://localhost:3000

# Production
npm run build
npm start
```

### Python Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Additionally, install pyrealsense2 if planning on running image_collect.py

---

## Current Locations

| Location | Panorama Size | Coordinates |
|---------|---------------|-------------|
| Jonathan Edwards Courtyard | 22 MB | 41.309115° N, 72.930515° W |
| Becton Center | 3.0 MB | 41.312466° N, 72.925186° W |
| Morse/Stiles Underground | 3.2 MB | 41.312646° N, 72.930579° W |
| Berkeley Courtyard | 3.6 MB | 41.310395° N, 72.928070° W |
| St. Mary’s Church | 3.8 MB | 41.311813° N, 72.923900° W |
| Franklin Courtyard | 3.6 MB | 41.315036° N, 72.925620° W |
| Humanities Quadrangle | 3.7 MB | 41.312122° N, 72.929412° W |
| Marsh Lecture Hall | 2.8 MB | 41.317065° N, 72.922246° W |
| Payne Whitney Gymnasium | 3.1 MB | 41.313601° N, 72.930674° W |
| Rosenkranz Hall | 3.4 MB | 41.314469° N, 72.924591° W |
| Schwarzman Center | 2.8 MB | 41.311631° N, 72.925846° W |
| Watson Center | 2.7 MB | 41.315817° N, 72.923802° W |

---

## Technical Notes

### Why Cylindrical Projection?

For 360° panoramas, cylindrical projection is preferred over planar stitching because:
- Horizontal lines remain straight (important for architecture)
- No singularities at poles (unlike spherical)
- Natural fit for horizontal camera rotation
- Simpler to render in 3D

### SIFT vs. Other Feature Detectors

SIFT was chosen for its:
- Scale invariance (handles zoom differences)
- Rotation invariance (handles camera tilt)
- Robustness to illumination changes
- High accuracy for architectural scenes

### Loop Closure Problem

When stitching 360° panoramas, small alignment errors accumulate. After going full circle, the right edge may not align with the left edge. Our homography-based correction addresses this by:
1. Finding matching features between edges
2. Computing the transformation needed
3. Applying a subtle warp to correct the drift

---

## License

CPSC 4800 Final Project - Yale University
