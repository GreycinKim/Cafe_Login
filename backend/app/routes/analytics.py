from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, case
from app import db
from app.models import LedgerEntry, Reimbursement

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    start = request.args.get("start")
    end = request.args.get("end")

    query = db.session.query(
        func.sum(case((LedgerEntry.category == "sales", LedgerEntry.amount), else_=0)).label("total_sales"),
        func.sum(case((LedgerEntry.category == "expense", LedgerEntry.amount), else_=0)).label("total_expenses"),
        func.sum(case((LedgerEntry.category == "reimbursement", LedgerEntry.amount), else_=0)).label("total_reimbursements"),
        func.sum(case((LedgerEntry.category == "ministry_fund", LedgerEntry.amount), else_=0)).label("total_ministry_fund"),
        func.sum(case((LedgerEntry.category == "offering", LedgerEntry.amount), else_=0)).label("total_offering"),
    ).filter(LedgerEntry.status == "approved")

    if start:
        query = query.filter(LedgerEntry.entry_date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(LedgerEntry.entry_date <= datetime.strptime(end, "%Y-%m-%d").date())

    row = query.one()
    sales = float(row.total_sales or 0)
    expenses = float(row.total_expenses or 0)
    reimbursements = float(row.total_reimbursements or 0)
    ministry = float(row.total_ministry_fund or 0)
    offering = float(row.total_offering or 0)
    net_profit = sales - expenses - reimbursements - ministry

    trend_query = db.session.query(
        LedgerEntry.entry_date,
        func.sum(case((LedgerEntry.category == "sales", LedgerEntry.amount), else_=0)).label("sales"),
        func.sum(case((LedgerEntry.category == "expense", LedgerEntry.amount), else_=0)).label("expenses"),
    ).filter(LedgerEntry.status == "approved")

    if start:
        trend_query = trend_query.filter(LedgerEntry.entry_date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        trend_query = trend_query.filter(LedgerEntry.entry_date <= datetime.strptime(end, "%Y-%m-%d").date())

    trend_query = trend_query.group_by(LedgerEntry.entry_date).order_by(LedgerEntry.entry_date)
    trend_data = [
        {"date": r.entry_date.isoformat(), "sales": float(r.sales or 0), "expenses": float(r.expenses or 0)}
        for r in trend_query.all()
    ]

    reimb_filter = Reimbursement.query
    if start:
        reimb_filter = reimb_filter.join(LedgerEntry).filter(LedgerEntry.entry_date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        reimb_filter = reimb_filter.join(LedgerEntry).filter(LedgerEntry.entry_date <= datetime.strptime(end, "%Y-%m-%d").date())
    reimb_count = reimb_filter.count()

    return jsonify({
        "total_sales": sales,
        "total_expenses": expenses,
        "total_reimbursements": reimbursements,
        "total_ministry_fund": ministry,
        "total_offering": offering,
        "net_profit": net_profit,
        "reimbursement_count": reimb_count,
        "trend": trend_data,
    })
