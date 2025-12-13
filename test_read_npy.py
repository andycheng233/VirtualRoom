import numpy as np
import cv2

depth = np.load("locations/rosenkranz/depth_40.npy")

'''near = 200     # mm
far = 10000     # mm

depth_clipped = np.clip(depth, near, far)
norm = ((depth_clipped - near) / (far - near)) * 255
norm = norm.astype(np.uint8)


color_depth = cv2.applyColorMap(norm, cv2.COLORMAP_JET)'''

depth_colormap = cv2.applyColorMap(
            cv2.convertScaleAbs(depth, alpha=0.03),
            cv2.COLORMAP_JET
        )
        

cv2.imshow("DEPTH COLORMAP", depth_colormap)
cv2.waitKey(0)

cv2.imwrite("report_images/" + "depth_40" + ".png", depth_colormap)


print(depth)
print(depth.shape)