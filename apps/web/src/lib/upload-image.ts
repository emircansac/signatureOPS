export async function uploadImageFile(
  file: File,
  options?: { slot?: string },
): Promise<{ url: string; bytes: number; width?: number; height?: number }> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.slot) formData.append("slot", options.slot);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  let data: { url?: string; bytes?: number; width?: number; height?: number; error?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error("Yükleme başarısız");
  }
  if (!res.ok || !data.url) throw new Error(data.error ?? "Yükleme başarısız");
  return { url: data.url, bytes: data.bytes ?? file.size, width: data.width, height: data.height };
}

export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}
