"""Update inventory from receipt OCR items."""
from datetime import datetime
from app import db
from app.models import InventoryItem


def add_receipt_items_to_inventory(receipt, user_id):
    """Parse receipt ocr_raw.items and add/update inventory. Called after receipt is saved."""
    ocr = receipt.ocr_raw or {}
    items = ocr.get("items") or []
    if not items:
        return
    now = datetime.utcnow()
    for it in items:
        name = (it.get("name") or "").strip()
        if not name:
            continue
        qty = it.get("quantity")
        if qty is None:
            qty = 1
        try:
            qty = float(qty)
        except (TypeError, ValueError):
            qty = 1
        existing = InventoryItem.query.filter_by(name=name).first()
        if existing:
            existing.quantity = (float(existing.quantity) or 0) + qty
            existing.last_edited_by = user_id
            existing.last_edited_at = now
        else:
            new_item = InventoryItem(
                name=name,
                quantity=qty,
                last_edited_by=user_id,
                last_edited_at=now,
            )
            db.session.add(new_item)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
