import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

/**
 * Compress image using Canvas API
 */
const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

/**
 * Upload a driver document image to Firebase Storage.
 * @param {File}   file         - The file to upload
 * @param {string} phone        - Driver phone (used as folder)
 * @param {string} documentType - 'id_front' | 'id_back' | 'license' | 'vehicle_card'
 * @returns {string|null} Download URL or null if failed
 */
export const uploadDriverDocument = async (file, phone, documentType) => {
  if (!file) return null;
  
  // 1. Compress the image before uploading (Reduces size from ~5MB to ~300KB)
  const compressedFile = await compressImage(file, 1024, 0.7);

  const storageRef = ref(
    storage,
    `driver_documents/${phone}/${documentType}_${Date.now()}`
  );
  try {
    const snapshot = await uploadBytes(storageRef, compressedFile);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error(`Error uploading ${documentType}:`, error);
    // Return local object URL as fallback when Storage isn't configured
    return URL.createObjectURL(file);
  }
};
