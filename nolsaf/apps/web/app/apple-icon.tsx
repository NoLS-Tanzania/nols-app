/* eslint-disable @next/next/no-img-element */
import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const contentType = 'image/png';

// Read once at module load — avoids synchronous file I/O on every request
const _logoPath = path.join(process.cwd(), 'public', 'assets', 'NoLS2025-04.png');
const _logoSrc = `data:image/png;base64,${fs.readFileSync(_logoPath).toString('base64')}`;

export default function AppleIcon() {
  const logoSrc = _logoSrc;

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
            transform: 'scale(1.25)',
            transformOrigin: 'center',
          }}
        />
      </div>
    ),
    {
      width: 180,
      height: 180,
    }
  );
}
