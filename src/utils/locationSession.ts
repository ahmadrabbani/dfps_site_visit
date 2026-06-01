/** Set after Dashboard/drawer successfully grants location (Android). */
let androidLocationPrepared = false;

export function markAndroidLocationPrepared(): void {
  androidLocationPrepared = true;
}

export function clearAndroidLocationPrepared(): void {
  androidLocationPrepared = false;
}

export function isAndroidLocationPrepared(): boolean {
  return androidLocationPrepared;
}
