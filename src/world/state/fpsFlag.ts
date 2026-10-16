/** The meter shows with ?fps in the address (polish #16): a friend's device reports what it really draws. */
export const FPS_METER = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fps");
