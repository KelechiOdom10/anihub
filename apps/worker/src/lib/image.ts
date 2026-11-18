const malLarge =
  /^(https:\/\/cdn\.myanimelist\.net\/images\/.+)l\.(webp|jpe?g)$/;

export const coverWidth = 425;
export const coverHeight = 600;

export function coverSources(url: string) {
  const match = malLarge.exec(url);

  if (!match) return { src: url };

  return {
    src: url,
    srcSet: `${match[1]}.${match[2]} 225w, ${url} ${coverWidth}w`,
  };
}
