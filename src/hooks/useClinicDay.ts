import { useEffect, useState } from 'react';
import { clinicDay } from '../utils/queue';
export function useClinicDay() {
  const [day, setDay] = useState(clinicDay);
  useEffect(() => {
    const timer = setInterval(() => setDay(clinicDay()), 15000);
    return () => clearInterval(timer);
  }, []);
  return day;
}
