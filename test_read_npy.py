import numpy as np
import cv2

depth = np.load("locations/tsai_city/depth_0.npy")

near = 200     # mm
far = 10000     # mm

depth_clipped = np.clip(depth, near, far)
norm = ((depth_clipped - near) / (far - near)) * 255
norm = norm.astype(np.uint8)


color_depth = cv2.applyColorMap(norm, cv2.COLORMAP_JET)

cv2.imshow("DEPTH COLORMAP", color_depth)
cv2.waitKey(0)

print(depth)
print(depth.shape)