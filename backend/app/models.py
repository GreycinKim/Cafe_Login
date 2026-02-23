from datetime import datetime, date
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="worker")  # admin | worker
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
        }


class Receipt(db.Model):
    __tablename__ = "receipts"

    id = db.Column(db.Integer, primary_key=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    image_path = db.Column(db.String(512), nullable=False)
    ocr_raw = db.Column(db.JSON, nullable=True)
    merchant_name = db.Column(db.String(256), nullable=True)
    transaction_date = db.Column(db.Date, nullable=True)
    total_amount = db.Column(db.Numeric(12, 2), nullable=True)
    pinecone_id = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    uploader = db.relationship("User", backref="receipts")

    def to_dict(self):
        return {
            "id": self.id,
            "uploaded_by": self.uploaded_by,
            "uploaded_by_name": self.uploader.name if self.uploader else None,
            "image_path": self.image_path,
            "ocr_raw": self.ocr_raw,
            "merchant_name": self.merchant_name,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "total_amount": float(self.total_amount) if self.total_amount else None,
            "pinecone_id": self.pinecone_id,
            "created_at": self.created_at.isoformat(),
        }


LEDGER_CATEGORIES = ["sales", "expense", "reimbursement", "ministry_fund", "offering"]
LEDGER_STATUSES = ["pending", "approved", "rejected"]


class LedgerEntry(db.Model):
    __tablename__ = "ledger_entries"

    id = db.Column(db.Integer, primary_key=True)
    entry_date = db.Column(db.Date, nullable=False, default=date.today)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.String(512), nullable=True)
    label = db.Column(db.String(256), nullable=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey("receipts.id"), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="approved")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    receipt = db.relationship("Receipt", backref="ledger_entries")
    creator = db.relationship("User", backref="ledger_entries")

    def to_dict(self):
        return {
            "id": self.id,
            "entry_date": self.entry_date.isoformat(),
            "category": self.category,
            "amount": float(self.amount),
            "description": self.description,
            "label": self.label,
            "receipt_id": self.receipt_id,
            "created_by": self.created_by,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Reimbursement(db.Model):
    __tablename__ = "reimbursements"

    id = db.Column(db.Integer, primary_key=True)
    ledger_entry_id = db.Column(db.Integer, db.ForeignKey("ledger_entries.id"), nullable=False)
    requested_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending")
    notes = db.Column(db.Text, nullable=True)
    payout_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ledger_entry = db.relationship("LedgerEntry", backref="reimbursement")
    requester = db.relationship("User", foreign_keys=[requested_by], backref="reimbursement_requests")
    approver = db.relationship("User", foreign_keys=[approved_by], backref="reimbursement_approvals")

    def to_dict(self):
        return {
            "id": self.id,
            "ledger_entry_id": self.ledger_entry_id,
            "requested_by": self.requested_by,
            "requester_name": self.requester.name if self.requester else None,
            "approved_by": self.approved_by,
            "approver_name": self.approver.name if self.approver else None,
            "status": self.status,
            "notes": self.notes,
            "payout_date": self.payout_date.isoformat() if self.payout_date else None,
            "created_at": self.created_at.isoformat(),
            "ledger_entry": self.ledger_entry.to_dict() if self.ledger_entry else None,
        }


class Recipe(db.Model):
    __tablename__ = "recipes"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    category = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    ingredients = db.Column(db.JSON, nullable=True)
    instructions = db.Column(db.Text, nullable=True)
    prep_time = db.Column(db.Integer, nullable=True)
    cook_time = db.Column(db.Integer, nullable=True)
    servings = db.Column(db.Integer, nullable=True)
    image_path = db.Column(db.String(512), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship("User", backref="recipes")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "description": self.description,
            "ingredients": self.ingredients,
            "instructions": self.instructions,
            "prep_time": self.prep_time,
            "cook_time": self.cook_time,
            "servings": self.servings,
            "image_path": self.image_path,
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ActivityLog(db.Model):
    """Record of who did what for audit trail."""
    __tablename__ = "activity_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(80), nullable=False)  # e.g. ledger.create, reimbursement.approve
    entity_type = db.Column(db.String(40), nullable=True)  # ledger, receipt, reimbursement, recipe, user
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.String(512), nullable=True)  # human-readable summary
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="activity_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "created_at": self.created_at.isoformat(),
        }


class InventoryItem(db.Model):
    """Editable inventory count; updated from receipt scans and manual edits."""
    __tablename__ = "inventory_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False, unique=True)
    quantity = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    unit = db.Column(db.String(40), nullable=True)  # e.g. oz, lb, each
    last_edited_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    last_edited_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    editor = db.relationship("User", backref="inventory_edits")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "quantity": float(self.quantity),
            "unit": self.unit,
            "last_edited_by": self.last_edited_by,
            "last_edited_by_name": self.editor.name if self.editor else None,
            "last_edited_at": self.last_edited_at.isoformat() if self.last_edited_at else None,
            "created_at": self.created_at.isoformat(),
        }
