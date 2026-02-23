from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, ActivityLog

activity_bp = Blueprint("activity", __name__)


@activity_bp.route("/", methods=["GET"])
@jwt_required()
def list_activity():
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({"error": "User not found"}), 404

    query = ActivityLog.query
    if current_user.role != "admin":
        query = query.filter_by(user_id=user_id)

    start = request.args.get("start")
    end = request.args.get("end")
    if start:
        query = query.filter(ActivityLog.created_at >= datetime.strptime(start, "%Y-%m-%d"))
    if end:
        query = query.filter(ActivityLog.created_at < datetime.strptime(end, "%Y-%m-%d") + timedelta(days=1))
    entity_type = request.args.get("entity_type")
    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    user_filter = request.args.get("user_id")
    if user_filter and current_user.role == "admin":
        query = query.filter_by(user_id=int(user_filter))

    logs = query.order_by(ActivityLog.created_at.desc()).limit(500).all()
    return jsonify([log.to_dict() for log in logs])
