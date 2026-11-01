/** Small inline SVG icon set (16px grid, currentColor). Decorative unless labelled. */
const PATHS = {
  dashboard: 'M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z',
  phone: 'M4 2h3l1 3-2 1a7 7 0 0 0 4 4l1-2 3 1v3a1 1 0 0 1-1 1A11 11 0 0 1 3 3a1 1 0 0 1 1-1Z',
  users:
    'M6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.5 14a4.5 4.5 0 0 1 9 0M11 2.3a2.5 2.5 0 0 1 0 4.4M12.5 9.5a4.5 4.5 0 0 1 2 4.5',
  clipboard: 'M5 2.5h6v2H5zM4 3.5H3v11h10v-11h-1M5.5 8h5M5.5 11h3',
  history: 'M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v2.6h2.6M8 5v3l2 1.5',
  settings:
    'M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  upload: 'M8 11V2.5M4.5 6 8 2.5 11.5 6M2.5 11v2.5h11V11',
  play: 'M4.5 2.8v10.4L13 8Z',
  pause: 'M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z',
  back5: 'M7 4 3 8l4 4M13 4 9 8l4 4',
  fwd5: 'M3 4l4 4-4 4M9 4l4 4-4 4',
  check: 'M3 8.5 6.5 12 13 4.5',
  alert: 'M8 1.5 15 14H1ZM8 6v3.5M8 11.6v.4',
  info: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM8 7.2V11M8 4.8v.4',
  chevron: 'M6 3.5 10.5 8 6 12.5',
  menu: 'M2 4h12M2 8h12M2 12h12',
  close: 'M3.5 3.5l9 9M12.5 3.5l-9 9',
  plus: 'M8 3v10M3 8h10',
  edit: 'M10.5 2.5l3 3L6 13H3v-3ZM9 4l3 3',
  refresh: 'M13.5 8A5.5 5.5 0 1 1 11.9 4.1M13.5 2.5v2.6h-2.6',
  lock: 'M4 7.5h8v6.5H4zM5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2',
  flag: 'M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8',
  compare: 'M5 2.5v11M11 2.5v11M2.5 5H5M11 11h2.5',
  grid: 'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z',
  minus: 'M3 8h10',
  arrowUp: 'M8 13V3M4 7l4-4 4 4',
  arrowDown: 'M8 3v10M4 9l4 4 4-4',
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  size?: number;
  /** Provide for meaningful icons; omit for decorative ones. */
  label?: string | undefined;
  /** Mirror in RTL (arrows, chevrons). */
  directional?: boolean;
  className?: string | undefined;
}

export function Icon({ name, size = 16, label, directional, className }: IconProps) {
  const cls = [directional ? 'icon-directional' : '', className ?? ''].join(' ').trim();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cls || undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path
        d={PATHS[name]}
        fill={name === 'play' || name === 'pause' ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
