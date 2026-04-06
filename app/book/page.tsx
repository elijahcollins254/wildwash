'use client';
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getStoredAuthState } from "@/lib/auth";
import { useAppSelector } from "@/redux/hooks";
import { selectCartItems } from "@/redux/features/cartSlice";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  return null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""; // empty = same origin

import RouteGuard from "../../components/RouteGuard";

export default function Page() {
  const router = useRouter();
  const [pickupBuilding, setPickupBuilding] = useState("");
  const [pickupContact, setPickupContact] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deliveryHours, setDeliveryHours] = useState(72); // Delivery time in hours (default 72 for economy pricing)
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<any | null>(null);
  const [scheduleOption, setScheduleOption] = useState<'today' | 'scheduled'>('today');
  const [scheduledAt, setScheduledAt] = useState<string>(''); // stores value from datetime-local input
  const [customerNote, setCustomerNote] = useState<string>('');
  const [summaryExpanded, setSummaryExpanded] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cartItems = useAppSelector(selectCartItems);
  const cartServiceIds = useMemo(() => cartItems.map(item => item.id), [cartItems]);

  // Validation functions
  const validatePhone = (phone: string): boolean => {
    // Basic phone validation - at least 10 digits
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length >= 10;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate pickup building
    if (!pickupBuilding.trim()) {
      errors.pickupBuilding = "Pickup address is required";
    }

    // Validate pickup contact
    if (!pickupContact.trim()) {
      errors.pickupContact = "Contact phone number is required";
    } else if (!validatePhone(pickupContact)) {
      errors.pickupContact = "Phone number must have at least 10 digits";
    }

    // Validate dropoff address if not same as pickup
    if (!sameAsPickup && !dropoffAddress.trim()) {
      errors.dropoffAddress = "Dropoff address is required";
    }

    // Validate services in cart
    if (cartItems.length === 0) {
      errors.services = "Please add at least one service to your cart";
    }

    setFieldErrors(errors);

    // Scroll to first error field
    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      const errorElement = document.getElementById(`error-${firstErrorKey}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(errors).length === 0;
  };

  // Calculate price multiplier based on exact delivery hours with smooth interpolation
  const calculatePriceMultiplier = (hours: number): number => {
    // Define key price points for smooth pricing curve
    // Slower delivery = Lower price (minimum 1.0x = base price)
    // Faster delivery = Higher price
    // Hours -> Multiplier
    // 6h = 2.0x (express, most expensive)
    // 12h = 1.6x (faster)
    // 24h = 1.3x (fast)
    // 36h = 1.1x 
    // 48h = 1.0x (normal)
    // 72h = 1.0x (economy, cheapest = base price)
    
    const pricePoints = [
      { hours: 6, multiplier: 2.0 },
      { hours: 12, multiplier: 1.6 },
      { hours: 24, multiplier: 1.3 },
      { hours: 36, multiplier: 1.1 },
      { hours: 48, multiplier: 1.0 },
      { hours: 72, multiplier: 1.0 },
    ];

    // Find the two surrounding points for interpolation
    for (let i = 0; i < pricePoints.length - 1; i++) {
      const current = pricePoints[i];
      const next = pricePoints[i + 1];
      
      if (hours >= current.hours && hours <= next.hours) {
        // Linear interpolation between two points
        const ratio = (hours - current.hours) / (next.hours - current.hours);
        return current.multiplier + (next.multiplier - current.multiplier) * ratio;
      }
    }

    // If beyond all points, return the last one (1.0x minimum)
    return Math.max(pricePoints[pricePoints.length - 1].multiplier, 1.0);
  };

  // Format delivery speed label based on exact multiplier
  const getDeliveryLabel = (hours: number): string => {
    const multiplier = calculatePriceMultiplier(hours);
    if (multiplier >= 2.0) return "Express";
    if (multiplier >= 1.5) return "Fast";
    if (multiplier > 1.0) return "Normal";
    if (hours >= 48) return "Economy";
    return "Standard";
  };

  // Calculate minimum delivery hours based on items in cart
  const calculateMinDeliveryHours = (): number => {
    if (cartItems.length === 0) return 72; // Default minimum if no items (economy)
    
    // Get the maximum processing time from all items
    const maxProcessingTime = Math.max(
      ...cartItems.map(item => (item.processing_time || 12) * (item.quantity || 1))
    );
    
    // Ensure minimum is at least 6 hours, maximum 72 hours
    return Math.min(Math.max(maxProcessingTime, 6), 72);
  };

  const minDeliveryHours = calculateMinDeliveryHours();

  // Ensure deliveryHours is never below the minimum
  const effectiveDeliveryHours = Math.max(deliveryHours, minDeliveryHours);

  // Calculate total price with multiplier
  const baseTotal = cartItems.reduce((acc, item) => acc + Number(item.price) * (item.quantity || 1), 0);
  const priceMultiplier = calculatePriceMultiplier(effectiveDeliveryHours);
  const totalWithMultiplier = baseTotal * priceMultiplier;

  useEffect(() => {
    // warm the csrf cookie for cross-domain SPA
    fetch(`${API_BASE}/users/csrf/`, { method: "GET", credentials: "include" }).catch((e) => {
      console.warn("CSRF warmup failed", e);
    });
  }, []);

  // Fetch user profile
  useEffect(() => {
    const authState = getStoredAuthState();
    if (!authState?.token) return;

    fetch(`${API_BASE}/users/me/`, {
      credentials: "include",
      headers: {
        "Authorization": `Token ${authState.token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setUserProfile(data);
      // Prefill form fields from saved profile data
      if (data?.phone && !pickupContact) {
        setPickupContact(data.phone);
      }
      // Prefill pickup address if available
      if (data?.pickup_address && !pickupBuilding) {
        setPickupBuilding(data.pickup_address);
      }
      // Prefill dropoff address from location if available and different from pickup
      if (data?.location && !dropoffAddress && data.location !== data?.pickup_address) {
        setDropoffAddress(data.location);
        setSameAsPickup(false);
      }
    })
    .catch(err => {
      console.warn("Could not fetch user profile:", err);
    });
  }, []); // Run once on mount

  function resetMessage() {
    setMessage(null);
    setServerErrors(null);
  }

  const canSubmitBooking = !!pickupBuilding.trim() && 
    !!pickupContact.trim() && 
    cartItems.length > 0 && 
    (sameAsPickup || !!dropoffAddress.trim());

  async function postBooking(payload: Record<string, any>) {
    resetMessage();
    setSending(true);
    try {
      console.log("Posting booking payload:", payload);
      await new Promise((r) => setTimeout(r, 250));

      const csrf = getCookie("csrftoken");
      const authState = getStoredAuthState();
      
      const res = await fetch(`${API_BASE}/orders/`, {
        method: "POST",
        mode: "cors",
        credentials: "include", // send cookies (sessionid, csrftoken)
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
          ...(authState?.token ? { "Authorization": `Token ${authState.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (!res.ok) {
        console.error("Booking POST failed", res.status, data);
        setServerErrors(data || { non_field_errors: ["Server returned an error"] });
        setMessage(`Server error: ${res.status} ${res.statusText}`);
        return { ok: false, data };
      }

      setMessage(data?.code ? `Booking ${data.code} created` : "Booking created");
      return { ok: true, data };
    } catch (err: any) {
      console.error("Network/fetch error:", err);
      setMessage(`Network error: ${err?.message ?? String(err)}`);
      setServerErrors({ network: [err?.message ?? "Network failure"] });
      return { ok: false, err };
    } finally {
      setSending(false);
    }
  }

  async function saveBookingDetailsToProfile() {
    /**
     * Save the booking details to the user's profile so they don't have to
     * re-enter this information on future bookings or in their profile
     */
    try {
      const authState = getStoredAuthState();
      if (!authState?.token) {
        console.warn("No auth token, skipping profile update");
        return;
      }

      const csrf = getCookie("csrftoken");
      
      // Build update payload with non-empty fields only
      const profileUpdate: Record<string, any> = {};
      
      // Save phone number if provided
      if (pickupContact.trim()) {
        profileUpdate.phone = pickupContact;
      }
      
      // Save pickup address (building/location)
      if (pickupBuilding.trim()) {
        profileUpdate.pickup_address = pickupBuilding;
      }
      
      // Save dropoff address as the location if it's different from pickup
      if (!sameAsPickup && dropoffAddress.trim()) {
        profileUpdate.location = dropoffAddress;
      } else if (sameAsPickup && pickupBuilding.trim()) {
        // If same as pickup, also set location to pickup building
        profileUpdate.location = pickupBuilding;
      }

      // Only make the request if we have updates
      if (Object.keys(profileUpdate).length === 0) {
        console.warn("No profile fields to update");
        return;
      }

      console.log("Updating user profile with booking details:", profileUpdate);

      const res = await fetch(`${API_BASE}/users/me/`, {
        method: "PATCH",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
          "Authorization": `Token ${authState.token}`,
        },
        body: JSON.stringify(profileUpdate),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn("Failed to update profile:", res.status, errorData);
        // Don't fail the booking if profile update fails - it's secondary
        return;
      }

      const updatedProfile = await res.json();
      console.log("Profile updated successfully:", updatedProfile);
      setUserProfile(updatedProfile);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      // Don't fail the booking if profile update fails - it's secondary
    }
  }

  async function handleBookPickup() {
    // Validate form before submission
    if (!validateForm()) {
      setMessage("Please fix the errors above before booking.");
      return;
    }

    const payload = {
        services: cartServiceIds,
        service_quantities: cartItems.map(item => ({ service_id: item.id, quantity: item.quantity || 1 })),
        pickup_address: pickupBuilding + (pickupContact ? ` (contact: ${pickupContact})` : ""),
        dropoff_address: sameAsPickup ? pickupBuilding : dropoffAddress,
        urgency: calculatePriceMultiplier(effectiveDeliveryHours) === 2.0 ? 3 : calculatePriceMultiplier(effectiveDeliveryHours) === 1.3 ? 2 : 1, // Convert hours to urgency level
        // These fields might not be needed for a 'booking' vs an 'order'
        items: cartItems.length,
        weight_kg: null, // To be determined at pickup
        price: Math.round(totalWithMultiplier * 100) / 100, // Round to 2 decimal places to avoid validation errors
        estimated_delivery: new Date(Date.now() + effectiveDeliveryHours * 60 * 60 * 1000).toISOString(), // Based on selected delivery hours
        // Include an optional customer note/description
        ...(customerNote ? { description: customerNote } : {}),
    // If user chose to schedule a pickup, send requested_pickup_at in ISO format
    ...(scheduleOption === 'scheduled' && scheduledAt ? { requested_pickup_at: new Date(scheduledAt).toISOString() } : {}),
    };

    const result = await postBooking(payload);

    if (result.ok) {
        setMessage(`Successfully created booking!`);
        
        // Save booking details to user profile so they're pre-filled next time
        await saveBookingDetailsToProfile();
        
        // Clear form on success
        setPickupBuilding("");
        setPickupContact("");
        setDropoffAddress("");
        setSameAsPickup(false);
        setDeliveryHours(72);
        setFieldErrors({}); // Clear all validation errors
        
        // Redirect to orders page after a short delay
        setTimeout(() => {
          router.push("/orders");
        }, 1500);
        
        // Optionally, you can clear the cart here
        // dispatch(clearCart());
    } else {
        setMessage('Failed to create booking. Please try again.');
    }
  }

  return (
    <RouteGuard>
      <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          <div className="md:flex">
          <section className="w-full md:w-2/3 p-6 md:p-8">
            <header className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Book a Pick Up</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Confirm details for your laundry & cleaning pickup.</p>
              </div>
            </header>

            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">Pickup Address</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div id="error-pickupBuilding">
                    <label htmlFor="pickup-building" className="block text-xs text-slate-500 mb-1">Building / Street</label>
                    <input 
                      id="pickup-building"
                      type="text"
                      value={pickupBuilding} 
                      onChange={(e) => {
                        setPickupBuilding(e.target.value);
                        if (fieldErrors.pickupBuilding) {
                          setFieldErrors({ ...fieldErrors, pickupBuilding: "" });
                        }
                      }} 
                      placeholder="e.g. Olive Towers, 4th floor" 
                      className={`w-full rounded-lg border p-3 text-sm shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                        fieldErrors.pickupBuilding 
                          ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
                          : 'border-slate-200 dark:border-slate-600 focus:ring-red-500'
                      }`}
                    />
                    {fieldErrors.pickupBuilding && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.pickupBuilding}</p>
                    )}
                  </div>
                  <div id="error-pickupContact">
                    <label htmlFor="pickup-contact" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Contact (phone)</label>
                    <input 
                      id="pickup-contact"
                      type="tel"
                      value={pickupContact} 
                      onChange={(e) => {
                        setPickupContact(e.target.value);
                        if (fieldErrors.pickupContact) {
                          setFieldErrors({ ...fieldErrors, pickupContact: "" });
                        }
                      }} 
                      placeholder="e.g. +254 7xx xxx xxx" 
                      className={`w-full rounded-lg border p-3 text-sm shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                        fieldErrors.pickupContact 
                          ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
                          : 'border-slate-200 dark:border-slate-600 focus:ring-sky-300'
                      }`}
                    />
                    {fieldErrors.pickupContact && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.pickupContact}</p>
                    )}
                  </div>
                </div>

                <div id="error-services">
                  <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Services to be picked up</div>
                    <ul className="space-y-2" role="list">
                        {cartItems.map((item) => (
                            <li key={item.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                <div className="flex-1">
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.quantity || 1}</div>
                                </div>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">KSh {(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                    {fieldErrors.services && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.services}</p>
                    )}
                </div>


              </div>

              <div>
                <label htmlFor="customer-note" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Note for the rider (optional)</label>
                <textarea
                  id="customer-note"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Any special instructions or notes for pickup"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dropoff Address</div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="same-as-pickup"
                      checked={sameAsPickup}
                      onChange={(e) => {
                        setSameAsPickup(e.target.checked);
                        if (fieldErrors.dropoffAddress) {
                          setFieldErrors({ ...fieldErrors, dropoffAddress: "" });
                        }
                        if (e.target.checked) {
                          setDropoffAddress(pickupBuilding);
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-red-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Dropoff same as pickup location</span>
                  </label>
                  {!sameAsPickup && (
                    <div id="error-dropoffAddress">
                      <label htmlFor="dropoff-address" className="sr-only">Dropoff Address</label>
                      <input 
                        id="dropoff-address"
                        type="text"
                        value={dropoffAddress} 
                        onChange={(e) => {
                          setDropoffAddress(e.target.value);
                          if (fieldErrors.dropoffAddress) {
                            setFieldErrors({ ...fieldErrors, dropoffAddress: "" });
                          }
                        }} 
                        placeholder="e.g. Home / Office address for dropoff" 
                        className={`w-full rounded-lg border p-3 text-sm shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                          fieldErrors.dropoffAddress 
                            ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
                            : 'border-slate-200 dark:border-slate-600 focus:ring-sky-300'
                        }`}
                      />
                      {fieldErrors.dropoffAddress && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.dropoffAddress}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Delivery Time & Price</div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Select delivery time</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{effectiveDeliveryHours}h</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label htmlFor="delivery-hours" className="sr-only">Delivery Hours</label>
                      <input 
                        id="delivery-hours"
                        type="range" 
                        min={minDeliveryHours} 
                        max={72} 
                        value={deliveryHours} 
                        onChange={(e) => setDeliveryHours(Number(e.target.value))} 
                        className="w-full accent-red-500 dark:accent-red-400" 
                      />
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{minDeliveryHours}h</span>
                        <span>36h</span>
                        <span>72h</span>
                      </div>
                      {minDeliveryHours > 6 && (
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          Minimum {minDeliveryHours}h based on items in cart
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Delivery Speed</div>
                      <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{getDeliveryLabel(effectiveDeliveryHours)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{effectiveDeliveryHours} hour{effectiveDeliveryHours !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Schedule</div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="schedule" value="today" checked={scheduleOption === 'today'} onChange={() => setScheduleOption('today')} className="rounded" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">BOOK NOW</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="schedule" value="scheduled" checked={scheduleOption === 'scheduled'} onChange={() => setScheduleOption('scheduled')} className="rounded" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">SCHEDULE</span>
                  </label>
                </div>

                {scheduleOption === 'scheduled' && (
                  <div className="mt-2">
                    <label htmlFor="scheduled-at" className="block text-xs text-slate-500 mb-1">Pickup date & time</label>
                    <input
                      id="scheduled-at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                    <div className="text-xs text-slate-500 mt-1">Times are local to your device. We'll schedule pickup for the chosen time.</div>
                  </div>
                )}
              </div>

                <div className="pt-2">
                {message && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                    {message}
                  </div>
                )}
                {serverErrors && (
                  <div className="mt-2 text-xs text-red-700 dark:text-red-400">
                    <div className="font-semibold">Server validation errors:</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(serverErrors, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </section>
          <aside className="w-full md:w-1/3 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 md:p-8 border-l border-slate-100 dark:border-slate-700">
            <div className="sticky top-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Booking Summary</h3>
              {/* Desktop / wide view: full summary */}
              <div className="hidden md:block mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Pickup Location</div>
                  <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{pickupBuilding || "—"}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">{pickupContact || "No contact provided"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Dropoff Location</div>
                  <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                    {sameAsPickup ? "(Same as pickup)" : dropoffAddress || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Selected Services</div>
                  <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                    {cartItems.map(item => `${item.name} (x${item.quantity || 1})`).join(", ") || "No services selected"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Delivery Speed</div>
                  <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{getDeliveryLabel(effectiveDeliveryHours)} ({effectiveDeliveryHours}h)</div>
                </div>
              </div>

              {/* Mobile: compact summary with expandable details to avoid long scrolling */}
              <div className="md:hidden mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Pickup</div>
                    <div className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-xs">{pickupBuilding || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Services</div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">{cartItems.length}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Total (with {priceMultiplier.toFixed(2)}x)</div>
                  <div className="font-semibold text-red-600 dark:text-red-400">KSh {totalWithMultiplier.toFixed(2)}</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setSummaryExpanded(s => !s)} className="text-sm text-blue-600 dark:text-blue-400 underline">
                    {summaryExpanded ? 'Hide details' : 'Show details'}
                  </button>
                  <div className="text-xs text-slate-500">{getDeliveryLabel(effectiveDeliveryHours)} ({effectiveDeliveryHours}h)</div>
                </div>

                {summaryExpanded && (
                  <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-400 max-h-56 overflow-auto">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">Pickup Location</div>
                      <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{pickupBuilding || "—"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">{pickupContact || "No contact provided"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">Dropoff Location</div>
                      <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{sameAsPickup ? "(Same as pickup)" : dropoffAddress || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">Selected Services</div>
                      <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{cartItems.map(item => `${item.name} (x${item.quantity || 1})`).join(", ") || "No services selected"}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-slate-600 dark:text-slate-400">Service Total:</div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">KSh {baseTotal.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-slate-700 dark:text-slate-200">Final Cost:</div>
                    <div className="text-red-600 dark:text-red-400">KSh {totalWithMultiplier.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-slate-500 dark:text-slate-500">
                Price varies based on delivery time selected. Faster delivery = higher cost. You'll confirm payment after pickup.
              </div>
            </div>
          </aside>
        </div>

        <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 sticky bottom-0">
          <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
            <button 
              onClick={() => {
                setPickupBuilding("");
                setPickupContact("");
                setDropoffAddress("");
                setSameAsPickup(false);
                setDeliveryHours(72);
                setFieldErrors({}); // Clear validation errors
                resetMessage();
              }} 
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Clear All
            </button>
            <button 
              onClick={handleBookPickup} 
              disabled={sending} 
              className="flex-1 max-w-md rounded-lg bg-red-600 text-white py-3 text-sm font-medium disabled:opacity-50 hover:bg-red-700 dark:hover:bg-red-500"
            >
              {sending ? "Processing..." : "Book Pick Up"}
            </button>
          </div>
        </footer>
      </div>
      </main>
    </RouteGuard>
  );
}
