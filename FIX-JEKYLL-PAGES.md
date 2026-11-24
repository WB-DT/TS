# Why the old Pages builds failed

None of these were push errors. The push always succeeded; the builds failed
afterwards, on every push to `main`.

- **`pages build and deployment`** — GitHub's own legacy build. Pages was set to
  *Deploy from a branch* → `main` / root, so GitHub ran a Jekyll build over the
  whole repository. Jekyll walked `quoteflow/node_modules` and treated `{{...}}`
  in package documentation as Liquid, so the build failed every time.
- **`.github/workflows/pages.yml`** — its verify step ran
  `test -f quoteflow/.nojekyll`, and that dotfile had never been committed
  (the GitHub web uploader skips hidden files), so the job stopped before it
  uploaded anything.
- **`.github/workflows/jekyll-docker.yml`** ("Deploy ACT CRM to GitHub Pages") —
  it copied `Test.html`, `ThemeStyle.css` and `scripts/` from the repository
  root, where those files no longer exist.

## Current setup

Pages builds this branch, which contains only static files. No Actions workflow
runs, so there is no YAML step to fail, and there is no `node_modules` for
Jekyll to scan. `.nojekyll` is kept as a belt-and-braces guard: it tells Pages
to publish the files exactly as they are instead of running Jekyll.

## If the site stops updating

1. **Settings → Pages**: Source is *Deploy from a branch*, branch
   `quoteflow-pages`, folder `/ (root)`.
2. Confirm `.nojekyll` is still at the root of this branch. Files starting with
   a dot are easy to lose when uploading through the browser.
3. **Actions** tab: `pages build and deployment` should be green. Nothing else
   should be deploying this site.
