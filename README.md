# Daily Bible Text — Home Assistant Integration

A fully offline Home Assistant custom integration that reads daily Bible verse entries from an EPUB file and exposes them as sensors. Supports German, English, and Spanish Watchtower-style EPUB publications.

## Features

- 📖 **Scripture** (`Tagestext` / `Scripture` / `Texto bíblico`) — today's text; the reference is available separately via the `verse_reference` attribute
- 📌 **Bible Verse** (`Bibelvers` / `Bible Verse`) — Only the text passage
- 💬 **Commentary** (`Kommentar` / `Comment` / `Comentario`) — state is the short source citation; full text is in the `commentary_text` attribute
- 🗓️ **Yeartext** (`Jahrestext` / `Yeartext` / `Texto del año`) — annual year text (disabled by default)
- 📁 **File upload** directly in the HA UI — no SSH or file access needed
- 🔤 **Auto-naming** — integration title set automatically: `Daily Bible Text <year> <langauge>`
- ⚠️ **Outdated EPUB warning** — a repair notice appears if the EPUB year does not match current year
- 🌍 **Multi-language**: German, English, Spanish (more langauges may work / auto-detected from EPUB metadata)
- 🔄 **Midnight refresh** — sensors update automatically at midnight
- 💾 **Smart caching** — EPUB is only re-parsed when the file changes
- 🌐 **Fully offline** — no internet connection required
- 🎴 **Custom Lovelace cards** — see [Custom Cards](#custom-cards) below

## Installation

### HACS (Recommended)
1. Install Integration via HACS

<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=KingDando8430&repository=HA-Daily-Bible-Text&category=integration" target="_blank" rel="noreferrer noopener"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open your Home Assistant instance and open a repository inside the Home Assistant Community Store." /></a>

2. Restart Home Assistant

<a href="https://my.home-assistant.io/redirect/repairs/" target="_blank" rel="noreferrer noopener"><img src="https://my.home-assistant.io/badges/repairs.svg" alt="Open your Home Assistant instance and show your repairs." /></a>

3. Add integration to Home Assistant

<a href="https://my.home-assistant.io/redirect/config_flow_start/?domain=daily_bible_text" target="_blank" rel="noreferrer noopener"><img src="https://my.home-assistant.io/badges/config_flow_start.svg" alt="Open your Home Assistant instance and start setting up a new integration." /></a>

### Manual
1. Copy the `custom_components/daily_bible_text/` folder to `/config/custom_components/`
2. Restart Home Assistant
3. Add integration to Home Assistant

## Setup

During setup you can:
- **Upload** the EPUB file directly via drag & drop in the HA config UI
- **Enter a path** to an EPUB already on your server

The integration title is set automatically from the EPUB metadata.

## Sensors

| Entity ID | DE name | EN name | Default |
|-----------|---------|---------|---------|
| `sensor.daily_bible_text_scripture` | Tagestext | Scripture | ✅ enabled |
| `sensor.daily_bible_text_bible_verse` | Bibelvers | Bible Verse | ✅ enabled |
| `sensor.daily_bible_text_commentary` | Kommentar | Comment | ✅ enabled |
| `sensor.daily_bible_text_yeartext` | Jahrestext | Yeartext | ❌ disabled |

### Sensor attributes

| Attribute | Description |
|-----------|-------------|
| `date` | Today's `MM-DD` key |
| `day` | Today's localized weekday name (on sensors that also have `date`) |
| `language` | Detected language |
| `verse_reference` | Extracted Bible reference |
| `source_epub` | Path to the EPUB |
| `entries_count` | Number of daily entries parsed |
| `epub_year` | Year found in EPUB metadata |
| `commentary_text` | Full commentary text (on Commentary sensor) |
| `yeartext_full` | Full yeartext (on Yeartext sensor) |

## Outdated EPUB warning

When the year in the EPUB does not match the current year, a **repair issue** appears in the Home Assistant notification area. To resolve it, upload the current year's EPUB via **Settings → Integrations → Daily Bible Text → Configure**.

## Custom Cards

Two Lovelace cards are bundled in `custom_components/daily_bible_text/frontend/daily-bible-text-cards.js`:

- **Daily Bible Text** (`custom:daily-bible-text-card`) — calendar-style card: icon + date, then the daily text with its reference. Tapping opens a detail pop-up with the full commentary and source citation.
- **Daily Bible Text (Inline)** (`custom:daily-bible-text-inline-card`) — icon next to the daily text in a single row, with the same detail pop-up.

### Install

Nothing to do — the integration serves the file itself and registers it as a dashboard resource automatically on startup (via `add_extra_js_url`, at `/daily_bible_text_frontend/daily-bible-text-cards.js`). Just:

1. Add either card via the card picker (search "Daily Bible Text"), or select an integration entity and pick it from the suggested cards.
2. Choose the **device** for your language/year in the card's editor.

If your dashboard doesn't pick it up, reload the browser once after updating/restarting Home Assistant.

Both cards read theme colors from Home Assistant CSS variables, so palette/typography changes from your active theme apply automatically. Colors can also be overridden per-card in the editor.

## Folder structure

```
/config/
  custom_components/
    daily_bible_text/
      ...                          ← integration code
      frontend/
        daily-bible-text-cards.js  ← Lovelace cards, served automatically
  daily_bible_text/
    bible_text.epub       ← uploaded EPUB (or place yours here manually)
    cache_<id>.json       ← auto-generated parse cache
```

---

## License

MIT License – see [LICENSE](LICENSE)

> This project is unofficial and is not affiliated with, endorsed, sponsored, or specifically approved by jw.org. For more information see [Terms of Use (jw.org)](https://www.jw.org/en/terms-of-use/).

---

*Icon: AI-generated image.*
