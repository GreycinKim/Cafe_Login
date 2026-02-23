import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    default_db = "sqlite:///" + os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "ministry.db"
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", default_db)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")
    app.config["UPLOAD_FOLDER"] = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "uploads"
    )
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    # Allow frontend origin from env in production, or all origins for dev
    frontend_origin = os.getenv("FRONTEND_URL", "").rstrip("/")
    origins = [frontend_origin] if frontend_origin else "*"
    CORS(app, resources={r"/api/*": {"origins": origins}})

    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.receipts import receipts_bp
    from app.routes.ledger import ledger_bp
    from app.routes.reimbursements import reimbursements_bp
    from app.routes.recipes import recipes_bp
    from app.routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(receipts_bp, url_prefix="/api/receipts")
    app.register_blueprint(ledger_bp, url_prefix="/api/ledger")
    app.register_blueprint(reimbursements_bp, url_prefix="/api/reimbursements")
    app.register_blueprint(recipes_bp, url_prefix="/api/recipes")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    from app.routes.activity import activity_bp
    app.register_blueprint(activity_bp, url_prefix="/api/activity")
    from app.routes.inventory import inventory_bp
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")

    return app
