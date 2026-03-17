import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

export const uploadDriverDocument = async (file, driverPhone, documentType) => {
  if (!file) return null;
  // Use driver phone as unique folder identifier
  const storageRef = ref(storage, `driver_documents/${driverPhone}/${documentType}_${Date.now()}`);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading document:", error);
    return null;
  }
};
