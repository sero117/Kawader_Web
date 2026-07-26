/** Requests the user's current position, but checks the Permissions API first so a
 *  denied/blocked location service fails immediately with onDenied() instead of
 *  hanging until getCurrentPosition's own timeout. */
export function requestLocation(
  onSuccess: (pos: GeolocationPosition) => void,
  onDenied: () => void,
  onUnsupported: () => void,
): void {
  if (!navigator.geolocation) { onUnsupported(); return; }

  const getPosition = () => {
    navigator.geolocation.getCurrentPosition(onSuccess, onDenied, { enableHighAccuracy: true, timeout: 10000 });
  };

  if (navigator.permissions?.query) {
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then(status => status.state === 'denied' ? onDenied() : getPosition())
      .catch(getPosition);
  } else {
    getPosition();
  }
}
