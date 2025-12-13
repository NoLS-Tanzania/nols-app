# PropertyPreview Component - Usage Guide

## Overview
The `PropertyPreview` component is a comprehensive, Booking.com-style property preview that can be used by admins, owners, and public users. It displays all property details including images, amenities, rooms, location, and more.

## How to Access

### Option 1: Through Admin Properties List
1. Navigate to `/admin/properties`
2. Find a property in the list
3. Click the "View" button (eye icon)
4. You'll see the full PropertyPreview component

### Option 2: Direct URL
- Admin view: `/admin/properties/[propertyId]`
- Example: `/admin/properties/1`

### Option 3: Demo Page
1. Navigate to `/admin/properties/demo`
2. Enter a property ID
3. Select preview mode (admin/public/owner)
4. Click "View Preview"

## Features

### 1. Image Gallery
- **Large main image** with navigation arrows
- **Thumbnail strip** showing first 5 images
- **Full-screen lightbox** - Click "View all photos" to open
- **Image counter** showing current image number
- **Keyboard navigation** in lightbox (arrow keys)

### 2. Property Information
- **Title and location** with map pin icon
- **Property type** badge
- **Description** section
- **Amenities grid** with icons (WiFi, Parking, Pool, etc.)
- **Room specifications** with pricing
- **Location details** with address

### 3. Admin Features (Admin Mode Only)
- **Edit Mode**: Click "Edit" button to modify:
  - Property title
  - Description
  - Base price
  - Currency
- **Approve Button**: Approve pending properties
- **Reject Button**: Reject with reasons dialog
- **Status Badge**: Shows current property status
- **Owner Information**: Contact details card

### 4. Public Features (Public Mode)
- **Booking Card**: Shows price per night
- **Reserve Button**: Ready for booking integration
- **Clean Layout**: Optimized for customer viewing

## Component Props

```typescript
interface PropertyPreviewProps {
  propertyId: number;        // Required: Property ID from database
  mode?: "admin" | "public" | "owner";  // Optional: Default "public"
  onApproved?: () => void;   // Optional: Callback when approved
  onRejected?: () => void;  // Optional: Callback when rejected
  onUpdated?: () => void;   // Optional: Callback when updated
}
```

## Usage Examples

### Admin View
```tsx
import PropertyPreview from "@/components/PropertyPreview";

<PropertyPreview
  propertyId={123}
  mode="admin"
  onApproved={() => console.log("Approved!")}
  onRejected={() => console.log("Rejected!")}
/>
```

### Public View
```tsx
<PropertyPreview
  propertyId={123}
  mode="public"
/>
```

### Owner View
```tsx
<PropertyPreview
  propertyId={123}
  mode="owner"
/>
```

## Workflow

### Admin Review Process:
1. **Owner submits property** → Status: `PENDING`
2. **Admin navigates** to `/admin/properties`
3. **Admin clicks "View"** on a pending property
4. **PropertyPreview loads** with all details
5. **Admin reviews**:
   - Images gallery
   - Amenities
   - Room details
   - Location
6. **Admin can**:
   - **Edit** if needed (click Edit button)
   - **Approve** (click Approve button)
   - **Reject** (click Reject, provide reasons)
7. **Owner receives notification** when approved/rejected
8. **Property status updates** automatically

## API Endpoints Used

- `GET /admin/properties/:id` - Fetch property details (admin mode)
- `GET /owner/properties/:id` - Fetch property details (owner mode)
- `GET /public/properties/:id` - Fetch property details (public mode)
- `PATCH /admin/properties/:id` - Update property (admin only)
- `POST /admin/properties/:id/approve` - Approve property
- `POST /admin/properties/:id/reject` - Reject property

## Styling

The component uses:
- **Tailwind CSS** for styling
- **Responsive design** (mobile, tablet, desktop)
- **Booking.com-inspired** layout
- **Smooth transitions** and hover effects
- **Accessible** with proper ARIA labels

## Testing

### To test the component:

1. **Create a test property** (as owner):
   - Go to `/owner/properties/add`
   - Fill in all required fields
   - Add at least 3 photos
   - Submit for review

2. **View as admin**:
   - Go to `/admin/properties`
   - Find your test property (status: PENDING)
   - Click "View" button
   - See full preview

3. **Test features**:
   - Navigate images
   - Open lightbox
   - Click Edit button
   - Try approving/rejecting
   - Check responsive design on mobile

## Troubleshooting

### Property not loading?
- Check if property ID exists in database
- Verify authentication token (for admin/owner modes)
- Check browser console for errors

### Images not showing?
- Verify image URLs are valid
- Check CORS settings if images are external
- Ensure images are uploaded correctly

### Edit not working?
- Verify you're in admin mode
- Check API endpoint is accessible
- Review browser console for errors

## Next Steps

- Integrate with booking system (public mode)
- Add map integration (Google Maps/Mapbox)
- Add image upload/delete for admin
- Add more edit fields (rooms, amenities)
- Add property comparison feature
