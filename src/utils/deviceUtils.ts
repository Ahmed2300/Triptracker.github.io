/**
 * Utility functions for device detection and handling Android-specific features
 */

/**
 * Detects if the current device is running Android
 * @returns boolean indicating if the device is Android
 */
export const isAndroidDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.indexOf('android') > -1;
};

/**
 * Detects if the app is running in a WebView (like Cordova or React Native WebView)
 * @returns boolean indicating if running in a WebView
 */
export const isRunningInWebView = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.indexOf('wv') > -1 || // Android WebView
    userAgent.indexOf('crosswalk') > -1 || // Crosswalk WebView
    (window as any).cordova !== undefined || // Cordova
    (window as any).ReactNativeWebView !== undefined // React Native WebView
  );
};

/**
 * Check if Android back button handling should be enabled
 */
export const shouldEnableAndroidBackButton = (): boolean => {
  return isAndroidDevice() && isRunningInWebView();
};

/**
 * Registers a handler for the Android hardware back button (when in WebView)
 * @param handler Function to call when back button is pressed
 * @returns Function to remove the event listener
 */
export const registerAndroidBackHandler = (handler: () => boolean): (() => void) => {
  if (!shouldEnableAndroidBackButton()) {
    return () => {}; // Return empty cleanup function if not on Android
  }

  // For Cordova
  const backButtonHandler = () => {
    const handled = handler();
    if (!handled) {
      // If not handled by our handler, let the default behavior occur
      (navigator as any).app?.exitApp();
    }
  };

  document.addEventListener('backbutton', backButtonHandler, false);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('backbutton', backButtonHandler, false);
  };
};

/**
 * Check if the app is running on high-end or low-end Android device
 * This is a basic heuristic based on available RAM and cores
 * @returns Promise<boolean> true if high-end device, false if low-end
 */
export const isHighEndAndroidDevice = async (): Promise<boolean> => {
  try {
    if (!isAndroidDevice()) return true; // Default to high-end for non-Android
    
    // Check if Navigator.deviceMemory is supported (Chrome 63+)
    if ('deviceMemory' in navigator) {
      const memory = (navigator as any).deviceMemory;
      if (memory < 4) return false; // Less than 4GB RAM is considered low-end
    }
    
    // Check hardware concurrency (CPU cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      return false; // Less than 4 cores is considered low-end
    }
    
    // Check if device supports SharedArrayBuffer (proxy for modern device)
    try {
      // eslint-disable-next-line no-new
      new SharedArrayBuffer(1);
      return true; // Supporting SharedArrayBuffer usually means higher-end device
    } catch (e) {
      // If device doesn't support SharedArrayBuffer, it might be older
    }
    
    // Default to true if we can't determine
    return true;
  } catch (error) {
    console.error('Error detecting device capabilities:', error);
    return true; // Default to high-end on error
  }
};

/**
 * Apply Android-specific optimizations to the app
 */
export const applyAndroidOptimizations = async (): Promise<void> => {
  if (!isAndroidDevice()) return;
  
  const isHighEnd = await isHighEndAndroidDevice();
  
  if (!isHighEnd) {
    // For low-end devices, apply performance optimizations
    
    // Reduce animation complexity
    document.documentElement.style.setProperty('--animation-duration', '0ms');
    
    // Disable some expensive CSS features
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-shadow: none !important;
        text-shadow: none !important;
        backdrop-filter: none !important;
        filter: none !important;
      }
    `;
    document.head.appendChild(style);
  }
};
