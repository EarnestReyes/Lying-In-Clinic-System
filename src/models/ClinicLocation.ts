export interface ClinicLocation {
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  updatedAt?: any;
}

