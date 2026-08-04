from types import SimpleNamespace

from apps.services.calculs import (
    _line_belongs_to_site,
    should_emit_hourly_variance_alert,
    should_mark_sans_fonctionnement,
)


def test_should_not_mark_previous_activity_as_sans_fonctionnement():
    assert not should_mark_sans_fonctionnement(
        0.0,
        0.0,
        [0.0, 2.0, 0.0],
        [0.0, 42.0, 0.0],
        False,
    )


def test_should_emit_hourly_variance_alert_only_for_significant_gap():
    assert not should_emit_hourly_variance_alert(10.0, 11.0, 15.0)
    assert should_emit_hourly_variance_alert(10.0, 12.0, 15.0)


def test_line_belongs_to_site_via_cuve_journaliere():
    line = SimpleNamespace(
        cuve_principale_id=None,
        cuve_journaliere=SimpleNamespace(cuve_principale_id=7),
    )
    assert _line_belongs_to_site(line, 7)
    assert not _line_belongs_to_site(line, 8)
