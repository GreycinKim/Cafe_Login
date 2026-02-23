from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, case, cast, Numeric
from app import db
from app.models import User, LedgerEntry, LEDGER_CATEGORIES
from app.activity_log import log_activity

ledger_bp = Blueprint("ledger", __name__)


@ledger_bp.route("/", methods=["POST"])
@jwt_required()
def create_entry():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    category = data.get("category")
    if category not in LEDGER_CATEGORIES:
        return jsonify({"error": f"Invalid category. Must be one of: {LEDGER_CATEGORIES}"}), 400

    entry = LedgerEntry(
        entry_date=datetime.strptime(data["entry_date"], "%Y-%m-%d").date() if data.get("entry_date") else date.today(),
        category=category,
        amount=data["amount"],
        description=data.get("description"),
        label=data.get("label"),
        receipt_id=data.get("receipt_id"),
        created_by=user_id,
        status=data.get("status", "approved"),
    )
    db.session.add(entry)
    db.session.commit()
    log_activity(user_id, "ledger.create", "ledger", entry.id, f"Entry #{entry.id}: {entry.category} ${entry.amount}")
    return jsonify(entry.to_dict()), 201


@ledger_bp.route("/", methods=["GET"])
@jwt_required()
def list_entries():
    query = LedgerEntry.query

    start = request.args.get("start")
    end = request.args.get("end")
    if start:
        query = query.filter(LedgerEntry.entry_date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(LedgerEntry.entry_date <= datetime.strptime(end, "%Y-%m-%d").date())

    entries = query.order_by(LedgerEntry.entry_date.desc()).all()
    return jsonify([e.to_dict() for e in entries])


@ledger_bp.route("/daily-summary", methods=["GET"])
@jwt_required()
def daily_summary():
    start = request.args.get("start")
    end = request.args.get("end")

    query = db.session.query(
        LedgerEntry.entry_date,
        LedgerEntry.label,
        LedgerEntry.created_by,
        User.name.label("created_by_name"),
        func.sum(case((LedgerEntry.category == "sales", LedgerEntry.amount), else_=0)).label("sales"),
        func.sum(case((LedgerEntry.category == "expense", LedgerEntry.amount), else_=0)).label("expenses"),
        func.sum(case((LedgerEntry.category == "reimbursement", LedgerEntry.amount), else_=0)).label("reimbursement"),
        func.sum(case((LedgerEntry.category == "ministry_fund", LedgerEntry.amount), else_=0)).label("college_ministry_fund"),
        func.sum(case((LedgerEntry.category == "offering", LedgerEntry.amount), else_=0)).label("offering"),
    ).filter(LedgerEntry.status == "approved").join(User, LedgerEntry.created_by == User.id)

    if start:
        query = query.filter(LedgerEntry.entry_date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(LedgerEntry.entry_date <= datetime.strptime(end, "%Y-%m-%d").date())

    query = query.group_by(LedgerEntry.entry_date, LedgerEntry.label, LedgerEntry.created_by, User.name).order_by(LedgerEntry.entry_date)
    results = query.all()

    rows = []
    totals = {"sales": 0, "expenses": 0, "reimbursement": 0, "college_ministry_fund": 0, "offering": 0, "net_profit": 0}

    for r in results:
        sales = float(r.sales or 0)
        expenses = float(r.expenses or 0)
        reimbursement = float(r.reimbursement or 0)
        ministry = float(r.college_ministry_fund or 0)
        offering = float(r.offering or 0)
        net = sales - expenses - reimbursement - ministry

        rows.append({
            "date": r.entry_date.isoformat(),
            "user_id": r.created_by,
            "user_name": r.created_by_name,
            "label": r.label,
            "sales": sales,
            "expenses": expenses,
            "reimbursement": reimbursement,
            "college_ministry_fund": ministry,
            "offering": offering,
            "net_profit": net,
        })

        totals["sales"] += sales
        totals["expenses"] += expenses
        totals["reimbursement"] += reimbursement
        totals["college_ministry_fund"] += ministry
        totals["offering"] += offering

    totals["net_profit"] = totals["sales"] - totals["expenses"] - totals["reimbursement"] - totals["college_ministry_fund"]

    return jsonify({"rows": rows, "totals": totals})


@ledger_bp.route("/<int:entry_id>", methods=["PATCH"])
@jwt_required()
def update_entry(entry_id):
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    entry = LedgerEntry.query.get_or_404(entry_id)
    data = request.get_json()

    for field in ("category", "amount", "description", "label", "status"):
        if field in data:
            setattr(entry, field, data[field])
    if "entry_date" in data:
        entry.entry_date = datetime.strptime(data["entry_date"], "%Y-%m-%d").date()

    db.session.commit()
    log_activity(admin.id, "ledger.update", "ledger", entry.id, f"Updated entry #{entry.id}")
    return jsonify(entry.to_dict())


@ledger_bp.route("/<int:entry_id>", methods=["DELETE"])
@jwt_required()
def delete_entry(entry_id):
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    entry = LedgerEntry.query.get_or_404(entry_id)
    entry_id_val = entry.id
    details = f"Deleted entry #{entry_id} ({entry.category} ${entry.amount})"
    db.session.delete(entry)
    db.session.commit()
    log_activity(admin.id, "ledger.delete", "ledger", entry_id_val, details)
    return jsonify({"message": "Entry deleted"})
