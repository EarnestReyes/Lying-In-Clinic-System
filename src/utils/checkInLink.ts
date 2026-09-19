import { CHECK_IN_URL } from './queue';

/** Expo Go needs the running Metro project URL plus its /--/ route separator. */
export function expoGoCheckInLink(projectUrl: string): string {
  const input = projectUrl.trim();
  if (!input) throw new Error('Paste the exp:// URL shown beside "Metro waiting on" in your Expo terminal.');
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Enter a complete Expo Go URL, such as exp://192.168.1.10:8081.'); }
  if (!['exp:', 'exps:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('Use the exp:// or exps:// project URL from Expo, not the website address.');
  }
  if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)) {
    throw new Error('Use the computer’s LAN address or Expo tunnel URL. Localhost points to the phone itself.');
  }
  const projectPath = url.pathname.split('/--/')[0].replace(/\/--$/, '').replace(/\/+$/, '');
  url.pathname = `${projectPath}/--/check-in`;
  url.hash = '';
  return url.toString();
}

export function clinicCheckInLink(mode: 'installed' | 'expo', projectUrl: string): string {
  return mode === 'installed' ? CHECK_IN_URL : expoGoCheckInLink(projectUrl);
}
