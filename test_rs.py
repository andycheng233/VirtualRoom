import pyrealsense2 as rs
import numpy as np
import cv2

# --- Check if any RealSense devices are visible ---
ctx = rs.context()
devices = ctx.query_devices()
if len(devices) == 0:
    print("No RealSense devices found. :(")
    print("Troubleshooting tips:")
    print(" - Make sure the camera is plugged in directly (not through a weak hub).")
    print(" - Use a USB 3.0 port and the original cable if possible.")
    print(" - Verify the camera shows up in the RealSense Viewer / OS device list.")
    raise SystemExit

print("Found devices:")
for dev in devices:
    print("  -", dev.get_info(rs.camera_info.name),
          "| Serial:", dev.get_info(rs.camera_info.serial_number))

pipeline = rs.pipeline()
config = rs.config()

config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)

# Also useful: print what configuration was resolved
try:
    profile = pipeline.start(config)
    print("Pipeline started successfully.")
except Exception as e:
    print("Error starting pipeline:", e)
    raise

try:
    while True:
        frames = pipeline.wait_for_frames()
        depth_frame = frames.get_depth_frame()
        color_frame = frames.get_color_frame()

        if not depth_frame or not color_frame:
            print("Missing depth or color frame, skipping...")
            continue

        depth_image = np.asanyarray(depth_frame.get_data())
        color_image = np.asanyarray(color_frame.get_data())

        depth_colormap = cv2.applyColorMap(
            cv2.convertScaleAbs(depth_image, alpha=0.03),
            cv2.COLORMAP_JET
        )

        cv2.imshow('Depth', depth_colormap)
        cv2.imshow('Color', color_image)

        if cv2.waitKey(1) == 27:  # ESC
            break
finally:
    pipeline.stop()
    cv2.destroyAllWindows()
