const extensionTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ics: "text/calendar",
};

export function withKnownFileType(file: File): File {
  const type = extensionTypes[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!type || (file.type && file.type !== "application/octet-stream")) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified });
}

export function matchesFileAccept(file: File, accept: string): boolean {
  return accept.split(",").some((entry) => {
    const rule = entry.trim().toLowerCase();
    if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
    if (rule.endsWith("/*")) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
    return file.type.toLowerCase() === rule;
  });
}

// Only runs after the user chooses a photo. Native capture needs no live camera
// stream and keeps the regular file chooser available as a separate action.
export async function createCameraFile(file: File, output: "jpeg" | "pdf"): Promise<File> {
  const source = withKnownFileType(file);
  if (!source.type.startsWith("image/") || source.size === 0) throw new Error("Invalid image");

  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Invalid image dimensions");

    const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const name = `photo-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    if (output === "pdf") {
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const ratio = Math.min((pageWidth - 20) / canvas.width, (pageHeight - 20) / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      document.addImage(
        canvas.toDataURL("image/jpeg", 0.9),
        "JPEG",
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height,
      );
      return new File([document.output("blob")], `${name}.pdf`, { type: "application/pdf" });
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Image processing failed"))),
        "image/jpeg",
        0.9,
      );
    });
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
