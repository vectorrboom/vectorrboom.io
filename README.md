# Modern Photography Portfolio — GitHub Pages

A responsive, modern photography portfolio starter with:
- Dark/light theme toggle (remembers preference in this browser)
- Scroll reveal animations and reading progress bar
- Filterable gallery and full-screen lightbox
- Mobile navigation
- Reduced-motion accessibility support
- No build step, framework, paid hosting, custom domain, or DNS required

## 1. Customize the content
Search and replace these placeholders in `index.html`:
- `YOUR NAME`
- `YOUR_EMAIL@example.com`
- `YOUR_INSTAGRAM`
- Description / page title / social metadata

## 2. Add your own photographs
The site currently uses sample images from Unsplash. Before publishing, replace those image URLs in `index.html` with your own optimized images. Recommended:
- Export web JPEG or WebP copies, not RAW `.ARW` originals.
- Use descriptive filenames such as `kitten-window-light.webp`.
- Keep images around 1600–2200px on the long edge for large portfolio images.
- Use only photographs you own or have permission to display.

You can also create an `images` folder and reference local images, e.g. `images/kitten-window-light.webp`. For the large lightbox image, update the matching `data-image` attribute as well as the thumbnail `<img src>`.

## 3. Publish with GitHub Pages
1. Create a **public** repository named `YOUR_GITHUB_USERNAME.github.io`.
2. Upload `index.html`, `styles.css`, and `script.js` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose `main` and `/ (root)`; click Save.
6. Wait for the deployment, then visit `https://YOUR_GITHUB_USERNAME.github.io/`.

If your repository's default branch is `master`, choose `master` instead of `main`.

## Notes
- This is a plain static site. It does not require Jekyll, npm, or a build pipeline.
- A `github.io` address is provided free by GitHub Pages.
- A free static website does not include a backend contact form. The email link opens the visitor's email application.
- External sample images and Google Fonts require internet access. For maximum independence, download licensed image assets and use system fonts.
