export const TypeUnknown = 0;
export const TypeText = 1;
export const TypeImage = 2;
export const TypeDocument = 3;
export const TypeCompression = 4;

const fileTypes = {};

(() => {
  const fillType = (arr, type) => {
    arr.forEach(ext => {
      fileTypes[ext] = type;
    });
  };
  fillType(["csv", "markdown", "md", "txt", "text", "log"], TypeText);

  fillType(
    ["apng", "png", "bmp", "gif", "jp2", "jpg2", "jpg", "jpeg", "jpe", "webp"],
    TypeImage
  );

  fillType(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf"], TypeDocument);

  fillType(["gz", "zip", "bz2", "xz"], TypeCompression);
})();

export function getFileType(name) {
  const arr = name.split(".");
  // 如果无文件后缀，忽略
  if (arr.length < 2) {
    return TypeUnknown;
  }
  const ext = arr[arr.length - 1];
  return fileTypes[ext] || TypeUnknown;
}

export function getFileTypeName(type) {
  let name = "";
  switch (Number.parseInt(type)) {
    case TypeText:
      name = "text";
      break;
    case TypeImage:
      name = "image";
      break;
    case TypeDocument:
      name = "document";
      break;
    case TypeCompression:
      name = "compression";
      break;
    default:
      name = "others";
      break;
  }
  return name;
}

export function convertCacheDate(value) {
  const str = new Date(value * 1000).toLocaleString();
  return str;
}

export function convertTimeConsuming(value) {
  const ms = 1e6;
  const second = 1e9;
  const minute = 60 * second;
  if (value > minute) {
    return `${Math.ceil(value / minute)}m`;
  }
  if (value > second) {
    return `${Math.ceil(value / second)}s`;
  }
  return `${Math.ceil(value / ms)}ms`;
}
