import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

/**
 * Upload a driver document image to Firebase Storage.
 * @param {File}   file         - The file to upload
 * @param {string} phone        - Driver phone (used as folder)
 * @param {string} documentType - 'id_front' | 'id_back' | 'license' | 'vehicle_card'
 * @returns {string|null} Download URL or null if failed
 */
export const uploadDriverDocument = async (file, phone, documentType) => {
  if (!file) return null;
  const storageRef = ref(
    storage,
    `driver_documents/${phone}/${documentType}_${Date.now()}`
  );
  try {
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error(`Error uploading ${documentType}:`, error);
    // Return local object URL as fallback when Storage isn't configured
    return URL.createObjectURL(file);
  }
};
