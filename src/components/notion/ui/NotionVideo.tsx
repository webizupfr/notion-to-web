import { NotionMediaFrame } from "./NotionMediaFrame";

type Props = {
  src: string;
  caption?: string | null;
};

export function NotionVideo({ src, caption }: Props) {
  return (
    <NotionMediaFrame caption={caption} padding="xs">
      <div className="aspect-video w-full">
        <video controls className="h-full w-full object-cover" src={src} preload="metadata">
          Votre navigateur ne supporte pas les vidéos intégrées.
        </video>
      </div>
    </NotionMediaFrame>
  );
}
