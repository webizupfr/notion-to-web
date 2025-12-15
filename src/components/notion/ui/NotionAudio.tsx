import { NotionMediaFrame } from "./NotionMediaFrame";

type Props = {
  src: string;
  caption?: string | null;
};

export function NotionAudio({ src, caption }: Props) {
  return (
    <NotionMediaFrame caption={caption} padding="m">
      <audio controls className="w-full" src={src}>
        Votre navigateur ne supporte pas l’audio intégré.
      </audio>
    </NotionMediaFrame>
  );
}
