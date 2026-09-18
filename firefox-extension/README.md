# E-ink Reader for Firefox

E-ink Reader turns ordinary web pages into a high-contrast, page-by-page reading surface.

## Features

- Swipe horizontally on any web page to activate reading mode.
- Swipe left/right, use the mouse wheel, or press `PageUp`, `PageDown`, `ArrowUp`, `ArrowDown`, or Space to move one page at a time.
- Forces white backgrounds and black text for improved e-ink contrast.
- Underlines links with a strong black rule so destinations remain easy to find.
- Converts sticky and fixed-position page elements into normal document flow, so headers stay near the beginning and footers stay near the end instead of covering every page.
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