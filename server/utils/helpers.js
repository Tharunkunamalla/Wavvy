export const cleanUrl = (url) => {
  if (!url) return "";
  const trimmedUrl = url.trim();
  const match = trimmedUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/,
  );
  if (match && match[1]) {
    return `https://www.youtube.com/watch?v=${match[1]}`;
  }
  return trimmedUrl;
};
