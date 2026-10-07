import { Platform, Alert } from 'react-native';

/**
 * Cross-platform image picker service for Doctor App.
 * Supports:
 * - Web browsers via HTML5 File Input + Canvas compression
 * - Safe fallback for mobile environments
 */

// Helper to downscale large web images to avoid database/storage bloat and keep network snappy
const compressImageWeb = (file, maxWidth = 600, maxHeight = 600, quality = 0.85) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        resolve(rawDataUrl);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

// Helper for Web File Picker
const pickFileOnWeb = (useCamera = false) => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/*';

    if (useCamera) {
      input.capture = 'user';
    }

    input.onchange = async (e) => {
      const file = e.target?.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const compressedUri = await compressImageWeb(file);
      if (!compressedUri) {
        resolve(null);
        return;
      }

      resolve({
        uri: compressedUri,
        name: file.name || (useCamera ? 'doctor_camera.jpg' : 'doctor_profile.jpg'),
        type: 'image/jpeg',
        size: compressedUri.length,
      });
    };

    input.oncancel = () => resolve(null);

    input.click();
  });
};

export const imagePickerService = {
  // Pick from Device Photo Gallery or Computer Files
  pickFromGallery: async () => {
    if (Platform.OS === 'web') {
      return await pickFileOnWeb(false);
    }
    return null;
  },

  // Capture from Web Camera or Device Camera
  takePhotoWithCamera: async () => {
    if (Platform.OS === 'web') {
      return await pickFileOnWeb(true);
    }
    return null;
  },
};
