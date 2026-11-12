const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function HeartIcon({ filled, size = 26 }) {
  return (
    <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'} strokeWidth={filled ? 1 : 1.8}>
      <path d="M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7.5 2.9c0 5-7.5 9.6-7.5 9.6Z" />
    </svg>
  )
}

export function CommentIcon({ size = 26 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M21 11.6a8.4 8.4 0 0 1-9 8.3 9.6 9.6 0 0 1-3.6-.7L4 20.5l1.3-3.8A8.2 8.2 0 0 1 3.5 12a8.4 8.4 0 0 1 9-8.3 8.4 8.4 0 0 1 8.5 7.9Z" />
    </svg>
  )
}

export function BookmarkIcon({ filled, size = 26 }) {
  return (
    <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 3.5h12v17L12 16l-6 4.5v-17Z" />
    </svg>
  )
}

export function ShareIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M21.5 3 10.8 13.8" />
      <path d="M21.5 3 15 21l-4.2-7.2L3.5 9.5 21.5 3Z" />
    </svg>
  )
}

export function VolumeIcon({ size = 22 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  )
}

export function MuteIcon({ size = 22 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="m16 9.5 5 5" />
      <path d="m21 9.5-5 5" />
    </svg>
  )
}

export function HomeIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5v11h13v-11" />
      <path d="M10 20.5v-6h4v6" />
    </svg>
  )
}

export function SearchIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  )
}

export function PlusIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

export function UserIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  )
}

export function PlayIcon({ size = 26 }) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <path d="M8 5.5 19 12 8 18.5v-13Z" />
    </svg>
  )
}

export function PauseIcon({ size = 26 }) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <rect x="7" y="5" width="3.6" height="14" rx="1" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1" />
    </svg>
  )
}

export function CloseIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M5 5 19 19M19 5 5 19" />
    </svg>
  )
}

export function MusicIcon({ size = 14 }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={1.6}>
      <path d="M9 18V6.5l9-2V16" />
      <circle cx="7" cy="18" r="2.4" />
      <circle cx="16" cy="16" r="2.4" />
    </svg>
  )
}

export function VerifiedIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5 15 5l3.8.5 1 3.7L22 12l-2.2 2.8-1 3.7L15 19l-3 2.5L9 19l-3.8-.5-1-3.7L2 12l2.2-2.8 1-3.7L9 5l3-2.5Z" />
      <path d="m8 12.2 2.6 2.6L16 9.4" stroke="#05070a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SendIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 12 20 4l-4 16-5-6-7-2Z" />
    </svg>
  )
}

export function TrashIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </svg>
  )
}

export function SparkIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 3v4.5M12 16.5V21M4.5 12H9M15 12h4.5M6.4 6.4l3 3M14.6 14.6l3 3M17.6 6.4l-3 3M9.4 14.6l-3 3" />
    </svg>
  )
}

export function UploadIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15v3.5h15V15" />
    </svg>
  )
}

export function GridIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />
    </svg>
  )
}

export function StepBackIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M18 6v12L8 12l10-6Z" fill="currentColor" stroke="none" />
      <path d="M6 5v14" />
    </svg>
  )
}

export function StepForwardIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M6 6v12l10-6L6 6Z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </svg>
  )
}

export function UndoIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 9h9a5 5 0 0 1 0 10H8" />
      <path d="m8 5-4 4 4 4" />
    </svg>
  )
}

export function RedoIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M20 9h-9a5 5 0 0 0 0 10h5" />
      <path d="m16 5 4 4-4 4" />
    </svg>
  )
}

export function SplitIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="6" cy="18" r="2.6" />
      <path d="M8.2 7.6 20 18M8.2 16.4 20 6" />
    </svg>
  )
}

export function CopyIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 5.5h-9a2 2 0 0 0-2 2v9" />
    </svg>
  )
}

export function DownloadIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 17v3h15v-3" />
    </svg>
  )
}

export function EyeIcon({ size = 14 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function LockIcon({ size = 14 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  )
}

export function FilmIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7.5 4v16M16.5 4v16M3 9.5h4.5M3 14.5h4.5M16.5 9.5H21M16.5 14.5H21" />
    </svg>
  )
}
