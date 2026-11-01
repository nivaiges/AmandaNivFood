# 🍝 Amanda & Niv's Food Blog

Our little corner of the internet for everything we eat. Every plate gets reviewed, scored by both of us, and ranked.

**Live site:** https://nivaiges.github.io/AmandaNivFood/

## Features

- **Reviews**: dish, place, location, category, cuisine, date, price, a one-line verdict, the full review, must-orders, tags and a photo
- **Two scores per entry**: Amanda and Niv each rate out of 5 stars (half stars allowed). The overall score is the average of the two.
- **Shared or separate dishes**: tick “We shared / ordered the same thing” to rate one dish together, or untick it to enter what each of you had and rate your own dish
- **Rankings**: every card shows its overall rank (#1, #2, #3 get gold, silver and bronze). The ranked list view numbers entries in whatever order you sort by.
- **Sort by** top rated, Amanda's favorites, Niv's favorites, most debated, newest, oldest, price, or A→Z
- **Search and filter** by category and cuisine. Click a tag to see every entry with that tag.
- **Placeholder food photos**: entries without a photo get a matching stock photo (tacos for tacos, pasta for rigatoni…), labeled “Placeholder photo”, until you upload your own
- **🔥 Hot debate** badge when our scores for a shared dish are 1.5+ stars apart
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
  "title": "Taco Truck Night",
  "shared": false,
  "dishes": { "amanda": "Tacos al pastor", "niv": "Birria tacos" },
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

`shared` defaults to `true` when it's missing; in that case leave out `dishes`, and `title` is the dish you both had. When `shared` is `false`, `dishes` holds what each of you ordered, and each rating is for that person's own dish.

Categories: `Restaurant`, `Home-cooked`, `Café & Bakery`, `Street food`, `Takeout`, `Dessert`, `Drinks`.

## How it's hosted

GitHub Pages serves the site from the `gh-pages` branch. Everything gets committed to `main`, including entries saved from the blog, and the **Publish to GitHub Pages** workflow (`.github/workflows/pages.yml`) copies `main` to `gh-pages` on every push. New entries show up on the live site a minute or two after saving.

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
images/placeholders stock food photos used until an entry has its own
images/hero.jpg     header backdrop photo
```

## Credits

The header backdrop and placeholder photos are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license). To swap or add one, drop a JPEG into `images/placeholders/` and add it to `PLACEHOLDERS` in `app.js` with the keywords it should match.
