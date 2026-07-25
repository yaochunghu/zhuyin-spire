const PHONE_LAYOUT_QUERY =
  '(max-width: 600px), (max-height: 500px) and (orientation: landscape)';

export function isPhoneLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}
