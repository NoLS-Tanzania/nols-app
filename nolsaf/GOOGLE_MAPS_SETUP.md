# Google Maps API Key Setup

This document explains how to set up Google Maps API for interactive maps in the Property Preview component.

## Steps to Enable Google Maps

### 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps Embed API** (for embedded maps)
   - **Maps JavaScript API** (for advanced map features)
   - **Geocoding API** (optional, for address lookups)

### 2. Create API Key

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy your API key

### 3. Restrict Your API Key (Recommended)

For security, restrict your API key:

1. Click on your API key to edit it
2. Under **Application restrictions**, select **HTTP referrers**
3. Add your domain(s):
   - `http://localhost:3000/*` (for development)
   - `https://yourdomain.com/*` (for production)
4. Under **API restrictions**, select **Restrict key**
5. Choose only the APIs you need:
   - Maps Embed API
   - Maps JavaScript API
   - Geocoding API (if using)

### 4. Add to Environment Variables

Add the API key to your Next.js environment file:

**File: `nolsaf/apps/web/.env.local`**

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 5. Restart Development Server

After adding the environment variable, restart your Next.js development server:

```bash
cd nolsaf/apps/web
npm run dev
```

## Usage

The Property Preview component will automatically use the API key if it's set. The map will:

- Display an interactive Google Maps embed
- Show the property location with a marker
- Allow users to click "View on Google Maps" for full map view

## Fallback Behavior

If no API key is provided, the component will:
- Show a placeholder with coordinates
- Display a message prompting to add the API key
- Still provide a link to view on Google Maps

## Cost Considerations

Google Maps API has a free tier:
- **$200 free credit per month**
- Maps Embed API: Free (unlimited)
- Maps JavaScript API: $7 per 1,000 requests after free tier
- Geocoding API: $5 per 1,000 requests after free tier

For most applications, the free tier is sufficient. Monitor your usage in the Google Cloud Console.

## Security Notes

- **Never commit API keys to version control**
- Always use environment variables
- Restrict API keys to specific domains/IPs
- Rotate keys if compromised
- Monitor usage for unexpected spikes

## Troubleshooting

### Map not showing
- Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
- Verify the API key is not restricted incorrectly
- Check browser console for errors
- Ensure Maps Embed API is enabled

### "RefererNotAllowedMapError"
- Add your domain to the API key restrictions
- Include both `http://` and `https://` if needed
- Check for trailing slashes in restrictions

### API key quota exceeded
- Check usage in Google Cloud Console
- Consider implementing caching
- Review API key restrictions
