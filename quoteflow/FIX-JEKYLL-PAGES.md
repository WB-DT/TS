# Fix the GitHub Pages Jekyll build failure

The failing workflow used `actions/jekyll-build-pages@v1` against the repository root. Jekyll then scanned `quoteflow/node_modules`, interpreted `{{...}}` text in package documentation as Liquid templates, and failed.

This package deploys only the static `quoteflow` folder with `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`. It does not invoke Jekyll. The included `.nojekyll` file is an additional safeguard.

## Required repository layout

```text
TS/
├── .github/workflows/pages.yml
└── quoteflow/
    ├── .nojekyll
    ├── index.html
    ├── 404.html
    └── README.md
```

Delete old Pages workflows that contain either:

```text
actions/jekyll-build-pages
jekyll-build-pages
```

Also remove any committed `quoteflow/node_modules` directory from Git tracking:

```powershell
git rm -r --cached quoteflow/node_modules
git commit -m "Remove node_modules and deploy QuoteFlow without Jekyll"
git push origin main
```

If the folder was never committed, `git rm` may report that the path did not match. That is harmless.

In repository **Settings > Pages**, set **Source** to **GitHub Actions**.
