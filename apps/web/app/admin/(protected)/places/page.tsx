"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";

interface Place {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

interface PlaceForm {
  name: string;
  order: string;
  isActive: boolean;
}

const EMPTY: PlaceForm = { name: "", order: "", isActive: true };

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null=closed, "create"=new modal, Place object=edit modal
  const [modal, setModal] = useState<"create" | Place | null>(null);
  const [form, setForm] = useState<PlaceForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/api/places");
      if (!res.ok) {
        setError("Could not load places.");
        return;
      }
      setPlaces(await res.json());
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setFormError(null);
    setModal("create");
  }

  function openEdit(place: Place) {
    setForm({
      name: place.name,
      order: String(place.order),
      isActive: place.isActive,
    });
    setFormError(null);
    setModal(place);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const body: Record<string, unknown> = {
      name: form.name,
      isActive: form.isActive,
    };
    if (form.order !== "") body.order = parseInt(form.order, 10);

    const isNew = modal === "create";
    const res = await fetch(
      isNew ? "/admin/api/places" : `/admin/api/places/${(modal as Place).id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setFormError(data?.message ?? "Could not save. Please try again.");
      return;
    }
    setModal(null);
    load();
  }

  async function handleDelete(place: Place) {
    if (
      !window.confirm(
        `Delete "${place.name}"? It can be restored from Trash later.`
      )
    )
      return;
    const res = await fetch(`/admin/api/places/${place.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.message ?? "Could not delete.");
      return;
    }
    load();
  }

  const isEditing = modal !== null && modal !== "create";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Places</h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-gold px-5 py-2.5 font-display text-sm text-ink"
        >
          Add place
        </button>
      </div>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : places.length === 0 ? (
        <p className="font-body text-sm text-slate">No places yet.</p>
      ) : (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              {["Name", "Order", "Active"].map((h) => (
                <th
                  key={h}
                  className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate"
                >
                  {h}
                </th>
              ))}
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {places.map((place) => (
              <tr key={place.id} className="border-b border-ink/10">
                <td className="py-3 pr-4 text-ink">{place.name}</td>
                <td className="py-3 pr-4 text-slate">{place.order}</td>
                <td className="py-3 pr-4 text-slate">
                  {place.isActive ? "Yes" : "No"}
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(place)}
                      className="font-body text-sm text-olive-ink underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(place)}
                      className="font-body text-sm text-ink underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal !== null && (
        <Modal
          title={isEditing ? "Edit place" : "Add place"}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            {formError && <ErrorBanner message={formError} />}
            <div>
              <label className="mb-1 block font-body text-sm text-ink">
                Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="block h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm text-ink">
                Order
              </label>
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: e.target.value }))
                }
                className="block h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="border border-ink/20 px-4 py-2 font-body text-sm text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-gold px-4 py-2 font-display text-sm text-ink disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditing ? "Save" : "Add"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
