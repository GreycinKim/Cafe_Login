import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { recipes } from "../api/endpoints";
import { apiBase } from "../api/client";
import Modal from "../components/Modal";

const CATEGORIES = ["All", "Espresso", "Non-Espresso"];
const RECIPE_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

function imageUrl(path) {
  if (!path) return null;
  const base = apiBase ? `${apiBase}/api` : "/api";
  return `${base}/receipts/image/${path}`;
}

export default function Recipes() {
  const { user } = useAuth();
  const [recipeList, setRecipeList] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [detailRecipe, setDetailRecipe] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "Espresso",
    description: "",
    ingredients: "",
    instructions: "",
    prep_time: "",
    cook_time: "",
    servings: "",
    image: null,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recipes.list(categoryFilter === "All" ? undefined : categoryFilter);
      const data = res.data?.data ?? res.data ?? [];
      setRecipeList(Array.isArray(data) ? data : []);
    } catch (err) {
      setRecipeList([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const openDetail = (recipe) => setDetailRecipe(recipe);
  const closeDetail = () => setDetailRecipe(null);

  const openAddForm = () => {
    setEditingRecipe(null);
    setForm({
      title: "",
      category: "Espresso",
      description: "",
      ingredients: "",
      instructions: "",
      prep_time: "",
      cook_time: "",
      servings: "",
      image: null,
    });
    setFormError("");
    setFormModalOpen(true);
  };

  const openEditForm = (recipe) => {
    setEditingRecipe(recipe);
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.join("\n")
      : (recipe.ingredients || "");
    setForm({
      title: recipe.title || "",
      category: recipe.category || "Espresso",
      description: recipe.description || "",
      ingredients,
      instructions: recipe.instructions || "",
      prep_time: recipe.prep_time != null ? String(recipe.prep_time) : "",
      cook_time: recipe.cook_time != null ? String(recipe.cook_time) : "",
      servings: recipe.servings != null ? String(recipe.servings) : "",
      image: null,
    });
    setFormError("");
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setEditingRecipe(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const title = form.title?.trim();
    if (!title) {
      setFormError("Title is required.");
      setSubmitting(false);
      return;
    }

    const prepTime = form.prep_time ? parseInt(form.prep_time, 10) : 0;
    const cookTime = form.cook_time ? parseInt(form.cook_time, 10) : 0;
    const servings = form.servings ? parseInt(form.servings, 10) : null;

    try {
      if (editingRecipe) {
        const ingredients = form.ingredients
          ? form.ingredients
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        await recipes.update(editingRecipe.id, {
          title,
          category: form.category,
          description: form.description?.trim() || undefined,
          ingredients,
          instructions: form.instructions?.trim() || undefined,
          prep_time: isNaN(prepTime) ? undefined : prepTime,
          cook_time: isNaN(cookTime) ? undefined : cookTime,
          servings: servings && !isNaN(servings) ? servings : undefined,
        });
      } else {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("category", form.category);
        if (form.description?.trim()) formData.append("description", form.description.trim());
        const ingredients = form.ingredients
          ? form.ingredients
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        ingredients.forEach((ing) => formData.append("ingredients", ing));
        if (form.instructions?.trim()) formData.append("instructions", form.instructions.trim());
        if (!isNaN(prepTime) && prepTime) formData.append("prep_time", prepTime);
        if (!isNaN(cookTime) && cookTime) formData.append("cook_time", cookTime);
        if (servings && !isNaN(servings)) formData.append("servings", servings);
        if (form.image) formData.append("image", form.image);

        await recipes.create(formData);
      }
      closeFormModal();
      fetchRecipes();
      if (detailRecipe && editingRecipe?.id === detailRecipe.id) {
        setDetailRecipe(null);
      }
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to save recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recipe) => {
    if (!confirm(`Delete "${recipe.title}"?`)) return;
    try {
      await recipes.remove(recipe.id);
      closeDetail();
      fetchRecipes();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete recipe.");
    }
  };

  const ingredientsList = (recipe) => {
    const ing = recipe.ingredients;
    if (Array.isArray(ing)) return ing;
    if (typeof ing === "string") return ing.split("\n").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Drinks</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <span className="text-lg font-semibold">+</span>
              Add Drink
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <svg
            className="animate-spin h-10 w-10 text-primary-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {recipeList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 rounded-xl bg-slate-50 border border-slate-100">
              No drinks found.
            </div>
          ) : (
            recipeList.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => openDetail(recipe)}
                className="text-left group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  {recipe.image_path ? (
                    <img
                      src={imageUrl(recipe.image_path)}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 group-hover:text-primary-700 transition-colors truncate">
                    {recipe.title}
                  </h3>
                  <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-900">
                    {recipe.category}
                  </span>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      {[recipe.prep_time, recipe.cook_time]
                        .filter(Boolean)
                        .map((m) => `${m} min`)
                        .join(" + ") || "—"}
                    </span>
                    {recipe.servings && (
                      <span>Serves {recipe.servings}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {recipe.description || "No description."}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailRecipe} onClose={closeDetail} title={detailRecipe?.title || ""} wide>
        {detailRecipe && (
          <div className="space-y-4">
            {detailRecipe.image_path && (
              <img
                src={imageUrl(detailRecipe.image_path)}
                alt={detailRecipe.title}
                className="w-full max-h-64 object-cover rounded-lg border border-slate-200"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-900">
                {detailRecipe.category}
              </span>
              <span className="text-sm text-slate-500">
                Prep: {detailRecipe.prep_time ?? 0} min · Brew: {detailRecipe.cook_time ?? 0} min
                {detailRecipe.servings && ` · Serves ${detailRecipe.servings}`}
              </span>
            </div>
            {detailRecipe.creator_name && (
              <p className="text-sm text-slate-600">By {detailRecipe.creator_name}</p>
            )}
            {detailRecipe.description && (
              <p className="text-slate-700">{detailRecipe.description}</p>
            )}
            {ingredientsList(detailRecipe).length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Ingredients</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {ingredientsList(detailRecipe).map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailRecipe.instructions && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Instructions</h4>
                <p className="text-slate-700 whitespace-pre-wrap">{detailRecipe.instructions}</p>
              </div>
            )}
            {isAdmin && (
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    closeDetail();
                    openEditForm(detailRecipe);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(detailRecipe)}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add/Edit Form Modal */}
      <Modal
        open={formModalOpen}
        onClose={closeFormModal}
        title={editingRecipe ? "Edit Drink" : "Add Drink"}
        wide
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="Drink name"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="Espresso">Espresso</option>
              <option value="Non-Espresso">Non-Espresso</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Brief description"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ingredients (one per line)
            </label>
            <textarea
              value={form.ingredients}
              onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
              rows={4}
              placeholder="e.g. 2 shots espresso, 8 oz milk (one per line)"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              rows={5}
              placeholder="How to make this drink..."
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prep (min)</label>
              <input
                type="number"
                min="0"
                value={form.prep_time}
                onChange={(e) => setForm((f) => ({ ...f, prep_time: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brew (min)</label>
              <input
                type="number"
                min="0"
                value={form.cook_time}
                onChange={(e) => setForm((f) => ({ ...f, cook_time: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Servings / Size</label>
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                placeholder="—"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>
          {!editingRecipe && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))}
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-800 file:font-medium hover:file:bg-primary-100"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeFormModal}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingRecipe ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
