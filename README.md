# Vectorrboom — latest responsive portfolio + uploader

This package contains the latest dark, responsive portfolio UI and GitHub-powered uploader.

## Pages
- `index.html` — clean homepage, without the brand-reel MP4 or horizontal category ticker/gallery filters. The Portfolio links open the dedicated portfolio page.
- `portfolio.html` — dedicated gallery page matching the approved mockup: dimmed mountain background with slow infinite zoom in/out, category count buttons, responsive photo grid, lightbox, bottom Lock Grid and Upload controls.
- `portfolio-ui.css` and `portfolio-ui.js` — portfolio styling and GitHub uploader/gallery behavior.
- `styles.css` and `script.js` — homepage styling and interactions.
- `privacy.html`, `robots.txt`, `sitemap.xml`, `assets/` — supporting site files. No MP4 reel is included.

## Deploy to GitHub Pages
1. Unzip this archive.
2. Copy the contents of the `vectorrboom_latest` folder into the root of `vectorrboom/vectorrboom.io`, replacing the corresponding files. Keep all HTML, CSS and JS files at the repository root and keep the `assets` folder.
3. Commit and push to `main`.
4. Open `https://vectorrboom.github.io/vectorrboom.io/portfolio.html`. The homepage Portfolio links also open this dedicated page.

## Uploader
- Click **Upload**. Paste a fine-grained GitHub token and choose **Validate token**.
- Token validation checks `/user` and repository access; GitHub enforces actual write permission on upload.
- Select Image or Video, a category, then browse or drag/drop files.
- Images are uploaded to `asset/img/<category>/`; videos to `asset/video/<category>/`. Category paths: `misc`, `event`, `portraits`, `pets`, `pre-wedding`. GitHub creates the folder path as part of the first file commit.
- The gallery scans the public repository and derives category counts from uploaded image paths. Video uploads are stored but are not shown as image tiles in the photo grid.
- Upload progress reflects browser request-body transfer, not GitHub Pages deployment progress. Deployment can take a few minutes.
- Unlock Grid enables the layout editor: drag and drop photo cards to reorder them and choose 2–8 desktop columns. Save Layout writes `asset/grid-layout.json` to GitHub so the order and column setting can be loaded by all visitors. Lock Grid disables dragging and hides the layout editor. The layout editor is available only after token validation.
- The token is held in JavaScript memory only and the UI session expires after one hour. Reloading requires entering the token again.

## Token setup and safety
Create a fine-grained personal access token for resource owner `vectorrboom`, limited to repository `vectorrboom/vectorrboom.io`, with `Contents: Read and write` and an expiration date. Do not commit the token or use it on a shared device. A browser-only static website cannot make a token completely secret from malicious extensions or compromised JavaScript. Repository scope and GitHub permissions are the actual security boundary.

## Notes
The mountain background is loaded from Unsplash, so it requires an internet connection. The repository must be public for the public gallery API to read image paths without a token.
