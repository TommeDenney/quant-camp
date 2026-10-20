export const THEMES = [
  { id: 'light', name: 'Warm cream', color: '#f4efe4' },
  { id: 'sage', name: 'Pale sage', color: '#eaf1e8' },
  { id: 'blue', name: 'Mist blue', color: '#eaf0f6' },
  { id: 'lavender', name: 'Soft lavender', color: '#f0ebf5' },
  { id: 'dark', name: 'Night', color: '#151a25' },
] as const;
export type Theme = (typeof THEMES)[number]['id'];
