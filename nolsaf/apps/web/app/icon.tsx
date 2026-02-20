/* eslint-disable @next/next/no-img-element */
import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const contentType = 'image/png';

export default function Icon() {
  const logoPath = path.join(process.cwd(), 'public', 'assets', 'NoLS2025-04.png');
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
        <img
          src={logoSrc}
          alt="NoLSAF"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: 'scale(1.6)',
            transformOrigin: 'center',
          }}
        />
      </div>
    ),
    {
      width: 64,
      height: 64,
    }
  );
}
