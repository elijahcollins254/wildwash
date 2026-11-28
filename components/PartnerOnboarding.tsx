'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  UserRound,
  WashingMachine,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import RouteGuard from '@/components/RouteGuard';
import { client } from '@/lib/api/client';
import { getStoredAuthState } from '@/lib/auth';
import { setAuth } from '@/redux/features/authSlice';
import type { AppDispatch } from '@/redux/store';

type PartnerApplication = {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  business_name: string;
  business_type: string;
  location: string;
  pickup_address: string;
  service_area: string;
  machine_count: number;
  pickup_latitude: string | null;
  pickup_longitude: string | null;
};

type ApplicationForm = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  business_name: string;
  business_type: string;
  location: string;
  pickup_address: string;
  service_area: string;
  machine_count: string;
  pickup_latitude: string;
  pickup_longitude: string;
};

type PartnerService = {
  id: number;
  name: string;
  price: number | string;
  is_active?: boolean;
};

type CreatedPartnerOrder = {
  order: { code: string };
  tracking_url: string;
  sms: { success: boolean; message: string };
};

const STEPS = [
  { title: 'Your details', icon: UserRound },
  { title: 'Your business', icon: Building2 },
  { title: 'Service setup', icon: MapPin },
  { title: 'Review', icon: Check },
];

const EMPTY_FORM: ApplicationForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  business_name: '',
  business_type: '',
  location: '',
  pickup_address: '',
  service_area: '',
  machine_count: '1',
  pickup_latitude: '',
  pickup_longitude: '',
};

function getApplications(data: unknown): PartnerApplication[] {
  if (Array.isArray(data)) return data as PartnerApplication[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: PartnerApplication[] }).results;
  }
  return [];
}

function getServices(data: unknown): PartnerService[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: PartnerService[] }).results
      : [];
  return (list as PartnerService[]).filter((service) => service.is_active !== false);
}

