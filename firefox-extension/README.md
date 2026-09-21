# Inky for Firefox

Inky turns ordinary web pages into a high-contrast, page-by-page reading surface.

## Features

- Swipe horizontally on any web page to activate reading mode.
- Swipe left/right, use the mouse wheel, or press `PageUp`, `PageDown`, `ArrowUp`, `ArrowDown`, or Space to move one page at a time.
- Uses Mozilla Readability to extract the primary article and remove surrounding page chrome.
- Presents the extracted article with a high-contrast white reading surface and strongly underlined links for e-ink screens.
- Keeps the original page intact underneath the reader view so exiting restores the page without reloading it.
- Removes shadows and text effects that create unnecessary ghosting.
- Converts images, video, canvas, and SVG artwork to grayscale with slightly higher contrast.
- Shows a small `PAGE MODE · ON` control so reading mode can be turned off without reopening the extension menu.
- Includes Page Up and Page Down buttons in the on-page control and toolbar popup.
- Press `Escape` to exit reading mode.
- The toolbar popup can toggle the mode for the current page.

## Install temporarily in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on…**.
3. Select `manifest.json` from this folder.
4. Open an article and swipe horizontally, or use the extension button.

Temporary add-ons are removed when Firefox restarts. For permanent installation, package and submit the extension through Firefox Add-ons.

## Notes

- Firefox blocks extensions from modifying internal pages such as `about:debugging`, the Add-ons Manager, and the built-in New Tab page.
- Reading mode is remembered for the current Firefox profile and restored when the page is opened again.
- The swipe threshold is 48 pixels, which is intentionally forgiving for e-ink touchscreens.