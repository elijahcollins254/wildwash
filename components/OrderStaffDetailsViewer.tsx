"use client";

import React, { useState, useEffect } from "react";
import { client } from "@/lib/api/client";
import { X, Copy } from "lucide-react";

interface StaffDetail {
  staff_member: string;
  staff_role: string;
  items?: number;
  weight_kg?: number;
  description?: string;
  actual_price?: number;
  status_recorded?: string;
  recorded_at?: string;
}

interface OrderStaffDetailsViewerProps {
  orderId: number;
  orderCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

function OrderStaffDetailsViewer({
  orderId,
  orderCode,
  isOpen,
  onClose,
}: OrderStaffDetailsViewerProps): React.ReactElement {
  const [staffDetails, setStaffDetails] = useState<StaffDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && (orderId || orderCode)) {
      fetchStaffDetails();
    }
  }, [isOpen, orderId, orderCode]);

  const fetchStaffDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use orderCode to fetch order details, fall back to orderId if code not available
      const fetchUrl = orderCode 
        ? `/orders/?code=${orderCode}`
        : `/orders/?id=${orderId}`;
      
      const response = await client.get(fetchUrl);
      const orderData = Array.isArray(response) ? response[0] : response?.results?.[0];
      
      if (!orderData) {
        setError("Order not found");
        setStaffDetails([]);
        return;
      }
      
      const details = extractStaffDetails(orderData);
      setStaffDetails(details);
    } catch (err: any) {
      setError(err?.message || "Failed to load staff details");
      setStaffDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const extractStaffDetails = (orderData: any): StaffDetail[] => {
    // If backend returns staff_input_details array, use it directly
    if (orderData.staff_input_details && Array.isArray(orderData.staff_input_details)) {
      return orderData.staff_input_details;
    }

    // Otherwise extract from individual fields
    const details: StaffDetail[] = [];

    if (orderData.washer_items !== undefined || orderData.washer_weight || orderData.washer_notes) {
      details.push({
        staff_member: orderData.washer_name || "Washer",
        staff_role: "Washer",
        items: orderData.washer_items,
        weight_kg: orderData.washer_weight,
        description: orderData.washer_notes,
        actual_price: orderData.washer_price,
        status_recorded: "washed",
        recorded_at: orderData.washed_at,
      });
    }

    if (orderData.folder_items !== undefined || orderData.folder_weight || orderData.folder_notes) {
      details.push({
        staff_member: orderData.folder_name || "Folder",
        staff_role: "Folder",
        items: orderData.folder_items,
        weight_kg: orderData.folder_weight,
        description: orderData.folder_notes,
        actual_price: orderData.folder_price,
        status_recorded: "ready",
        recorded_at: orderData.folded_at,
      });
    }

    if (orderData.fumigator_items !== undefined || orderData.fumigator_weight || orderData.fumigator_notes) {
      details.push({
        staff_member: orderData.fumigator_name || "Fumigator",
        staff_role: "Fumigator",
        items: orderData.fumigator_items,
        weight_kg: orderData.fumigator_weight,
        description: orderData.fumigator_notes,
        actual_price: orderData.fumigator_price,
        status_recorded: "fumigated",
        recorded_at: orderData.fumigated_at,
      });
    }

    if (orderData.rider_items !== undefined || orderData.rider_weight || orderData.rider_notes) {
      details.push({
        staff_member: orderData.rider_name || "Rider",
        staff_role: "Rider",
        items: orderData.rider_items,
        weight_kg: orderData.rider_weight,
        description: orderData.rider_notes,
        actual_price: orderData.rider_price,
        status_recorded: "delivered",
        recorded_at: orderData.delivered_at,
      });
    }

    return details;
  };

  const getColorForRole = (role: string): string => {
    switch (role.toLowerCase()) {
      case "washer":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "folder":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      case "fumigator":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "rider":
        return "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800";
      default:
        return "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800";
    }
  };

  const getRoleIconColor = (role: string): string => {
    switch (role.toLowerCase()) {
      case "washer":
        return "text-blue-600 dark:text-blue-400";
      case "folder":
        return "text-purple-600 dark:text-purple-400";
      case "fumigator":
        return "text-amber-600 dark:text-amber-400";
      case "rider":
        return "text-teal-600 dark:text-teal-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  const copyToClipboard = () => {
    const summary = staffDetails
      .map(
        (d) =>
          `${d.staff_role} (${d.staff_member}):\n` +
          `  Items: ${d.items || "—"}\n` +
          `  Weight: ${d.weight_kg || "—"} kg\n` +
          `  Price: ${d.actual_price ? `KSh ${d.actual_price}` : "—"}\n` +
          `  Notes: ${d.description || "—"}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(summary);
    alert("Details copied to clipboard!");
  };

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Staff Input Details
            </h2>
            {orderCode && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Order: {orderCode}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && staffDetails.length === 0 && (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <p>No staff details recorded for this order yet.</p>
            </div>
          )}

          {!loading && !error && staffDetails.length > 0 && (
            <div className="space-y-4">
              {staffDetails.map((detail, index) => (
                <div
                  key={index}
                  className={`border rounded-xl p-5 transition-all ${getColorForRole(detail.staff_role)}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getRoleIconColor(detail.staff_role)}`}></div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {detail.staff_role}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {detail.staff_member}
                        </p>
                      </div>
                    </div>
                    {detail.recorded_at && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {new Date(detail.recorded_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {detail.items !== undefined && (
                      <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Items
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {detail.items}
                        </p>
                      </div>
                    )}

                    {detail.weight_kg !== undefined && (
                      <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Weight
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {detail.weight_kg} kg
                        </p>
                      </div>
                    )}

                    {detail.actual_price !== undefined && (
                      <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Price
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          KSh {Number(detail.actual_price).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {detail.status_recorded && (
                      <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Status
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                          {detail.status_recorded}
                        </p>
                      </div>
                    )}
                  </div>

                  {detail.description && (
                    <div className="mt-4 bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Notes
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {detail.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {staffDetails.length > 1 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Comparison Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staffDetails.some((d) => d.items !== undefined) && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          Items Recorded
                        </p>
                        <div className="space-y-2">
                          {staffDetails.map((d, i) =>
                            d.items !== undefined ? (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {d.staff_role}:
                                </span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {d.items}
                                </span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}

                    {staffDetails.some((d) => d.weight_kg !== undefined) && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          Weight Recorded
                        </p>
                        <div className="space-y-2">
                          {staffDetails.map((d, i) =>
                            d.weight_kg !== undefined ? (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {d.staff_role}:
                                </span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {d.weight_kg} kg
                                </span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}

                    {staffDetails.some((d) => d.actual_price !== undefined) && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          Price Recorded
                        </p>
                        <div className="space-y-2">
                          {staffDetails.map((d, i) =>
                            d.actual_price !== undefined ? (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {d.staff_role}:
                                </span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  KSh {Number(d.actual_price).toLocaleString()}
                                </span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-6 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
          {staffDetails.length > 0 && (
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderStaffDetailsViewer;
