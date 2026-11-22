export function readPreference(name: string) {
  return document.cookie.split("; ").find(cookie => cookie.startsWith(name + "="))?.slice(name.length + 1);
}
export function writePreference(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
