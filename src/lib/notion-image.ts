export function mapImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Possibilité future : ajouter un proxy custom ou des paramètres de transformation.
  return url;
}
