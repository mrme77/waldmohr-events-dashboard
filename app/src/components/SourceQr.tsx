import { QRCodeSVG } from "qrcode.react";

interface SourceQrProps {
  url: string;
  title: string;
}

/** Keeps the kiosk on the dashboard while a phone opens the public source. */
export function SourceQr({ url, title }: SourceQrProps): JSX.Element {
  let source: URL;
  try {
    source = new URL(url);
    if (!["https:", "http:"].includes(source.protocol) || url.length > 2048) {
      throw new Error("Unsupported source URL");
    }
  } catch {
    return <p role="status">A QR code is unavailable for this source.</p>;
  }

  return (
    <figure className="source-qr">
      <QRCodeSVG
        value={url}
        size={240}
        level="M"
        marginSize={4}
        title={`Scan to read the source for ${title}`}
      />
      <figcaption>
        <strong>Scan to read on your phone</strong>
        <p>Open your phone’s camera and point it at this code.</p>
        <span>{source.hostname}</span>
      </figcaption>
    </figure>
  );
}
