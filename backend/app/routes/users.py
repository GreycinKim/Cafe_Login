from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.activity_log import log_activity

users_bp = Blueprint("users", __name__)


def _require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        return None
    return user


@users_bp.route("/", methods=["GET"])
@jwt_required()
def list_users():
    if not _require_admin():
        return jsonify({"error": "Admin access required"}), 403
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])


@users_bp.route("/", methods=["POST"])
@jwt_required()
def create_user():
    if not _require_admin():
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    if User.query.filter_by(email=data["email"].strip().lower()).first():
        return jsonify({"error": "Email already exists"}), 409

    user = User(
        name=data["name"],
        email=data["email"].strip().lower(),
        role=data.get("role", "worker"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    log_activity(int(get_jwt_identity()), "user.create", "user", user.id, f"Created user: {user.name} ({user.email})")
    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:user_id>", methods=["PATCH"])
@jwt_required()
def update_user(user_id):
    if not _require_admin():
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if "name" in data:
        user.name = data["name"]
    if "role" in data:
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = data["is_active"]
    if "password" in data and data["password"]:
        user.set_password(data["password"])

    db.session.commit()
    log_activity(int(get_jwt_identity()), "user.update", "user", user_id, f"Updated user: {user.name}")
    return jsonify(user.to_dict())


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    if not _require_admin():
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    name = user.name
    user.is_active = False
    db.session.commit()
    log_activity(int(get_jwt_identity()), "user.deactivate", "user", user_id, f"Deactivated user: {name}")
    return jsonify({"message": "User deactivated"})
