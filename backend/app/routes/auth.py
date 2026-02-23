from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.hardcoded_users import HARDCODED_USERS

auth_bp = Blueprint("auth", __name__)


def _get_or_create_user(username, name, role):
    """Ensure a User row exists for this hardcoded user (for FK use)."""
    user = User.query.filter_by(email=username).first()
    if user:
        user.name = name
        user.role = role
        user.is_active = True
        db.session.commit()
        return user
    user = User(name=name, email=username, role=role)
    user.password_hash = "hardcoded"  # not used; auth is from hardcoded_users.py
    db.session.add(user)
    db.session.commit()
    return user


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    match = None
    for u in HARDCODED_USERS:
        if u["username"] == username and u["password"] == password:
            match = u
            break

    if not match:
        return jsonify({"error": "Invalid username or password"}), 401

    user = _get_or_create_user(
        username=match["username"],
        name=match["name"],
        role=match["role"],
    )
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/seed-admin", methods=["POST"])
def seed_admin():
    return jsonify({"error": "Auth uses hardcoded users; seed-admin is disabled"}), 410
