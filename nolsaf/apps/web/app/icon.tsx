import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const contentType = 'image/png';

export default function Icon() {
  const logoPath = path.join(process.cwd(), 'public', 'assets', 'nolsnewlog.png');
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
          background: '#02665e',
        }}
      >
        <img
          src={logoSrc}
          alt="NoLSAF"
          style={{
            width: 28,
            height: 28,
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  );
}
