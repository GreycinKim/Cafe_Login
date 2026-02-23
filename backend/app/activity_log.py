"""Audit trail: record who did what."""
from app import db
from app.models import ActivityLog


def log_activity(user_id, action, entity_type=None, entity_id=None, details=None):
    """Record an action for the activity log. Call after db.session.commit()."""
    try:
        entry = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details[:512] if details else None,
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()
