export const auth0Enabled = () => import.meta.env.VITE_DASHBOARD_AUTH_MODE === "auth0";
export const sessionExpired = "dex:session-expired";
