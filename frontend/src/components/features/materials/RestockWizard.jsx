import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@/api/materials";
import { vendorsApi } from "@/api/vendors";
import VendorSelect from "@components/common/VendorSelect";

const STEPS = ["Select Products", "Quantities & Costs", "Vendor & Confirm"];

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-4">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
              ${i < current ? "bg-gray-900 border-gray-900 text-white" : i === current ? "bg-white border-gray-900 text-gray-900" : "bg-white border-gray-300 text-gray-400"}`}
            >
              {i < current ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-[10px] mt-1 font-medium ${i === current ? "text-gray-900" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < current ? "bg-gray-900" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function VendorCreateForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ companyName: "", phone: "", email: "", whatsappNumber: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) { setError("Company name is required"); return; }
    setSaving(true);
    try {
      const res = await vendorsApi.createVendor(form);
      onCreated(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3 mt-3">
      <p className="text-sm font-semibold text-gray-700">New Vendor</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
        <input
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          value={form.companyName}
          onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
          placeholder="e.g. ABC Supplies Ltd"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[["phone", "Phone", "0XX XXX XXXX"], ["email", "Email", "vendor@email.com"], ["whatsappNumber", "WhatsApp", "0XX XXX XXXX"]].map(([field, label, ph]) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              type={field === "email" ? "email" : "text"}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              value={form[field]}
              onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
              placeholder={ph}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        <button type="submit" disabled={saving} className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Vendor"}
        </button>
      </div>
    </form>
  );
}

export default function RestockWizard({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [orderItems, setOrderItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [addingVendor, setAddingVendor] = useState(null);
  const [showVendorCreate, setShowVendorCreate] = useState(false);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const { data: materialsData } = useQuery({
    queryKey: ["materials"],
    queryFn: () => materialsApi.getMaterials({ status: "active" }),
    staleTime: 60_000,
  });

  const bulkMutation = useMutation({
    mutationFn: (payload) => materialsApi.bulkReorderMaterials(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["restockOrders"]);
      setOrderResult(data);
      setDone(true);
    },
  });

  const allMaterials = materialsData?.data?.data || materialsData?.data || [];

  const filteredMaterials = allMaterials
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aLow = parseFloat(a.quantity) <= parseFloat(a.lowStockThreshold);
      const bLow = parseFloat(b.quantity) <= parseFloat(b.lowStockThreshold);
      return bLow - aLow;
    });

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const goToStep2 = () => {
    const selected = allMaterials.filter((m) => selectedIds.has(m.id));
    setOrderItems(
      selected.map((m) => {
        const options = [
          { id: "base", name: m.baseUnit || "Base", factor: 1 },
          ...(m.alternateUnits?.map((u) => ({ id: u.id, name: u.name, factor: parseFloat(u.factor || 1) })) || []),
        ];
        return { id: m.id, name: m.name, currentStock: m.quantity, baseUnit: m.baseUnit, quantityOrdered: "", unitCost: m.unitCost || 0, unitId: "base", options, baseCost: m.unitCost || 0 };
      })
    );
    setStep(1);
  };

  const handleItemChange = (id, field, value) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "unitId") {
          const unit = item.options.find((u) => String(u.id) === String(value));
          if (unit) updated.unitCost = (parseFloat(item.baseCost) * unit.factor).toFixed(2);
        }
        return updated;
      })
    );
  };

  const grandTotal = orderItems.reduce(
    (s, i) => s + (parseFloat(i.quantityOrdered) || 0) * (parseFloat(i.unitCost) || 0),
    0
  );

  const handleConfirm = () => {
    const validItems = orderItems
      .filter((i) => parseFloat(i.quantityOrdered) > 0)
      .map((i) => ({ id: i.id, quantityOrdered: parseFloat(i.quantityOrdered), unitCost: parseFloat(i.unitCost), unitId: i.unitId === "base" ? null : Number(i.unitId) }));
    if (!validItems.length) return;
    bulkMutation.mutate({ items: validItems, vendorIds: vendors.map(v => v.id), notes: notes.trim() || undefined });
  };

  const removeVendor = (id) => setVendors((prev) => prev.filter(v => v.id !== id));

  const handleAddingVendorChange = (v) => {
    if (!v) { setAddingVendor(null); return; }
    if (!vendors.some(existing => existing.id === v.id)) {
      setVendors(prev => [...prev, v]);
    }
    setAddingVendor(null);
  };

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Order Placed</h3>
        <p className="text-sm text-gray-500 mb-1">
          {orderResult?.length || 0} item(s) ordered{vendors.length ? ` — ${vendors.map(v => v.name).join(", ")} notified` : ""}.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 mb-6">
          Stock quantities will update when you mark goods as received.
        </p>
        <div className="flex gap-3">
          <button onClick={() => { onSuccess?.(); onClose(); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Done
          </button>
          <button onClick={() => onClose()} className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700">
            View Restock Orders
          </button>
        </div>
      </div>
    );
  }

  // ── Derive footer content per step so the shell stays clean ──────────────
  const renderFooter = () => {
    if (step === 0) return (
      // Step 0 footer: Cancel on the left, selection count + Next on the right.
      // No total needed here — user is just picking items.
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
            </span>
          )}
          <button
            onClick={goToStep2}
            disabled={selectedIds.size === 0}
            className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    );

    if (step === 1) return (
      // Step 1 footer: Back left, grand total centre, Next right.
      // Total is shown here so it's always visible as the user fills in costs.
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setStep(0)}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Back
        </button>
        <span className="text-sm font-bold text-gray-900">
          GH₵{grandTotal.toFixed(2)}
        </span>
        <button
          onClick={() => setStep(2)}
          disabled={!orderItems.some((i) => parseFloat(i.quantityOrdered) > 0)}
          className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    );

    if (step === 2) return (
      // Step 2 footer: Back left, total + Confirm right.
      // Confirm is the primary action — wider padding and no competing centre element.
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900">GH₵{grandTotal.toFixed(2)}</span>
          <button
            onClick={handleConfirm}
            disabled={bulkMutation.isPending}
            className="px-6 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {bulkMutation.isPending ? "Placing Order…" : "Confirm Order"}
          </button>
        </div>
      </div>
    );
  };

  return (
    // Outer shell: fixed height, flex column — header locks top, footer locks bottom,
    // the middle grows and scrolls independently. Nothing inside can push the footer away.
    <div className="flex flex-col h-[calc(100vh-280px)] overflow-hidden">

      {/* ── STATIC HEADER: StepBar always visible, never scrolls ── */}
      <div className="flex-shrink-0 border-b border-gray-100 pb-4">
        <StepBar current={step} />
      </div>

      {/* ── SCROLLABLE MIDDLE: only this region scrolls ────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4">

        {/* STEP 0 — Select Products */}
        {step === 0 && (
          <div className="flex flex-col h-full gap-3">
            {/* Search bar stays at the top of the scroll region */}
            <div className="relative flex-shrink-0">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search materials…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {filteredMaterials.map((m) => {
                const isLow = parseFloat(m.quantity) <= parseFloat(m.lowStockThreshold);
                const checked = selectedIds.has(m.id);
                return (
                  <label key={m.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${checked ? "bg-gray-50" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSelect(m.id)} className="rounded border-gray-300 text-gray-900" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      {isLow && (
                        <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Low</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {parseFloat(m.quantity).toLocaleString()} {m.baseUnit}
                    </span>
                  </label>
                );
              })}
              {filteredMaterials.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">No materials found</div>
              )}
            </div>
          </div>
        )}

        {/* STEP 1 — Quantities & Costs */}
        {step === 1 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2 text-left">Material</th>
                  <th className="px-3 py-2 text-left w-28">Unit</th>
                  <th className="px-3 py-2 text-left w-20">Qty</th>
                  <th className="px-3 py-2 text-left w-24">Unit Cost</th>
                  <th className="px-3 py-2 text-right w-24">Total</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderItems.map((item) => {
                  const qty = parseFloat(item.quantityOrdered) || 0;
                  const cost = parseFloat(item.unitCost) || 0;
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-400">
                          Stock: {parseFloat(item.currentStock).toLocaleString()} {item.baseUnit}
                        </div>
                      </td>
                      <td className="px-3 py-1">
                        <select
                          value={item.unitId}
                          onChange={(e) => handleItemChange(item.id, "unitId", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        >
                          {item.options.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="number" min="0" step="0.01" placeholder="0"
                          value={item.quantityOrdered}
                          onChange={(e) => handleItemChange(item.id, "quantityOrdered", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(item.id, "unitCost", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        GH₵{(qty * cost).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setOrderItems((p) => p.filter((i) => i.id !== item.id))}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* STEP 2 — Vendor & Confirm */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Vendor Select — multi */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Notify Vendors <span className="text-xs font-normal text-gray-400">(optional — select one or more)</span>
              </p>

              {/* Selected vendor chips */}
              {vendors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {vendors.map(v => (
                    <span key={v.id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {v.name}
                      <button
                        type="button"
                        onClick={() => removeVendor(v.id)}
                        className="text-gray-400 hover:text-red-500 leading-none"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add vendor dropdown */}
              <VendorSelect
                key={vendors.map(v => v.id).join(",")}
                value={addingVendor}
                onChange={handleAddingVendorChange}
                label=""
              />

              <button
                type="button"
                onClick={() => setShowVendorCreate((s) => !s)}
                className="mt-2 text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
              >
                + Add new vendor
              </button>
              {showVendorCreate && (
                <VendorCreateForm
                  onCreated={(v) => {
                    const newVendor = { id: v.id, name: v.companyName, contactName: v.contactName || null, phone: v.phone || null, email: v.email || null, whatsappNumber: v.whatsappNumber || null };
                    if (!vendors.some(existing => existing.id === newVendor.id)) {
                      setVendors(prev => [...prev, newVendor]);
                    }
                    setShowVendorCreate(false);
                    queryClient.invalidateQueries(["allVendors"]);
                  }}
                  onCancel={() => setShowVendorCreate(false)}
                />
              )}
              {vendors.length > 0 && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mt-2">
                  {vendors.length === 1
                    ? `${vendors[0].name} will be notified when the order is confirmed.`
                    : `${vendors.length} vendors will be notified when the order is confirmed.`}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes / Reference <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. INV-2026-03, purchase order ref…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {/* Order Summary */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Order Summary</div>
              <div className="divide-y divide-gray-100">
                {orderItems.filter((i) => parseFloat(i.quantityOrdered) > 0).map((i) => {
                  const unit = i.options.find((o) => String(o.id) === String(i.unitId));
                  return (
                    <div key={i.id} className="flex justify-between px-4 py-2 text-sm">
                      <span className="text-gray-700">
                        {i.name} <span className="text-gray-400">× {i.quantityOrdered} {unit?.name || i.baseUnit}</span>
                      </span>
                      <span className="font-medium">
                        GH₵{((parseFloat(i.quantityOrdered) || 0) * (parseFloat(i.unitCost) || 0)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {bulkMutation.isError && (
              <p className="text-xs text-red-600 text-center">
                {bulkMutation.error?.response?.data?.error?.message || "Failed to place order"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── STATIC FOOTER: buttons + total always visible, never scrolls ── */}
      <div className="flex-shrink-0 border-t border-gray-200 pt-3 mt-1">
        {renderFooter()}
      </div>

    </div>
  );
}