// Shared inline SVG icons (feather-style), used by Sidebar and FieldEditor.

export function IconEye({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export function IconEyeSlash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// Drawer toggles. The panel region fills in while that drawer is open so the
// icon mirrors the real state of the UI, not just the button's active color.

export function IconPanelLeft({ open = false, className = "w-4 h-4" }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      {open && <rect x="3" y="4" width="6" height="16" rx="2" fill="currentColor" stroke="none"/>}
      <line x1="9" y1="4" x2="9" y2="20"/>
    </svg>
  );
}

export function IconPanelRight({ open = false, className = "w-4 h-4" }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      {open && <rect x="15" y="4" width="6" height="16" rx="2" fill="currentColor" stroke="none"/>}
      <line x1="15" y1="4" x2="15" y2="20"/>
    </svg>
  );
}

// Sort by type (FieldEditor footer): three rows shrinking downward, the
// conventional "sorted" glyph, drawn at the same stroke as the eye icons.
export function IconSortByType({ className = "w-4 h-4", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="15" y2="12"/>
      <line x1="4" y1="18" x2="10" y2="18"/>
    </svg>
  );
}
