import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Receipt
from app.services.ocr_service import run_ocr, upsert_to_pinecone, search_receipts
from app.activity_log import log_activity
from app.services.inventory_service import add_receipt_items_to_inventory

receipts_bp = Blueprint("receipts", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@receipts_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_receipt():
    user_id = int(get_jwt_identity())

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not _allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    try:
        ocr_data = run_ocr(filepath)
    except Exception as e:
        ocr_data = {"error": str(e)}

    tx_date = None
    if ocr_data.get("transaction_date"):
        try:
            tx_date = datetime.strptime(ocr_data["transaction_date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    receipt = Receipt(
        uploaded_by=user_id,
        image_path=filename,
        ocr_raw=ocr_data,
        merchant_name=ocr_data.get("merchant_name"),
        transaction_date=tx_date,
        total_amount=ocr_data.get("total_amount"),
    )
    db.session.add(receipt)
    db.session.commit()

    log_activity(user_id, "receipt.upload", "receipt", receipt.id, f"Uploaded receipt #{receipt.id}" + (f" ({receipt.merchant_name})" if receipt.merchant_name else ""))

    add_receipt_items_to_inventory(receipt, user_id)

    embedding_text = f"{receipt.merchant_name or ''} {receipt.total_amount or ''} {ocr_data.get('category_suggestion', '')}"
    try:
        pinecone_id = upsert_to_pinecone(
            receipt.id,
            embedding_text,
            {
                "receipt_id": receipt.id,
                "merchant": receipt.merchant_name or "",
                "amount": float(receipt.total_amount) if receipt.total_amount else 0,
                "date": receipt.transaction_date.isoformat() if receipt.transaction_date else "",
            },
        )
        if pinecone_id:
            receipt.pinecone_id = pinecone_id
            db.session.commit()
    except Exception:
        pass

    return jsonify(receipt.to_dict()), 201


@receipts_bp.route("/", methods=["GET"])
@jwt_required()
def list_receipts():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user.role == "admin":
        receipts = Receipt.query.order_by(Receipt.created_at.desc()).all()
    else:
        receipts = Receipt.query.filter_by(uploaded_by=user_id).order_by(Receipt.created_at.desc()).all()

    return jsonify([r.to_dict() for r in receipts])


@receipts_bp.route("/<int:receipt_id>", methods=["PATCH"])
@jwt_required()
def update_receipt(receipt_id):
    receipt = Receipt.query.get_or_404(receipt_id)
    data = request.get_json()

    if "merchant_name" in data:
        receipt.merchant_name = data["merchant_name"]
    if "transaction_date" in data:
        try:
            receipt.transaction_date = datetime.strptime(data["transaction_date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass
    if "total_amount" in data:
        receipt.total_amount = data["total_amount"]

    db.session.commit()
    log_activity(int(get_jwt_identity()), "receipt.update", "receipt", receipt_id, f"Updated receipt #{receipt_id}")
    return jsonify(receipt.to_dict())


@receipts_bp.route("/search", methods=["GET"])
@jwt_required()
def search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([])

    try:
        results = search_receipts(q)
        receipt_ids = [r["metadata"].get("receipt_id") for r in results if r["metadata"].get("receipt_id")]
        receipts = Receipt.query.filter(Receipt.id.in_(receipt_ids)).all()
        receipt_map = {r.id: r.to_dict() for r in receipts}

        enriched = []
        for r in results:
            rid = r["metadata"].get("receipt_id")
            if rid in receipt_map:
                entry = receipt_map[rid]
                entry["search_score"] = r["score"]
                enriched.append(entry)

        return jsonify(enriched)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@receipts_bp.route("/image/<filename>", methods=["GET"])
def serve_image(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
