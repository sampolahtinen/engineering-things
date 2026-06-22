# Chrome Extension Design Tools

A local Chrome/Brave extension for inspecting visual design details directly on any web page.

## Current MVP

- Toggle the inspector from the extension popup.
- Hover elements to highlight their box model.
- View typography, colors, dimensions, margins, padding, borders, and layout gaps.
- Click an element to pin the current inspection.
- Press `Esc` to turn the inspector off.
- Press `Alt+Shift+D` to toggle the inspector on the current tab.

## Load Locally

1. Open `chrome://extensions` or `brave://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `packages/chrome-extension-design-tools` from this repository.
5. Open a normal web page and use the extension popup to enable the inspector.

Chrome blocks extensions on internal pages such as `chrome://extensions` and the Chrome Web Store.

After changing extension files, click the reload button on this extension in `chrome://extensions`, then reload the inspected page.

You can change the keyboard shortcut at `chrome://extensions/shortcuts` or `brave://extensions/shortcuts`.
