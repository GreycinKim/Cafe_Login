import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Recipe
from app.activity_log import log_activity

recipes_bp = Blueprint("recipes", __name__)


@recipes_bp.route("/", methods=["GET"])
@jwt_required()
def list_recipes():
    category = request.args.get("category")
    query = Recipe.query
    if category:
        query = query.filter_by(category=category)
    recipes = query.order_by(Recipe.created_at.desc()).all()
    return jsonify([r.to_dict() for r in recipes])


@recipes_bp.route("/", methods=["POST"])
@jwt_required()
def create_recipe():
    user_id = int(get_jwt_identity())
    admin = User.query.get(user_id)
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.form.to_dict() if request.content_type and "multipart" in request.content_type else request.get_json()

    ingredients = data.get("ingredients")
    if isinstance(ingredients, str):
        import json
        try:
            ingredients = json.loads(ingredients)
        except (json.JSONDecodeError, TypeError):
            ingredients = [i.strip() for i in ingredients.split(",")]

    image_path = None
    if request.files.get("image"):
        file = request.files["image"]
        ext = file.filename.rsplit(".", 1)[1].lower() if "." in file.filename else "jpg"
        filename = f"recipe-{uuid.uuid4().hex}.{ext}"
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        image_path = filename

    recipe = Recipe(
        title=data["title"],
        category=data.get("category"),
        description=data.get("description"),
        ingredients=ingredients,
        instructions=data.get("instructions"),
        prep_time=int(data["prep_time"]) if data.get("prep_time") else None,
        cook_time=int(data["cook_time"]) if data.get("cook_time") else None,
        servings=int(data["servings"]) if data.get("servings") else None,
        image_path=image_path,
        created_by=user_id,
    )
    db.session.add(recipe)
    db.session.commit()
    log_activity(user_id, "recipe.create", "recipe", recipe.id, f"Created recipe: {recipe.title}")
    return jsonify(recipe.to_dict()), 201


@recipes_bp.route("/<int:recipe_id>", methods=["PATCH"])
@jwt_required()
def update_recipe(recipe_id):
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    recipe = Recipe.query.get_or_404(recipe_id)
    data = request.get_json()

    for field in ("title", "category", "description", "instructions", "prep_time", "cook_time", "servings"):
        if field in data:
            setattr(recipe, field, data[field])
    if "ingredients" in data:
        recipe.ingredients = data["ingredients"]

    db.session.commit()
    log_activity(admin.id, "recipe.update", "recipe", recipe_id, f"Updated recipe: {recipe.title}")
    return jsonify(recipe.to_dict())


@recipes_bp.route("/<int:recipe_id>", methods=["DELETE"])
@jwt_required()
def delete_recipe(recipe_id):
    admin = User.query.get(int(get_jwt_identity()))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    recipe = Recipe.query.get_or_404(recipe_id)
    title = recipe.title
    recipe_id_val = recipe.id
    db.session.delete(recipe)
    db.session.commit()
    log_activity(admin.id, "recipe.delete", "recipe", recipe_id_val, f"Deleted recipe: {title}")
    return jsonify({"message": "Recipe deleted"})
