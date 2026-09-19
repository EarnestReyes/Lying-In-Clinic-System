/** Update this once when the clinic address changes. */
export const CLINIC = {
  name: 'Lying-In Clinic',
  address: 'Main St., Barangay Health Center, Imus, Cavite',
  // Set these to the clinic's exact coordinates for each deployed client site.
  coordinates: {
    latitude: 14.4299,
    longitude: 120.9360,
  },
} as const;

/** A provider-neutral map search URL that works on web and opens a maps app on devices. */
export const clinicMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLINIC.address)}`;
