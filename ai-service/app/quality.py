import cv2
import numpy as np


def _center_crop(gray, frac=0.5):
    """
    Crop the central region of the grayscale image.

    frac=0.5 means:
    - 50% of the image height
    - 50% of the image width
    """
    h, w = gray.shape

    ch = int(h * frac)
    cw = int(w * frac)

    y0 = (h - ch) // 2
    x0 = (w - cw) // 2

    return gray[y0:y0 + ch, x0:x0 + cw]


def check_image_quality(image_bytes: bytes) -> dict:
    """
    Takes raw image bytes and returns an image quality verdict.
    """

    # Convert bytes to NumPy array
    arr = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    # Decode image
    img = cv2.imdecode(
        arr,
        cv2.IMREAD_COLOR
    )

    # Invalid image
    if img is None:
        return {
            "quality": "POOR",
            "score": 0.0,
            "reason": "File is not a readable image"
        }

    # Image dimensions
    h, w = img.shape[:2]

    # Convert to grayscale
    gray = cv2.cvtColor(
        img,
        cv2.COLOR_BGR2GRAY
    )

    # --------------------------------
    # Blur detection
    # --------------------------------

    # Use center region instead of entire image
    center = _center_crop(gray)

    # Laplacian variance
    # Higher value = generally sharper
    blur_score = cv2.Laplacian(
        center,
        cv2.CV_64F
    ).var()

    # --------------------------------
    # Brightness detection
    # --------------------------------

    brightness = gray.mean()

    # Debug information
    print(
        f"DEBUG -> "
        f"size={w}x{h}, "
        f"blur_score={blur_score:.2f}, "
        f"brightness={brightness:.2f}"
    )

    # --------------------------------
    # Quality checks
    # --------------------------------

    # 1. Resolution
    if min(h, w) < 224:
        return {
            "quality": "POOR",
            "score": 0.0,
            "reason": "Resolution too low"
        }

    # 2. Too dark
    if brightness < 50:
        return {
            "quality": "POOR",
            "score": round(brightness / 50, 2),
            "reason": "Image is too dark"
        }

    # 3. Overexposed
    if brightness > 210:
        return {
            "quality": "POOR",
            "score": round(
                (255 - brightness) / 45,
                2
            ),
            "reason": "Image is overexposed"
        }

    # 4. Too blurry
    if blur_score < 100:
        return {
            "quality": "POOR",
            "score": round(
                blur_score / 100,
                2
            ),
            "reason": "Image is too blurry"
        }

    # --------------------------------
    # Final quality score
    # --------------------------------

    score = min(
        blur_score / 300,
        1.0
    )

    return {
        "quality": "GOOD",
        "score": round(score, 2),
        "reason": None
    }