function PartnerOrderCreator({ pickupAddress }: { pickupAddress: string }): React.ReactElement {
  const [services, setServices] = useState<PartnerService[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState('1');
  const [createdOrder, setCreatedOrder] = useState<CreatedPartnerOrder | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    client.get('/services/').then((data) => {
      if (active) setServices(getServices(data));
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load services.');
    }).finally(() => {
      if (active) setLoadingServices(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const quantity = Number(items);
  const totalPrice = services.reduce((total, service) => (
    selectedServices.includes(service.id) ? total + Number(service.price) * quantity : total
  ), 0);

  const createOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setCreatedOrder(null);
    if (!selectedServices.length) {
      setError('Select at least one service.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Enter a quantity of at least one.');
      return;
    }

    setSubmitting(true);
    try {
      const partnerAddress = pickupAddress.trim() || 'Partner location';
      const response = await client.post('/orders/partner-create/', {
        order_type: 'partner',
        drop_off_type: 'walk_in',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        services: selectedServices,
        service_quantities: selectedServices.map((serviceId) => ({
          service_id: serviceId,
          quantity,
        })),
        items: quantity,
        price: totalPrice,
        pickup_address: partnerAddress,
        dropoff_address: deliveryAddress.trim() || `Customer collection at ${partnerAddress}`,
      }) as CreatedPartnerOrder;
      setCreatedOrder(response);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setItems('1');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the order.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyTrackingLink = async () => {
    if (!createdOrder) return;
    try {
      await navigator.clipboard.writeText(createdOrder.tracking_url);
      setCopied(true);
    } catch {
      setError('Could not copy the tracking link. You can select and copy it below.');
    }
  };

  return (
    <section className="mt-8 border-t border-slate-200 pt-7 text-left dark:border-slate-700">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a customer order</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        The customer does not need an account. We’ll text their tracking link to the phone number provided.
      </p>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      {createdOrder ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">Order {createdOrder.order.code} created.</p>
          <p role={createdOrder.sms.success ? 'status' : 'alert'} className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            {createdOrder.sms.success ? 'Tracking SMS sent to the customer.' : `The order was created, but the SMS was not sent: ${createdOrder.sms.message}`}
          </p>
          <a href={createdOrder.tracking_url} className="mt-3 block break-all text-sm text-blue-700 underline dark:text-blue-300">
            {createdOrder.tracking_url}
          </a>
          <button type="button" onClick={() => void copyTrackingLink()} className="mt-3 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-300 dark:text-emerald-200">
            {copied ? 'Copied' : 'Copy tracking link'}
          </button>
          <button type="button" onClick={() => { setCreatedOrder(null); setCopied(false); }} className="ml-3 text-sm font-semibold text-slate-700 underline dark:text-slate-200">
            Create another order
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void createOrder(event)} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Customer name
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={200} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Customer phone
              <input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" placeholder="+254..." />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Services</legend>
            {loadingServices ? (
              <p className="mt-2 text-sm text-slate-500">Loading services…</p>
            ) : services.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedServices.includes(service.id)} onChange={(event) => {
                        setSelectedServices((current) => event.target.checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id));
                      }} />
                      {service.name}
                    </span>
                    <span className="text-slate-500">KES {Number(service.price).toLocaleString()}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-700">No active services are available.</p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Quantity
              <input type="number" min="1" step="1" value={items} onChange={(event) => setItems(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <div className="flex items-end pb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Estimated total: KES {totalPrice.toLocaleString()}
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Delivery address <span className="font-normal text-slate-500">(optional; defaults to customer collection)</span>
            <input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
          </label>

          <button type="submit" disabled={submitting || loadingServices || services.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Creating order…' : 'Create order and text customer'}
          </button>
        </form>
      )}
    </section>
  );
}

export default function PartnerOnboarding(): React.ReactElement {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    let active = true;
    const loadOnboarding = async () => {
      try {
        const [profile, applicationData] = await Promise.all([
          client.get('/users/me/'),
          client.get('/users/partner-applications/'),
        ]);
        if (!active) return;
        const latestApplication = getApplications(applicationData)[0];
        setApplication(latestApplication ?? null);
        const storedAuth = getStoredAuthState();
        if (storedAuth?.token) {
          dispatch(setAuth({ user: profile, token: storedAuth.token }));
        }
        setForm((current) => ({
          ...current,
          first_name: latestApplication?.first_name ?? profile.first_name ?? '',
          last_name: latestApplication?.last_name ?? profile.last_name ?? '',
          phone: latestApplication?.phone ?? profile.phone ?? '',
          email: latestApplication?.email ?? profile.email ?? '',
          business_name: latestApplication?.business_name ?? profile.business_name ?? '',
          business_type: latestApplication?.business_type ?? profile.business_type ?? '',
          location: latestApplication?.location ?? profile.location ?? '',
          pickup_address: latestApplication?.pickup_address ?? profile.pickup_address ?? '',
          service_area: latestApplication?.service_area ?? profile.service_area ?? '',
          machine_count: String((latestApplication?.machine_count ?? profile.machine_count) || 1),
          pickup_latitude: latestApplication ? latestApplication.pickup_latitude ?? '' : profile.pickup_latitude == null ? '' : String(profile.pickup_latitude),
          pickup_longitude: latestApplication ? latestApplication.pickup_longitude ?? '' : profile.pickup_longitude == null ? '' : String(profile.pickup_longitude),
        }));
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your partner application.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOnboarding();
    return () => {
      active = false;
    };
  }, [dispatch]);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const update = (field: keyof ApplicationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const validateStep = (): boolean => {
    const requiredByStep: (keyof ApplicationForm)[][] = [
      ['first_name', 'last_name', 'phone', 'email'],
      ['business_name', 'business_type'],
      ['location', 'pickup_address', 'service_area', 'machine_count'],
      [],
    ];
    const missing = requiredByStep[step].find((field) => !form[field].trim());
    if (missing) {
      setError('Please complete all required fields before continuing.');
      return false;
    }
    if (step === 2 && (!Number.isInteger(Number(form.machine_count)) || Number(form.machine_count) < 1)) {
      setError('Enter at least one washing machine.');
      return false;
    }
    if (step === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid email address.');
      return false;
    }
    return true;
  };

  const useCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location sharing is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update('pickup_latitude', coords.latitude.toFixed(6));
        update('pickup_longitude', coords.longitude.toFixed(6));
      },
      () => setLocationError('Could not get your location. You can continue without a map pin.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submitApplication = async () => {
    if (!accepted) {
      setError('Please confirm the information is accurate before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const submitted = await client.post('/users/partner-applications/', {
        ...form,
        machine_count: Number(form.machine_count),
        pickup_latitude: form.pickup_latitude ? Number(form.pickup_latitude) : null,
        pickup_longitude: form.pickup_longitude ? Number(form.pickup_longitude) : null,
      });
      setApplication(submitted);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  const captureLocation = form.pickup_latitude && form.pickup_longitude;

  return (
    <RouteGuard>
      <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-3 py-5 dark:bg-slate-950 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            {application && application.status !== 'rejected' ? (
              <section className="px-6 py-10 text-center sm:px-10">
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${application.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                  {application.status === 'approved' ? <CheckCircle2 size={32} /> : <Loader2 size={30} className="animate-spin" />}
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Partner application
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {application.status === 'approved' ? 'You’re approved!' : 'Application received'}
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {application.status === 'approved'
                    ? 'Your partner profile is ready. Open your washer dashboard to start managing orders.'
                    : 'Our team will review your details. You can return to this page any time to check your application status.'}
                </p>
                {application.status === 'approved' && (
                  <>
                    <Link href="/staff/washer" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700">
                      Open partner dashboard
                      <ArrowRight className="ml-2" size={18} />
                    </Link>
                    <PartnerOrderCreator pickupAddress={application.pickup_address} />
                  </>
                )}
              </section>
            ) : loading ? (
              <div className="flex min-h-72 items-center justify-center text-blue-600">
                <Loader2 className="animate-spin" />
                <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-300">Loading your application…</span>
              </div>
            ) : (
              <>
                <header className="border-b border-slate-100 px-5 pb-5 pt-6 dark:border-slate-800 sm:px-8">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <WashingMachine size={23} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Wild Wash</p>
                      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Become a laundry partner</h1>
                    </div>
                  </div>
                  <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>Step {step + 1} of {STEPS.length}</span>
                    <span>{STEPS[step].title}</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="progressbar"
                    aria-label="Partner application progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-1">
                    {STEPS.map((item, index) => {
                      const StepIcon = item.icon;
                      return (
                        <div key={item.title} className={`flex flex-col items-center gap-1 text-center text-[10px] sm:text-xs ${index <= step ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${index <= step ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <StepIcon size={15} />
                          </span>
                          <span>{item.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </header>

                <section className="px-5 py-6 sm:px-8 sm:py-8">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {step === 0 && 'How can we reach you?'}
                    {step === 1 && 'Tell us about your business'}
                    {step === 2 && 'Where will you serve customers?'}
                    {step === 3 && 'Review your application'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {step === 0 && 'Use your own contact details. We’ll use these for application updates.'}
                    {step === 1 && 'These details will appear on your partner profile after approval.'}
                    {step === 2 && 'Help customers and our team understand your location and capacity.'}
                    {step === 3 && 'Check your details before sending them to our review team.'}
                  </p>

                  {application?.status === 'rejected' && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <p className="font-semibold">Your previous application was not approved.</p>
                      <p className="mt-1">{application.reviewer_notes || 'Please review your details and resubmit your application.'}</p>
                      <p className="mt-1">You can update the information below and send it for another review.</p>
                    </div>
                  )}

                  {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

                  {step === 0 && (
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">First name
                        <input autoComplete="given-name" value={form.first_name} onChange={(event) => update('first_name', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" required />
                      </label>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Last name
                        <input autoComplete="family-name" value={form.last_name} onChange={(event) => update('last_name', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" required />
                      </label>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone number
                        <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" required />
                      </label>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email address
                        <input type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" required />
                      </label>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="mt-6 space-y-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Business or laundry name
                        <input autoComplete="organization" value={form.business_name} onChange={(event) => update('business_name', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="e.g. Fresh & Fold Laundry" required />
                      </label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Business type
                        <select value={form.business_type} onChange={(event) => update('business_type', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" required>
                          <option value="">Select a business type</option>
                          <option value="Laundry shop">Laundry shop</option>
                          <option value="Home-based laundry">Home-based laundry</option>
                          <option value="Hotel or hospitality">Hotel or hospitality</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                      <div className="rounded-xl bg-blue-50 p-4 text-sm leading-5 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        You’ll be able to update these details from your partner profile after approval.
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="mt-6 space-y-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Town or area
                        <input autoComplete="address-level2" value={form.location} onChange={(event) => update('location', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="e.g. Westlands, Nairobi" required />
                      </label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Laundry / pickup address
                        <textarea autoComplete="street-address" rows={2} value={form.pickup_address} onChange={(event) => update('pickup_address', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="Building, street and any directions" required />
                      </label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Areas you can serve
                        <textarea rows={2} value={form.service_area} onChange={(event) => update('service_area', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="List neighbourhoods or nearby areas" required />
                      </label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Number of washing machines
                        <input type="number" min="1" step="1" value={form.machine_count} onChange={(event) => update('machine_count', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" required />
                      </label>
                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Map pin <span className="font-normal text-slate-500">(optional)</span></p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{captureLocation ? `${form.pickup_latitude}, ${form.pickup_longitude}` : 'A pin helps us find your laundry location.'}</p>
                        <button type="button" onClick={useCurrentLocation} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40">
                          <MapPin size={16} className="mr-2" /> Use my current location
                        </button>
                        {locationError && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">{locationError}</p>}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="mt-6 space-y-3">
                      {[
                        ['Contact', `${form.first_name} ${form.last_name} · ${form.phone} · ${form.email}`],
                        ['Business', `${form.business_name} · ${form.business_type}`],
                        ['Location', `${form.location} · ${form.pickup_address}`],
                        ['Service area', `${form.service_area} · ${form.machine_count} machine(s)`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                          <p className="mt-1 break-words text-sm text-slate-800 dark:text-slate-100">{value}</p>
                        </div>
                      ))}
                      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); setError(''); }} className="mt-1 h-4 w-4 accent-blue-600" />
                        <span>I confirm these details are accurate and agree that Wild Wash may contact me about this application.</span>
                      </label>
                    </div>
                  )}

                  <div className="mt-8 flex gap-3">
                    {step > 0 && (
                      <button type="button" onClick={() => { setStep((current) => current - 1); setError(''); }} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft size={18} className="mr-2" /> Back
                      </button>
                    )}
                    {step < STEPS.length - 1 ? (
                      <button type="button" onClick={() => { if (validateStep()) setStep((current) => current + 1); }} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700">
                        Continue <ArrowRight size={18} className="ml-2" />
                      </button>
                    ) : (
                      <button type="button" onClick={() => void submitApplication()} disabled={submitting} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {submitting ? <><Loader2 size={18} className="mr-2 animate-spin" /> Sending…</> : 'Submit application'}
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Already a partner? <button type="button" onClick={() => router.push('/staff/washer')} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">Open your dashboard</button>
          </p>
        </div>
      </main>
    </RouteGuard>
  );
}
