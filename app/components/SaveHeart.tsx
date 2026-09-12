"use client";

export function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 5h3V3h4v2h4V3h4v2h3v8h-3v3h-3v3h-3v2h-2v-2H7v-3H4v-3H3Z" />
    <path className="save-heart__shine" d="M6 7h3v2H6Z" />
  </svg>;
}

export function SaveHeart({ name, saved, onToggle }: { name: string; saved: boolean; onToggle: () => void }) {
  return <button className="save-heart" type="button" aria-pressed={saved}
    aria-label={`${saved ? "Remove" : "Save"} ${name}${saved ? " from saved items" : " to saved items"}`}
    title={saved ? "Remove from saved items" : "Save on this device"} onClick={onToggle}>
    <HeartIcon />
  </button>;
}
