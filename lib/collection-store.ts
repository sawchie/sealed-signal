"use client";

import { useSyncExternalStore } from "react";
import { COLLECTION_KEY, emptyCollection, parseCollection, type CollectionState } from "./collection";

type Snapshot = { state: CollectionState; ready: boolean; error: string | null; blocked: boolean };
const server: Snapshot = { state: emptyCollection(), ready: false, error: null, blocked: false };
let current = server;
const listeners = new Set<() => void>();
let watching = false;
const emit = () => listeners.forEach(listener => listener());
function load() {
  try { current = { state: parseCollection(localStorage.getItem(COLLECTION_KEY)), ready: true, error: null, blocked: false }; }
  catch { current = { ...current, ready: true, blocked: true, error: "Your collection could not be read. Nothing was overwritten. Export the stored backup before restoring a valid one." }; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    window.addEventListener("storage", event => { if (event.key === COLLECTION_KEY || event.key === null) { load(); emit(); } });
    watching = true;
  }
  return () => { listeners.delete(listener); };
}
function snapshot() { if (!current.ready) load(); return current; }

/** Re-read inside a cross-tab lock before every write; no stale-tab overwrite. */
export async function changeCollection(change: (state: CollectionState) => CollectionState, replace = false): Promise<boolean> {
  const write = () => {
    try {
      const previous = replace ? emptyCollection() : parseCollection(localStorage.getItem(COLLECTION_KEY));
      const next = parseCollection(JSON.stringify(change(previous)));
      localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
      current = { state: next, ready: true, error: null, blocked: false }; emit(); return true;
    } catch (error) {
      current = { ...current, ready: true, error: error instanceof Error ? `Not saved: ${error.message}` : "Not saved. Browser storage may be full or unavailable." };
      emit(); return false;
    }
  };
  try {
    if (!navigator.locks?.request) {
      current = { ...current, ready: true, error: "Not saved. This browser cannot safely coordinate collection changes across tabs. Use a current browser over HTTPS; your existing collection can still be exported." };
      emit(); return false;
    }
    return await navigator.locks.request(COLLECTION_KEY, write);
  }
  catch { current = { ...current, ready: true, error: "Not saved. Browser storage is unavailable." }; emit(); return false; }
}

export function useCollection() { return useSyncExternalStore(subscribe, snapshot, () => server); }
export function storedCollectionBackup() { return localStorage.getItem(COLLECTION_KEY) ?? JSON.stringify(emptyCollection()); }
