# 🍝 Amanda & Niv's Food Blog

Our little corner of the internet for everything we eat. Every plate gets reviewed, scored by both of us, and ranked.

**Live site:** https://nivaiges.github.io/AmandaNivFood/

## Features

- **Reviews**: dish, place, location, category, cuisine, date, price, a one-line verdict, the full review, must-orders, tags and a photo
- **Two scores per entry**: Amanda and Niv each rate out of 5 stars (half stars allowed). The overall score is the average of the two.
- **Rankings**: every card shows its overall rank (#1, #2, #3 get gold, silver and bronze). The ranked list view numbers entries in whatever order you sort by.
- **Sort by** top rated, Amanda's favorites, Niv's favorites, most debated, newest, oldest, price, or A→Z
- **Search and filter** by category and cuisine. Click a tag to see every entry with that tag.
- **🔥 Hot debate** badge when our scores are 1.5+ stars apart
- **Shareable links** to individual entries (`#entry-…`)
- Works on phones and desktops

## Adding entries

Click **+ New entry**. Where the entry ends up depends on whether that browser is connected to GitHub:

| | Where it's saved | Who sees it |
|---|---|---|
| **Not connected** | This browser's local storage | Only you, on this device |
| **Connected** (green dot on **Sync**) | Committed to `data/entries.json` in this repo. Photos go to `images/`. | Everyone, about a minute later, once GitHub Pages rebuilds |

Entries saved locally show a "This device" badge. Once you connect, a **Publish to the blog** button pushes them all up.

### Connecting GitHub (one-time setup on each device)

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):
   - **Repository access**: Only select repositories → `AmandaNivFood`
   - **Permissions → Repository permissions → Contents**: Read and write
2. On the blog, click **Sync**, paste the token, then click **Save & test connection**.

The token stays in that browser's local storage and is only ever sent to `api.github.com`. Click **Disconnect** to remove it.

### Editing the data by hand

All published entries are in [`data/entries.json`](data/entries.json). You can edit that file directly on GitHub too. Each entry looks like this:

```json
{
  "id": "unique-id",
  "title": "Tacos al Pastor",
  "place": "The corner taco truck",
  "location": "Downtown",
  "category": "Street food",
  "cuisine": "Mexican",
  "date": "2026-10-10",
  "price": 1,
  "ratings": { "amanda": 4, "niv": 4.5 },
  "verdict": "Three tacos, eight dollars, zero regrets.",
  "review": "Paragraphs separated by a blank line (\\n\\n).",
  "mustOrder": ["Al pastor"],
  "tags": ["late night"],
  "wouldReturn": true,
  "photo": "images/tacos.jpg"
}
```

Categories: `Restaurant`, `Home-cooked`, `Café & Bakery`, `Street food`, `Takeout`, `Dessert`, `Drinks`.

## GitHub Pages setup

The site is plain HTML, CSS and JS with no build step. To turn on hosting: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

```
index.html          page layout and dialogs
styles.css          the look
app.js              rendering, sorting/ranking, editor, GitHub sync
data/entries.json   published entries
images/             uploaded photos
```
