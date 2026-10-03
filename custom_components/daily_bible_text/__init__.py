"""Daily Bible Text integration."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .coordinator import BibleTextCoordinator

_LOGGER = logging.getLogger(__name__)
PLATFORMS = ["sensor"]

FRONTEND_URL_BASE = f"/{DOMAIN}_frontend"
FRONTEND_JS_FILE = "daily-bible-text-loader.js"
FRONTEND_MAIN_FILE = "daily-bible-text-cards.js"


def _files_hash(*paths: Path) -> str:
    digest = hashlib.sha1()
    for path in paths:
        digest.update(path.read_bytes())
    return digest.hexdigest()[:10]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the Lovelace cards at startup, independent of config entries."""
    await _async_register_frontend(hass)
    return True


async def _async_register_lovelace_resource(hass: HomeAssistant, url: str) -> bool:
    """Add/update the card bundle as a Lovelace resource (storage mode).

    Dashboards load their resources before cards are built, which is more
    reliable than the extra-module injection alone. Returns False in YAML
    mode or if the Lovelace resource API is unavailable.
    """
    data = hass.data.get("lovelace")
    if data is None:
        return False
    resources = getattr(data, "resources", None)
    if resources is None and isinstance(data, dict):
        resources = data.get("resources")
    if resources is None or not hasattr(resources, "async_create_item"):
        return False
    try:
        if not getattr(resources, "loaded", True):
            await resources.async_load()
            resources.loaded = True
        base = url.split("?", 1)[0]
        old_base = f"{FRONTEND_URL_BASE}/{FRONTEND_MAIN_FILE}"
        for item in list(resources.async_items()):
            if item.get("url", "").split("?", 1)[0] == old_base:
                await resources.async_delete_item(item["id"])
        for item in resources.async_items():
            item_url = item.get("url", "")
            if item_url.split("?", 1)[0] != base:
                continue
            if item_url != url or item.get("type") != "module":
                await resources.async_update_item(
                    item["id"], {"res_type": "module", "url": url}
                )
            return True
        await resources.async_create_item({"res_type": "module", "url": url})
        return True
    except Exception as exc:  # noqa: BLE001
        _LOGGER.warning("Could not register Lovelace resource: %s", exc)
        return False


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve custom_components/daily_bible_text/frontend/ and auto-load the cards.

    Registered once regardless of how many config entries (languages/years)
    are set up, and skipped entirely if the frontend file is missing.
    """
    flag = f"{DOMAIN}_frontend_registered"
    if hass.data.get(flag):
        return
    frontend_dir = Path(__file__).parent / "frontend"
    js_file = frontend_dir / FRONTEND_JS_FILE
    main_file = frontend_dir / FRONTEND_MAIN_FILE
    if not js_file.is_file() or not main_file.is_file():
        _LOGGER.error("Frontend files missing in %s", frontend_dir)
        return
    hass.data[flag] = True
    # Cache-bust by content hash so browsers never keep a stale card bundle.
    version = await hass.async_add_executor_job(_files_hash, js_file, main_file)
    url = f"{FRONTEND_URL_BASE}/{FRONTEND_JS_FILE}?v={version}"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL_BASE, str(frontend_dir), True)]
    )
    # Same URL for both loaders: the browser evaluates the loader only once.
    add_extra_js_url(hass, url)
    await _async_register_lovelace_resource(hass, url)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = BibleTextCoordinator(hass, entry)
    try:
        await coordinator.async_setup()
    except Exception as exc:
        _LOGGER.error("Failed to set up Daily Bible Text: %s", exc)
        raise

    await _async_register_frontend(hass)

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_on_options_update))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        coordinator: BibleTextCoordinator = hass.data[DOMAIN].pop(entry.entry_id)
        await coordinator.async_shutdown()
    return unload_ok


async def _async_reload_on_options_update(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
