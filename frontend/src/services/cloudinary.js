// src/services/cloudinary.js
const CLOUD_NAME = "ddhra4iy3";
const UPLOAD_PRESET = "product_images";

const uploadFile = async (file, folder) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) throw new Error("Image upload failed");

  const data = await response.json();
  return data.secure_url;
};

export const uploadToCloudinary = async (file) => {
  try {
    return await uploadFile(file, "inventory_app");
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

export const uploadLogoToCloudinary = async (file) => {
  try {
    return await uploadFile(file, "business_logos");
  } catch (error) {
    console.error("Cloudinary Logo Upload Error:", error);
    throw error;
  }
};