from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, LedgerEntry, Reimbursement
from app.activity_log import log_activity

reimbursements_bp = Blueprint("reimbursements", __name__)


@reimbursements_bp.route("/", methods=["POST"])
@jwt_required()
def create_reimbursement():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    ledger_entry = LedgerEntry(
        entry_date=datetime.strptime(data["entry_date"], "%Y-%m-%d").date() if data.get("entry_date") else date.today(),
        category="reimbursement",
        amount=data["amount"],
        description=data.get("description"),
        label=data.get("label"),
        receipt_id=data.get("receipt_id"),
        created_by=user_id,
        status="pending",
    )
    db.session.add(ledger_entry)
    db.session.flush()

    reimbursement = Reimbursement(
        ledger_entry_id=ledger_entry.id,
        requested_by=user_id,
        notes=data.get("notes"),
    )
    db.session.add(reimbursement)
    db.session.commit()

    amt = reimbursement.ledger_entry.amount if reimbursement.ledger_entry else 0
    log_activity(user_id, "reimbursement.create", "reimbursement", reimbursement.id, f"Requested reimbursement #{reimbursement.id} (${amt})")
    return jsonify(reimbursement.to_dict()), 201


@reimbursements_bp.route("/mine", methods=["GET"])
@jwt_required()
def my_reimbursements():
    user_id = int(get_jwt_identity())
    items = Reimbursement.query.filter_by(requested_by=user_id).order_by(Reimbursement.created_at.desc()).all()
    return jsonify([r.to_dict() for r in items])


@reimbursements_bp.route("/pending", methods=["GET"])
@jwt_required()
def pending_reimbursements():
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    items = Reimbursement.query.filter_by(status="pending").order_by(Reimbursement.created_at.asc()).all()
    return jsonify([r.to_dict() for r in items])


@reimbursements_bp.route("/<int:reimb_id>/approve", methods=["POST"])
@jwt_required()
def approve(reimb_id):
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    reimb = Reimbursement.query.get_or_404(reimb_id)
    reimb.status = "approved"
    reimb.approved_by = admin.id
    reimb.payout_date = date.today()

    if reimb.ledger_entry:
        reimb.ledger_entry.status = "approved"

    db.session.commit()
    req_name = reimb.requester.name if reimb.requester else "?"
    log_activity(admin.id, "reimbursement.approve", "reimbursement", reimb_id, f"Approved reimbursement #{reimb_id} (requested by {req_name})")
    return jsonify(reimb.to_dict())


@reimbursements_bp.route("/<int:reimb_id>/reject", methods=["POST"])
@jwt_required()
def reject(reimb_id):
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    reimb = Reimbursement.query.get_or_404(reimb_id)
    reimb.status = "rejected"
    reimb.approved_by = admin.id

    if reimb.ledger_entry:
        reimb.ledger_entry.status = "rejected"

    db.session.commit()
    req_name = reimb.requester.name if reimb.requester else "?"
    log_activity(admin.id, "reimbursement.reject", "reimbursement", reimb_id, f"Rejected reimbursement #{reimb_id} (requested by {req_name})")
    return jsonify(reimb.to_dict())
