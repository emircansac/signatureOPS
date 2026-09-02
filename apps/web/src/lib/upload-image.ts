export async function uploadImageFile(file: File): Promise<{ url: string; bytes: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = (await res.json()) as { url?: string; bytes?: number; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return { url: data.url, bytes: data.bytes ?? file.size };
}

export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}
