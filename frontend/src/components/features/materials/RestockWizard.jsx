import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@/api/materials";
import { vendorsApi } from "@/api/vendors";

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
  const [vendor, setVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorCreate, setShowVendorCreate] = useState(false);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const { data: materialsData } = useQuery({
    queryKey: ["materials"],
    queryFn: () => materialsApi.getMaterials({ status: "active" }),
    staleTime: 60_000,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["allVendors"],
    queryFn: () => vendorsApi.getVendors(),
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
  const allVendors = vendorsData?.data?.data || vendorsData?.data || [];

  const filteredMaterials = allMaterials
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aLow = parseFloat(a.quantity) <= parseFloat(a.lowStockThreshold);
      const bLow = parseFloat(b.quantity) <= parseFloat(b.lowStockThreshold);
      return bLow - aLow;
    });

  const filteredVendors = allVendors.filter((v) =>
    v.companyName.toLowerCase().includes(vendorSearch.toLowerCase())
  );

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
          ...(m.alternateUnits?.map((u) => ({ id: u.unitId, name: u.name, factor: parseFloat(u.factor || 1) })) || []),
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
    bulkMutation.mutate({ items: validItems, vendorId: vendor?.id || null, notes: notes.trim() || undefined });
  };

  const notifyChannel = vendor?.whatsappNumber ? "WhatsApp" : vendor?.email ? "email" : vendor?.phone ? "SMS" : null;

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
          {orderResult?.length || 0} item(s) ordered{vendor ? ` from ${vendor.companyName}` : ""}.
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

  return (
    <div className="flex flex-col h-[80vh]">
      <StepBar current={step} />

      {/* ── STEP 0: Select Products ──────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/*
            ACTION BAR — pinned at top of step content, never scrolls away.
            Reason: Users should never have to scroll to reach Cancel / Next.
            The search input is intentionally compact (max-w-xs) so the action
            buttons sit comfortably on the same row even on narrow screens.
          */}
          <div className="flex items-center gap-2 mb-3">
            {/* Compact search: constrained width frees space for buttons on the same row */}
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search materials…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {/* Selection count badge — stays visible at a glance */}
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold bg-gray-900 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                {selectedIds.size} selected
              </span>
            )}

            {/* Spacer pushes buttons to the right on wider viewports */}
            <div className="flex-1" />

            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={goToStep2}
              disabled={selectedIds.size === 0}
              className="px-4 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 whitespace-nowrap"
            >
              Next{selectedIds.size > 0 ? ` — ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}` : ""}
            </button>
          </div>

          {/* Scrollable list fills remaining height */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
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

      {/* ── STEP 1: Quantities & Costs ───────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Scrollable table — fills available space above the fixed footer */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
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

          {/*
            ACTION BAR — pinned at the bottom, outside the scroll container.
            Step 1 is a data-entry step (filling in quantities & costs), so
            the user naturally works top-to-bottom through the rows. The footer
            bar is always visible once they finish entering data, without being
            in the way while they type. The grand total here gives a final
            sanity-check before advancing.
          */}
          <div className="border-t border-gray-200 pt-3 mt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => setStep(0)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              ← Back
            </button>
            <span className="text-sm font-bold text-gray-900">
              Total: GH₵{grandTotal.toFixed(2)}
            </span>
            <button
              onClick={() => setStep(2)}
              disabled={!orderItems.some((i) => parseFloat(i.quantityOrdered) > 0)}
              className="px-4 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 whitespace-nowrap"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Vendor & Confirm ─────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Scrollable body — user reads vendor, notes, and summary before acting */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Vendor Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Vendor <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              {vendor ? (
                <div className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{vendor.companyName}</p>
                    {vendor.contactName && <p className="text-xs text-gray-500">{vendor.contactName}</p>}
                    <p className="text-xs text-gray-400">{vendor.phone || vendor.email || vendor.whatsappNumber || ""}</p>
                  </div>
                  <button onClick={() => setVendor(null)} className="text-xs text-gray-400 hover:text-red-500">Change</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search vendors…"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                  {vendorSearch.length > 0 && (
                    <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-gray-100">
                      {filteredVendors.map((v) => (
                        <button key={v.id} onClick={() => { setVendor(v); setVendorSearch(""); setShowVendorCreate(false); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                          <span className="font-medium text-gray-900">{v.companyName}</span>
                          {v.phone && <span className="ml-2 text-xs text-gray-400">{v.phone}</span>}
                        </button>
                      ))}
                      {filteredVendors.length === 0 && <div className="px-4 py-3 text-xs text-gray-400">No vendors found</div>}
                    </div>
                  )}
                  <button onClick={() => setShowVendorCreate((v) => !v)} className="mt-2 text-xs font-semibold text-gray-600 hover:text-gray-900 underline">
                    + Add new vendor
                  </button>
                  {showVendorCreate && (
                    <VendorCreateForm
                      onCreated={(v) => { setVendor(v); setShowVendorCreate(false); queryClient.invalidateQueries(["allVendors"]); }}
                      onCancel={() => setShowVendorCreate(false)}
                    />
                  )}
                </>
              )}
              {vendor && notifyChannel && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mt-2">
                  Vendor will be notified via {notifyChannel} when the order is confirmed.
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
              <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
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
              <div className="flex justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 font-bold text-sm">
                <span>Total</span>
                <span>GH₵{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {bulkMutation.isError && (
              <p className="text-xs text-red-600 text-center">
                {bulkMutation.error?.response?.data?.error?.message || "Failed to place order"}
              </p>
            )}
          </div>

          {/*
            ACTION BAR — pinned at the bottom, outside the scroll container.
            Step 2 is a review-and-confirm step: the user should read through
            the vendor, notes, and order summary before committing. Placing
            Back/Confirm here means they naturally reach the buttons only after
            scrolling through all the details, which reduces accidental submits.
          */}
          <div className="border-t border-gray-200 pt-3 mt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => setStep(1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              ← Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={bulkMutation.isPending}
              className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
            >
              {bulkMutation.isPending ? "Placing Order…" : "Confirm Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}