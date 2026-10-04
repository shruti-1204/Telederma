import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Cross-platform image picker service for TeleDerma.
 * Supports:
 * - Native iOS & Android via expo-image-picker
 * - Web & Desktop browsers via standard HTML5 File/Camera Input
 *
 * Keeps real file and URI data ready for future multipart/form-data upload.
 */

// Helper to downscale large web images to avoid quota errors and speed up network sync
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
      input.capture = 'environment';
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
        name: file.name || (useCamera ? 'camera_photo.jpg' : 'gallery_photo.jpg'),
        type: 'image/jpeg',
        size: compressedUri.length,
        file: file,
      });
    };

    input.oncancel = () => resolve(null);

    // Trigger click
    input.click();
  });
};

export const imagePickerService = {
  // Pick from Device Photo Gallery
  pickFromGallery: async () => {
    if (Platform.OS === 'web') {
      return await pickFileOnWeb(false);
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select a skin photo.'
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        return {
          uri: uri,
          name: asset.fileName || 'skin_gallery_photo.jpg',
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
          file: asset, // React Native asset reference for backend FormData
        };
      }
      return null;
    } catch (err) {
      console.error('Error selecting image from gallery:', err);
      return null;
    }
  },

  // Capture from Device Camera
  takePhotoWithCamera: async () => {
    if (Platform.OS === 'web') {
      return await pickFileOnWeb(true);
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to take a skin photo.'
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        return {
          uri: uri,
          name: asset.fileName || 'skin_camera_photo.jpg',
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
          file: asset, // React Native asset reference for backend FormData
        };
      }
      return null;
    } catch (err) {
      console.error('Error capturing photo from camera:', err);
      return null;
    }
  },
};
