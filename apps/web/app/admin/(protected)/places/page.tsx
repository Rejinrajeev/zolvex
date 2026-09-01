"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";
import { Table } from "@/components/admin/Table";
import {
  Button,
  PageHeader,
  SkeletonRows,
  TextField,
  CheckboxField,
  Notice,
} from "@/components/admin/ui";
import { isFilled, isInteger } from "@/lib/admin/validate";
import { adminFetch } from "@/lib/admin/fetch";

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
  const [modal, setModal] = useState<"create" | Place | null>(null);
  const [form, setForm] = useState<PlaceForm>(EMPTY);
  const [errors, setErrors] = useState<{ name?: string; order?: string }>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/admin/api/places");
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
    setErrors({});
    setFormError(null);
    setModal("create");
  }

  function openEdit(place: Place) {
    setForm({ name: place.name, order: String(place.order), isActive: place.isActive });
    setErrors({});
    setFormError(null);
    setModal(place);
  }

  async function handleSave() {
    const next: { name?: string; order?: string } = {};
    if (!isFilled(form.name)) next.name = "Enter a name.";
    if (form.order !== "" && !isInteger(form.order)) next.order = "Order must be a whole number.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setFormError(null);
    const body: Record<string, unknown> = { name: form.name, isActive: form.isActive };
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
    if (!window.confirm(`Delete "${place.name}"? It can be restored from Trash later.`)) return;
    const res = await adminFetch(`/admin/api/places/${place.id}`, { method: "DELETE" });
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
      <PageHeader
        title="Places"
        description="The service areas an enquiry can pick from."
        action={<Button onClick={openCreate}>Add place</Button>}
      />
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "order", label: "Order" },
            { key: "isActive", label: "Active", render: (p) => (p.isActive ? "Yes" : "No") },
          ]}
          rows={places}
          renderActions={(p) => (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p)}
                className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger"
              >
                Delete
              </button>
            </div>
          )}
          emptyMessage="No places yet."
        />
      )}

      {modal !== null && (
        <Modal title={isEditing ? "Edit place" : "Add place"} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            {formError && <Notice tone="error">{formError}</Notice>}
            <TextField
              id="place-name"
              label="Name"
              required
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setErrors((p) => ({ ...p, name: undefined }));
              }}
              error={errors.name}
            />
            <TextField
              id="place-order"
              label="Order"
              type="number"
              inputMode="numeric"
              value={form.order}
              onChange={(e) => {
                setForm((f) => ({ ...f, order: e.target.value }));
                setErrors((p) => ({ ...p, order: undefined }));
              }}
              error={errors.order}
              help="Lower numbers show first. Leave blank to auto-order."
            />
            <CheckboxField
              id="place-active"
              label="Active"
              checked={form.isActive}
              onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {isEditing ? "Save" : "Add"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
