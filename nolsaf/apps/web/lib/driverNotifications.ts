/**
 * Driver Notification and Vibration Utilities
 * Handles notifications, vibrations, and location-based alerts for drivers
 */

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLat / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Play notification sound
export function playNotificationSound() {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Bell-like sound (two tones)
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    // Second tone after short delay
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      oscillator2.frequency.value = 1000;
      oscillator2.type = 'sine';
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.3);
    }, 150);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

// Trigger device vibration
export function vibrate(pattern: number | number[] = [200, 100, 200]) {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn('Vibration not supported or failed:', error);
  }
}

// Show browser notification (requires permission)
export async function showBrowserNotification(
  title: string,
  body: string,
  options?: NotificationOptions
) {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/assets/nolsnewlog.png',
          badge: '/assets/nolsnewlog.png',
          ...options,
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/assets/nolsnewlog.png',
            badge: '/assets/nolsnewlog.png',
            ...options,
          });
        }
      }
    }
  } catch (error) {
    console.warn('Browser notification failed:', error);
  }
}

// Combined notification: sound + vibration + browser notification
export async function notifyDriver(
  title: string,
  message: string,
  options?: {
    vibrate?: boolean;
    sound?: boolean;
    browserNotification?: boolean;
    vibrationPattern?: number | number[];
  }
) {
  const {
    vibrate: enableVibration = true,
    sound: enableSound = true,
    browserNotification: enableBrowserNotification = true,
    vibrationPattern = [200, 100, 200],
  } = options || {};

  // Play sound
  if (enableSound) {
    playNotificationSound();
  }

  // Vibrate
  if (enableVibration) {
    vibrate(vibrationPattern);
  }

  // Browser notification
  if (enableBrowserNotification) {
    await showBrowserNotification(title, message);
  }
}

// Monitor location and alert when arriving at pickup or destination
export class LocationMonitor {
  private watchId: number | null = null;
  private targetLat: number | null = null;
  private targetLng: number | null = null;
  private arrivalThreshold: number = 0.05; // 50 meters in km
  private checkInterval: number = 3000; // Check every 3 seconds
  private onArrivalCallback: (() => void) | null = null;
  private hasArrived: boolean = false;

  /**
   * Start monitoring driver location for arrival at target
   * @param targetLat Target latitude
   * @param targetLng Target longitude
   * @param onArrival Callback when driver arrives (within threshold)
   * @param threshold Distance threshold in km (default: 0.05km = 50m)
   */
  startMonitoring(
    targetLat: number,
    targetLng: number,
    onArrival: () => void,
    threshold: number = 0.05
  ) {
    this.targetLat = targetLat;
    this.targetLng = targetLng;
    this.arrivalThreshold = threshold;
    this.onArrivalCallback = onArrival;
    this.hasArrived = false;

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    // Check location periodically
    const checkLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const driverLat = position.coords.latitude;
          const driverLng = position.coords.longitude;

          const distance = calculateDistance(
            driverLat,
            driverLng,
            this.targetLat!,
            this.targetLng!
          );

          // If within threshold and hasn't already arrived
          if (distance <= this.arrivalThreshold && !this.hasArrived) {
            this.hasArrived = true;
            // Alert driver
            notifyDriver(
              'Arrival Alert',
              `You have arrived at the destination. Distance: ${(distance * 1000).toFixed(0)}m`,
              {
                vibrate: true,
                sound: true,
                vibrationPattern: [300, 100, 300, 100, 300], // Triple vibration
              }
            );
            // Call callback
            if (this.onArrivalCallback) {
              this.onArrivalCallback();
            }
          }
        },
        (error) => {
          console.warn('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    };

    // Initial check
    checkLocation();

    // Set up interval
    this.watchId = window.setInterval(checkLocation, this.checkInterval);
  }

  /**
   * Stop monitoring location
   */
  stopMonitoring() {
    if (this.watchId !== null) {
      clearInterval(this.watchId);
      this.watchId = null;
    }
    this.targetLat = null;
    this.targetLng = null;
    this.onArrivalCallback = null;
    this.hasArrived = false;
  }

  /**
   * Reset arrival state (useful when moving to new destination)
   */
  reset() {
    this.hasArrived = false;
  }
}

