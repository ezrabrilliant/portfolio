const CLOUD_NAME = "dfyo520kj";

const UPLOADED: Record<string, string> = {
  "avatar": "avatar_h5ijl9",
  "bee": "projects/Bee",
  "cinehub": "projects/cinehub",
  "crm": "projects/CRM",
  "dl": "projects/DL",
  "gpt": "projects/GPT",
  "pawcare": "projects/PawCare",
  "pay2win": "projects/Pay2Win",
  "pedulipasal": "projects/PeduliPasal",
  "qris": "projects/QRIS",
  "posmonosuko": "POS_nawals",
  "gtid": "GTID_milsnr",
  "petakumpet": "PETAK_UMPET_r0ycfa",
};

function cloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: "auto" | number;
    format?: "auto" | "webp" | "avif";
    crop?: "fill" | "fit" | "scale" | "thumb";
    gravity?: "face" | "center" | "auto";
  } = {}
): string {
  const { width, height, quality = "auto", format = "auto", crop = "fill", gravity } = options;
  const transforms: string[] = [`f_${format}`, `q_${quality}`];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (gravity) transforms.push(`g_${gravity}`);
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(",")}/${publicId}`;
}

/** Avatar URL via Cloudinary with face-detection crop. */
export function avatarUrl(size: number = 400): string {
  return cloudinaryUrl(UPLOADED["avatar"], {
    width: size,
    height: size,
    crop: "fill",
    gravity: "face",
  });
}

/**
 * Project image URL.
 * Falls back to local /projects/ path if not uploaded to Cloudinary.
 * To add a project image to Cloudinary, upload it and add the mapping to UPLOADED above.
 */
export function projectImageUrl(filename: string, _width: number = 600): string {
  const key = filename.replace(/\.\w+$/, "").toLowerCase();
  if (UPLOADED[key]) {
    return cloudinaryUrl(UPLOADED[key], { width: _width, crop: "fit" });
  }
  return `/projects/${filename}`;
}
