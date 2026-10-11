/** Shared between the server layout and client theme code, so it must not be
 *  a client module. */
export const THEME_KEY = "law-theme";

/**
 * Runs before paint so the first frame is already the right theme — without
 * this the page flashes light before React reads the saved choice.
 */
export const THEME_BOOT_SCRIPT = `try{var s=localStorage.getItem("${THEME_KEY}");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}`;
