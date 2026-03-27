/**
 * Compress image and convert directly to Base64 (Data URI)
 * Bypassing Firebase Storage completely to avoid billing/CORS issues.
 * Images are shrunk heavily and saved as text strings in Firestore.
 */
const compressImageToBase64 = (file, maxWidth = 800, quality = 0.5) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(null);
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

        // Convert the canvas graphic directly to a lightweight Base64 string
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(null);
    };
    reader.onerror = () => resolve(null);
  });
};

/**
 * Encode driver document as Base64 string for direct Firestore entry.
 * @param {File}   file         - The file to encode
 * @param {string} phone        - Driver phone (unused now but kept for signature)
 * @param {string} documentType - Document type (unused now)
 * @returns {string|null}      Base64 string or null
 */
export const uploadDriverDocument = async (file, phone, documentType) => {
  if (!file) return null;
  
  try {
    // Compress and get Data URL
    const base64String = await compressImageToBase64(file, 800, 0.5);
    return base64String;
  } catch (error) {
    console.error(`Error encoding ${documentType}:`, error);
    return null;
  }
};
