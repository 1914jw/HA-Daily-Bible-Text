"""Daily Bible Text integration."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .coordinator import BibleTextCoordinator

_LOGGER = logging.getLogger(__name__)
PLATFORMS = ["sensor"]

FRONTEND_VERSION = "1.1.0"
FRONTEND_URL_BASE = f"/{DOMAIN}_frontend"
FRONTEND_JS_FILE = "daily-bible-text-cards.js"


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve custom_components/daily_bible_text/frontend/ and auto-load the cards.

    Registered once regardless of how many config entries (languages/years)
    are set up, and skipped entirely if the frontend dir is missing.
    """
    flag = f"{DOMAIN}_frontend_registered"
    if hass.data.get(flag):
        return
    frontend_dir = Path(__file__).parent / "frontend"
    if not frontend_dir.is_dir():
        return
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL_BASE, str(frontend_dir), True)]
    )
    add_extra_js_url(hass, f"{FRONTEND_URL_BASE}/{FRONTEND_JS_FILE}?v={FRONTEND_VERSION}")
    hass.data[flag] = True


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
