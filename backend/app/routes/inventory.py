from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, InventoryItem
from app.activity_log import log_activity

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.route("/", methods=["GET"])
@jwt_required()
def list_inventory():
    items = InventoryItem.query.order_by(InventoryItem.name).all()
    return jsonify([i.to_dict() for i in items])


@inventory_bp.route("/", methods=["POST"])
@jwt_required()
def create_item():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if InventoryItem.query.filter_by(name=name).first():
        return jsonify({"error": "Item already exists"}), 409
    qty = float(data.get("quantity", 0) or 0)
    unit = (data.get("unit") or "").strip() or None
    now = datetime.utcnow()
    item = InventoryItem(name=name, quantity=qty, unit=unit, last_edited_by=user_id, last_edited_at=now)
    db.session.add(item)
    db.session.commit()
    log_activity(user_id, "inventory.create", "inventory", item.id, f"Added item: {name} (qty {qty})")
    return jsonify(item.to_dict()), 201


@inventory_bp.route("/<int:item_id>", methods=["PATCH"])
@jwt_required()
def update_item(item_id):
    user_id = int(get_jwt_identity())
    item = InventoryItem.query.get_or_404(item_id)
    data = request.get_json()
    now = datetime.utcnow()
    if "quantity" in data:
        item.quantity = float(data["quantity"])
    if "name" in data:
        name = (data["name"] or "").strip()
        if name and name != item.name:
            if InventoryItem.query.filter_by(name=name).first():
                return jsonify({"error": "Item with that name already exists"}), 409
            item.name = name
    if "unit" in data:
        item.unit = (data["unit"] or "").strip() or None
    item.last_edited_by = user_id
    item.last_edited_at = now
    db.session.commit()
    log_activity(user_id, "inventory.update", "inventory", item.id, f"Updated {item.name} to qty {item.quantity}")
    return jsonify(item.to_dict())


@inventory_bp.route("/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_item(item_id):
    user_id = int(get_jwt_identity())
    item = InventoryItem.query.get_or_404(item_id)
    name = item.name
    db.session.delete(item)
    db.session.commit()
    log_activity(user_id, "inventory.delete", "inventory", item_id, f"Removed item: {name}")
    return jsonify({"message": "Item deleted"})
