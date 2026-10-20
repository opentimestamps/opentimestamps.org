# How to get listed as an OpenTimestamps Member

Companies that **really use OpenTimestamps** can appear in the [Members](https://opentimestamps.org/#members) section of [opentimestamps.org](https://opentimestamps.org/).

**New process:** open a pull request yourself. Do **not** comment on issue #2 to request a listing — that thread is being retired in favor of self-service PRs (see [PR #79](https://github.com/opentimestamps/opentimestamps.org/pull/79) for a complete example).

## Requirements

1. **Real use of OpenTimestamps**  
   Your product or service must create or verify OpenTimestamps proofs (`.ots`), not merely mention Bitcoin or “blockchain timestamping” in marketing copy. In the PR description, explain briefly:
   - what your company/product does;
   - how it uses OpenTimestamps (what is hashed, when proofs are created, how users can verify).

2. **Live backlink to opentimestamps.org**  
   Your public site must include a working hyperlink to `https://opentimestamps.org`.  
   In the PR description, say **exactly where** the backlink is (page URL + section, e.g. footer, FAQ, protocol docs, verification page).

3. **Logo + one HTML entry**  
   Add a transparent PNG logo and one Members block in `index.html`, matching the existing markup (details below).

## Logo rules

| Rule | Detail |
|------|--------|
| Format | **PNG** with transparency (RGBA or palette+alpha). Avoid JPEG/SVG for new entries when possible (some older members used other formats; new PRs should use PNG). |
| Path / name | `assets/images/logos/<slug>@2x.png` — lowercase slug, no spaces (example: `btcfactura@2x.png`). Older entries use mixed names (e.g. `TrustHub.png`, `logo_verisart@2x.png`); new entries should follow the lowercase `<slug>@2x.png` form. |
| Pixel size | Existing logos vary. Aim for roughly **400–800 px on the long edge** (or a square up to ~512 px). PR #79’s logo is **800×167**. Keep the file small (on the order of **~5–40 KB** is typical). |
| Display size in HTML | Set `width` / `height` on the `<img>` so the logo looks balanced next to neighbors. Common display widths in `index.html` are about **90–200** (occasionally wider for wide wordmarks). Many entries use `style="padding-top:10px;"`. |
| Content | Company/product logo on a **transparent** background; no extra marketing slogans baked into the image if avoidable. |

Only change these files in your PR:

- `assets/images/logos/<slug>@2x.png` (new file)
- `index.html` (one new `.members-i` block)

Do not regenerate CSS/JS bundles, edit unrelated pages, or reformat the whole Members section.

## Exact HTML snippet

Copy this pattern (from the live site / PR #79). Replace the placeholders:

```html
      <div class="members-i">
        <a href="https://YOUR-SITE.EXAMPLE" class="members-link">
          <img src="./assets/images/logos/your-slug@2x.png" alt="Your Company" width="190" height="40"
            style="padding-top:10px;">
          <span class="members-name">Your Company</span>
        </a>
      </div>
```

Notes:

- Keep two-space indentation consistent with surrounding entries.
- Separate your block from its neighbours with one blank line, like the existing entries.
- Adjust `width` / `height` to suit your logo’s aspect ratio.
- `alt` and `.members-name` should be the public name you want shown.

## Placement

Insert your new `.members-i` block **immediately before** the “Add your company here” CTA, which currently looks like:

```html
      <div class="members-i">
        <a href="https://github.com/opentimestamps/opentimestamps.org/blob/master/MEMBERS.md" class="members-link members-link_add">
          <img src="./assets/images/logos/company.png" alt="" width="100" height="92">
          <span class="members-name">Add your company here</span>
        </a>
      </div>
```

Your entry goes **above** that CTA `div`, still inside the Members `<div class="container">`.

## How to open the PR

1. Fork [opentimestamps/opentimestamps.org](https://github.com/opentimestamps/opentimestamps.org).
2. Branch from `master`.
3. Add the logo file and the HTML entry as above.
4. Open a pull request against `opentimestamps/opentimestamps.org`’s `master` branch.

### PR title convention

Use a short imperative title, matching recent style:

- `Add <Company> to members list`

Example: `Add BTCfactura to members list` ([PR #79](https://github.com/opentimestamps/opentimestamps.org/pull/79)).

### PR description checklist

Paste and complete:

```markdown
- [ ] We use OpenTimestamps in production (briefly described above)
- [ ] Live backlink to https://opentimestamps.org — URL/section: …
- [ ] Logo: transparent PNG at `assets/images/logos/<slug>@2x.png`
- [ ] One `.members-i` entry in `index.html`, placed just before the “Add your company here” CTA
- [ ] No unrelated file changes
```

Also include:

- Company/product name and homepage URL  
- How you use OpenTimestamps  
- Where the backlink is  
- Optional: link to a public verification page or example `.ots` proof  

## Reference example

[PR #79 – Add BTCfactura to members list](https://github.com/opentimestamps/opentimestamps.org/pull/79): transparent `btcfactura@2x.png` (800×167) plus one `.members-i` block before the CTA.

## Questions

If something in this guide is unclear, open a **new** GitHub issue about the guide itself — do not use issue #2 for new membership requests.
