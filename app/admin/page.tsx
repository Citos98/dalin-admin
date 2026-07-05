"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

type SortDirection = "asc" | "desc";

type Order = {
  id: string;
  title?: "Mr" | "Miss" | string;
  customerLang?: "ku" | "ar" | string;
  nameFirstLetter?: string;
  nameLastLetter?: string;
  phoneNetwork?: string;
  phoneFirst?: string;
  phoneLast?: string;
  items?: number;
  date?: string;
  amountUSD?: number;
  amountIQD?: number;
  shippingIQD?: number;
  status?: number;
  _realName?: string;
  _realPhone?: string;
  _deletedAt?: string;
};

type FormData = {
  orderCode: string;
  title: string;
  customerLang: string;
  fullName: string;
  fullPhone: string;
  items: number;
  date: string;
  amountUSD: number;
  amountIQD: number;
  shippingIQD: number;
  status: number;
};

type StatusOption = {
  value: number;
  label: string;
  shortLabel: string;
  tone: string;
};

type SelectValue = string | number;

type SelectItem = {
  value: SelectValue;
  label: string;
  tone?: string;
};

const ADMIN_PASSWORD = "dalin1998";

const STATUS_OPTIONS: StatusOption[] = [
  { value: 0, label: "0 - Order Placed", shortLabel: "0 Placed", tone: "neutral" },
  { value: 2, label: "2 - Preparing by Shein", shortLabel: "2 Preparing", tone: "amber" },
  { value: 3, label: "3 - Shipped to Dubai", shortLabel: "3 Shipped", tone: "purple" },
  { value: 4, label: "4 - Arrived in Dubai", shortLabel: "4 Dubai", tone: "cyan" },
  { value: 6, label: "6 - On the way to Kurdistan", shortLabel: "6 Kurdistan", tone: "orange" },
  { value: 7, label: "7 - Received & Packing", shortLabel: "7 Packing", tone: "indigo" },
  { value: 8, label: "8 - Out for Delivery", shortLabel: "8 Delivery", tone: "green" },
  { value: 9, label: "9 - Delivered", shortLabel: "9 Delivered", tone: "emerald" },
];

const TITLE_OPTIONS: SelectItem[] = [
  { value: "Mr", label: "Mr" },
  { value: "Miss", label: "Miss" },
];

const LANGUAGE_OPTIONS: SelectItem[] = [
  { value: "ku", label: "Kurdish" },
  { value: "ar", label: "Arabic" },
];

const RATE_OPTIONS: SelectItem[] = [
  { value: 1200, label: "1200" },
  { value: 1190, label: "1190" },
];

const DELIVERY_OPTIONS: SelectItem[] = [
  { value: 5000, label: "5000" },
  { value: 0, label: "Free" },
];

const STATUS_SELECT_OPTIONS: SelectItem[] = STATUS_OPTIONS.map((status) => ({
  value: status.value,
  label: status.label,
  tone: status.tone,
}));

const STATUS_SELECT_COMPACT_OPTIONS: SelectItem[] = STATUS_OPTIONS.map((status) => ({
  value: status.value,
  label: status.shortLabel,
  tone: status.tone,
}));

const FILTER_STATUS_OPTIONS: SelectItem[] = [
  { value: "all", label: "All Status" },
  ...STATUS_SELECT_OPTIONS,
];

const STATUS_LABELS: Record<number, string> = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]));
const REMOVED_STATUS_MAP: Record<number, number> = {
  1: 2,
  5: 6,
};

function getTodayDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function makeEmptyForm(): FormData {
  return {
    orderCode: "",
    title: "Miss",
    customerLang: "ku",
    fullName: "",
    fullPhone: "",
    items: 1,
    date: getTodayDate(),
    amountUSD: 0,
    amountIQD: 0,
    shippingIQD: 5000,
    status: 0,
  };
}

function normalizeOrderCode(value: string) {
  let code = value.trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d+$/.test(code)) code = `DS${code}`;
  if (code.startsWith("DS")) {
    const numbers = code.slice(2).replace(/\D/g, "");
    code = numbers ? `DS${numbers}` : "DS";
  }
  return code;
}

function normalizeActiveStatus(value?: number | string) {
  const numeric = Number(value || 0);
  if (REMOVED_STATUS_MAP[numeric] !== undefined) return REMOVED_STATUS_MAP[numeric];
  return STATUS_OPTIONS.some((item) => item.value === numeric) ? numeric : 0;
}

function getStatusOption(value?: number | string) {
  const activeStatus = normalizeActiveStatus(value);
  return STATUS_OPTIONS.find((item) => item.value === activeStatus) || STATUS_OPTIONS[0];
}

function getNextStatus(value: number) {
  const currentIndex = STATUS_OPTIONS.findIndex((item) => item.value === normalizeActiveStatus(value));
  if (currentIndex === -1 || currentIndex >= STATUS_OPTIONS.length - 1) return null;
  return STATUS_OPTIONS[currentIndex + 1].value;
}

function formatIQD(value?: number) {
  return `${Number(value || 0).toLocaleString()} IQD`;
}

function formatUSD(value?: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function cleanPhoneForWhatsApp(value?: string) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = phone.substring(1);
  if (!phone.startsWith("964")) phone = `964${phone}`;
  return phone;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

function CustomSelect({
  id,
  value,
  options,
  onChange,
  openSelectId,
  setOpenSelectId,
  className = "",
  menuTitle = "Choose option",
}: {
  id: string;
  value: SelectValue;
  options: SelectItem[];
  onChange: (value: SelectValue) => void;
  openSelectId: string | null;
  setOpenSelectId: React.Dispatch<React.SetStateAction<string | null>>;
  className?: string;
  menuTitle?: string;
}) {
  const isOpen = openSelectId === id;
  const current = options.find((option) => String(option.value) === String(value)) || options[0];

  return (
    <div className={`custom-select ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className={`custom-select-trigger ${className}`.trim()}
        onClick={() => setOpenSelectId(isOpen ? null : id)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{current?.label}</span>
        <span className="select-arrow">⌄</span>
      </button>

      {isOpen && (
        <div className="select-popover-backdrop" onMouseDown={() => setOpenSelectId(null)}>
          <div className="select-popover" onMouseDown={(event) => event.stopPropagation()} role="listbox" aria-label={menuTitle}>
            <div className="select-popover-head">
              <strong>{menuTitle}</strong>
              <button type="button" onClick={() => setOpenSelectId(null)} aria-label="Close options">×</button>
            </div>
            <div className="select-option-list">
              {options.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={`${id}-${option.value}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`select-option ${active ? "active" : ""} ${option.tone || ""}`.trim()}
                    onClick={() => {
                      onChange(option.value);
                      setOpenSelectId(null);
                    }}
                  >
                    <span>{option.label}</span>
                    {active && <b>✓</b>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const [isAuth, setIsAuth] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order | "id"; direction: SortDirection }>({ key: "id", direction: "desc" });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1200);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [isIqdDriving, setIsIqdDriving] = useState(false);
  const [formData, setFormData] = useState<FormData>(makeEmptyForm());

  const normalizedCode = normalizeOrderCode(formData.orderCode);
  const isEditing = useMemo(() => orders.some((order) => order.id === normalizedCode), [orders, normalizedCode]);

  useEffect(() => {
    if (localStorage.getItem("adminAuth") === "yes") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuth(true);
    }
    fetchOrders();
  }, []);

  const displayedOrders = useMemo(() => {
    let result = [...orders];

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.trim().toLowerCase();
      result = result.filter((order) => {
        return (
          order.id.toLowerCase().includes(lowerSearch) ||
          String(order._realName || "").toLowerCase().includes(lowerSearch) ||
          String(order._realPhone || "").includes(lowerSearch)
        );
      });
    }

    if (filterStatus !== "all") {
      result = result.filter((order) => normalizeActiveStatus(order.status) === Number(filterStatus));
    }

    result.sort((a, b) => {
      const rawA = sortConfig.key === "status" ? normalizeActiveStatus(a.status) : a[sortConfig.key as keyof Order] ?? "";
      const rawB = sortConfig.key === "status" ? normalizeActiveStatus(b.status) : b[sortConfig.key as keyof Order] ?? "";
      if (rawA < rawB) return sortConfig.direction === "asc" ? -1 : 1;
      if (rawA > rawB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, searchTerm, filterStatus, sortConfig]);

  const stats = useMemo(() => {
    const delivered = orders.filter((order) => normalizeActiveStatus(order.status) === 9).length;
    const active = orders.length - delivered;
    const totalUSD = orders.reduce((sum, order) => sum + Number(order.amountUSD || 0), 0);
    return { total: orders.length, active, delivered, totalUSD };
  }, [orders]);

  async function fetchOrders() {
    setLoadingOrders(true);
    setFetchError("");
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      const ordersList: Order[] = [];
      querySnapshot.forEach((orderDoc) => {
        const data = orderDoc.data() as Omit<Order, "id">;
        if (!data._deletedAt) {
          ordersList.push({ id: orderDoc.id, ...data });
        }
      });
      setOrders(ordersList);
    } catch (error: unknown) {
      console.error("Fetch orders error:", error);
      const message = getErrorMessage(error, "Orders could not be loaded.");
      setFetchError(message);
      setNotice({ type: "error", text: `Firebase read error: ${message}` });
    } finally {
      setLoadingOrders(false);
      setSelectedOrders([]);
    }
  }

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsAuth(true);
      localStorage.setItem("adminAuth", "yes");
      setNotice({ type: "success", text: "Dashboard ready." });
    } else {
      setNotice({ type: "error", text: "Wrong password." });
    }
  }

  function handleLogout() {
    setIsAuth(false);
    localStorage.removeItem("adminAuth");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleFormSelect(name: keyof FormData, value: SelectValue) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleUSDChange(e: React.ChangeEvent<HTMLInputElement>) {
    const usd = e.target.value === "" ? 0 : Number(e.target.value);
    setIsIqdDriving(false);
    setFormData((prev) => ({ ...prev, amountUSD: usd, amountIQD: usd * exchangeRate }));
  }

  function handleIQDChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iqd = e.target.value === "" ? 0 : Number(e.target.value);

    if (formData.amountUSD === 0 || isIqdDriving) {
      const newUsd = exchangeRate > 0 ? Number((iqd / exchangeRate).toFixed(2)) : 0;
      setFormData((prev) => ({ ...prev, amountIQD: iqd, amountUSD: newUsd }));
      setIsIqdDriving(iqd > 0);
    } else {
      setFormData((prev) => ({ ...prev, amountIQD: iqd }));
    }
  }

  function handleRateChange(value: SelectValue) {
    const rate = Number(value) || 1200;
    setExchangeRate(rate);
    setFormData((prev) => ({ ...prev, amountIQD: prev.amountUSD * rate }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);

    const code = normalizeOrderCode(formData.orderCode);
    if (!code || !/^DS\d+$/.test(code)) {
      setNotice({ type: "error", text: "Order code must be DS + number. Example: DS215 or just 215." });
      return;
    }
    if (!formData.fullName.trim() || !formData.fullPhone.trim()) {
      setNotice({ type: "error", text: "Please enter customer name and phone." });
      return;
    }

    const nameStr = formData.fullName.trim();
    const nameFirstLetter = nameStr.charAt(0).toUpperCase();
    const nameLastLetter = nameStr.charAt(nameStr.length - 1).toUpperCase();

    let phoneStr = formData.fullPhone.replace(/\D/g, "");
    if (phoneStr.startsWith("964")) phoneStr = phoneStr.substring(3);
    if (phoneStr.startsWith("0")) phoneStr = phoneStr.substring(1);

    const phoneNetwork = phoneStr.substring(0, 3) || "750";
    const phoneFirst = phoneStr.substring(3, 4) || "*";
    const phoneLast = phoneStr.slice(-2) || "**";

    setLoading(true);
    try {
      await setDoc(
        doc(db, "orders", code),
        {
          title: formData.title,
          customerLang: formData.customerLang,
          nameFirstLetter,
          nameLastLetter,
          phoneNetwork,
          phoneFirst,
          phoneLast,
          items: Number(formData.items),
          date: formData.date,
          amountUSD: Number(formData.amountUSD),
          amountIQD: Number(formData.amountIQD),
          shippingIQD: Number(formData.shippingIQD),
          status: normalizeActiveStatus(formData.status),
          _realName: formData.fullName.trim(),
          _realPhone: formData.fullPhone.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setNotice({ type: "success", text: isEditing ? `${code} updated.` : `${code} saved.` });
      setFormData(makeEmptyForm());
      setIsIqdDriving(false);
      await fetchOrders();
    } catch (error: unknown) {
      console.error("Save order error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Order could not be saved.") });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(order: Order) {
    setIsIqdDriving(false);
    setFormData({
      orderCode: order.id,
      title: order.title || "Miss",
      customerLang: order.customerLang || "ku",
      fullName: order._realName || "",
      fullPhone: order._realPhone || "",
      items: Number(order.items || 1),
      date: order.date || getTodayDate(),
      amountUSD: Number(order.amountUSD || 0),
      amountIQD: Number(order.amountIQD || 0),
      shippingIQD: order.shippingIQD !== undefined ? Number(order.shippingIQD) : 5000,
      status: normalizeActiveStatus(order.status),
    });
    setNotice({ type: "info", text: `${order.id} loaded. Edit and press Save Update.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(`Permanently delete ${id} from Firebase?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "orders", id));
      setOrders((prev) => prev.filter((order) => order.id !== id));
      setSelectedOrders((prev) => prev.filter((orderId) => orderId !== id));
      setNotice({ type: "success", text: `${id} deleted.` });
    } catch (error: unknown) {
      console.error("Delete order error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Delete failed. Firestore Rules must allow delete.") });
    }
  }

  function sendWhatsApp(order: Order) {
    const customerLang = order.customerLang === "ar" ? "ar" : "ku";
    const currentStatus = normalizeActiveStatus(order.status);
    const nextStatus = getNextStatus(currentStatus);

    const statusTexts: Record<"ku" | "ar", Record<number, string>> = {
      ku: {
        0: "داواکاری کرا",
        2: "شین ئامادەی دەکات",
        3: "نێردرا بۆ دوبەی",
        4: "گەیشتە دوبەی",
        6: "بەرەو کوردستان بەڕێکەوت",
        7: "وەرگیرا و پاکەت دەکرێت",
        8: "لە ڕێگایە بۆ گەیاندن",
        9: "گەیەنرا",
      },
      ar: {
        0: "تم الطلب",
        2: "تجهيز بواسطة شي إن",
        3: "شحن إلى دبي",
        4: "وصل إلى دبي",
        6: "في الطريق إلى كردستان",
        7: "تم الاستلام والتغليف",
        8: "في الطريق للتسليم",
        9: "تم التوصيل",
      },
    };

    const durations: Record<"ku" | "ar", Record<number, string>> = {
      ku: {
        0: "لە چاوەڕوانیدایە",
        2: "1 - 3 ڕۆژ",
        3: "6 - 10 ڕۆژ",
        4: "1 - 2 ڕۆژ",
        6: "6 - 7 ڕۆژ",
        7: "یەک ڕۆژ",
        8: "1 - 2 ڕۆژ",
        9: "گەیەنرا",
      },
      ar: {
        0: "قيد الانتظار",
        2: "1 - 3 أيام",
        3: "6 - 10 أيام",
        4: "1 - 2 أيام",
        6: "6 - 7 أيام",
        7: "يوم واحد",
        8: "2 - 3 أيام",
        9: "تم التوصيل",
      },
    };

    const trackingLink = `${window.location.origin}`;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const currentDateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const nextStageName = nextStatus !== null ? statusTexts[customerLang][nextStatus] : customerLang === "ku" ? "گەیەنرا (Delivered)" : "تم التوصيل (Delivered)";

    let estDate = "";
    if (order.date) {
      const parts = order.date.split(".");
      if (parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        d.setDate(d.getDate() + 20);
        estDate = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
      }
    }
    if (!estDate) estDate = customerLang === "ku" ? "15-20 ڕۆژ" : "15-20 يوماً";

    const customerName = order._realName || "";
    const greeting =
      customerLang === "ku"
        ? `سڵاو بەڕێز ${order.title === "Miss" ? "خان " + customerName : "کاک " + customerName}`
        : `مرحباً ${order.title === "Miss" ? "الآنسة" : "السيد"} ${customerName}`;

    const message =
      customerLang === "ku"
        ? `${greeting}،\n\n📅 بەرواری نامە: ${currentDateStr}\n\n📦 ژمارەی داواکاری: *${order.id}*\n🔄 قۆناغی ئێستا: *${statusTexts.ku[currentStatus]}*\n⏳ کاتی پێشبینیکراو بۆ ئەم قۆناغە: *${durations.ku[currentStatus]}*\n\n${nextStatus !== null ? `⏭️ قۆناغی داهاتوو: *${nextStageName}*\n\n` : ""}📆 کاتی خەمڵێنراوی گەیشتن: *${estDate}*\n\n🔗 بۆ بەدواداچوونی وردی داواکارییەکەت، سەردانی ئەم بەستەرە بکە:\n${trackingLink}`
        : `${greeting}،\n\n📅 تاريخ الرسالة: ${currentDateStr}\n\n📦 رقم الطلب: *${order.id}*\n🔄 المرحلة الحالية: *${statusTexts.ar[currentStatus]}*\n⏳ الوقت المتوقع لهذه المرحلة: *${durations.ar[currentStatus]}*\n\n${nextStatus !== null ? `⏭️ المرحلة التالية: *${nextStageName}*\n\n` : ""}📆 تاريخ الوصول المتوقع: *${estDate}*\n\n🔗 لتتبع طلبك بالتفصيل، يرجى زيارة الرابط التالي:\n${trackingLink}`;

    window.location.href = `https://api.whatsapp.com/send?phone=${cleanPhoneForWhatsApp(order._realPhone)}&text=${encodeURIComponent(message)}`;
  }

  async function handleQuickStatusChange(id: string, newStatus: string) {
    try {
      const status = normalizeActiveStatus(newStatus);
      await updateDoc(doc(db, "orders", id), { status, updatedAt: new Date().toISOString() });
      setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status } : order)));
      setNotice({ type: "success", text: `${id} status updated.` });
    } catch (error: unknown) {
      console.error("Status update error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Status update failed.") });
    }
  }

  function handleSort(key: keyof Order | "id") {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  }

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedOrders(e.target.checked ? displayedOrders.map((order) => order.id) : []);
  }

  function handleSelectOne(id: string) {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]));
  }

  async function handleBulkUpdate() {
    if (selectedOrders.length === 0) {
      setNotice({ type: "error", text: "Select at least one order." });
      return;
    }

    setLoading(true);
    try {
      const status = normalizeActiveStatus(bulkStatus);
      for (const id of selectedOrders) {
        await updateDoc(doc(db, "orders", id), { status, updatedAt: new Date().toISOString() });
      }
      setNotice({ type: "success", text: `${selectedOrders.length} orders updated to ${STATUS_LABELS[status]}.` });
      await fetchOrders();
    } catch (error: unknown) {
      console.error("Bulk update error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Bulk update failed.") });
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedOrders.length === 0) {
      setNotice({ type: "error", text: "Select at least one order." });
      return;
    }

    const confirmed = window.confirm(`Permanently delete ${selectedOrders.length} selected orders from Firebase?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      for (const id of selectedOrders) {
        await deleteDoc(doc(db, "orders", id));
      }
      setOrders((prev) => prev.filter((order) => !selectedOrders.includes(order.id)));
      setNotice({ type: "success", text: `${selectedOrders.length} selected orders deleted.` });
      setSelectedOrders([]);
    } catch (error: unknown) {
      console.error("Bulk delete error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Selected orders could not be deleted. Firestore Rules must allow delete.") });
    } finally {
      setLoading(false);
    }
  }

  const sortMark = (key: keyof Order | "id") => (sortConfig.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "");

  if (!isAuth) {
    return (
      <>
        <AdminStyles />
        <main className="admin-login-page">
          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-badge">DS</div>
            <h1>Dalin Admin</h1>
            <p>Staff order dashboard</p>
            {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Admin password"
              autoFocus
            />
            <button type="submit">Login</button>
          </form>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminStyles />
      <main className="admin-page">
        <section className="admin-shell">
          <header className="admin-header">
            <div className="admin-heading">
              <span className="eyebrow">Dalin Shopping</span>
              <h1>Admin</h1>
              <p>Fast order entry and status control.</p>
            </div>
            <div className="header-actions">
              <Link href="/" className="secondary-link">Home</Link>
              <button type="button" className="ghost-btn" onClick={fetchOrders} disabled={loadingOrders}>Refresh</button>
              <button type="button" className="danger-soft-btn" onClick={handleLogout}>Logout</button>
            </div>
          </header>

          {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
          {fetchError && <div className="notice error">Firebase error: {fetchError}</div>}

          <section className="stats-grid">
            <div className="stat-card"><span>Total</span><strong>{stats.total}</strong></div>
            <div className="stat-card"><span>Active</span><strong>{stats.active}</strong></div>
            <div className="stat-card"><span>Delivered</span><strong>{stats.delivered}</strong></div>
            <div className="stat-card"><span>USD</span><strong>{formatUSD(stats.totalUSD)}</strong></div>
          </section>

          <section className="panel-card form-panel">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">Quick Order</span>
                <h2>{isEditing ? "Update Order" : "Add Order"}</h2>
              </div>
              {isEditing && <span className="edit-chip">Editing {normalizedCode}</span>}
            </div>

            <form onSubmit={handleSubmit} className="quick-order-form">
              <div className="form-strip">
                <label className="field-code">
                  <span>Code</span>
                  <input type="text" name="orderCode" value={formData.orderCode} onChange={handleChange} required placeholder="215" />
                </label>

                <label className="field-title">
                  <span>Title</span>
                  <CustomSelect
                    id="form-title"
                    value={formData.title}
                    options={TITLE_OPTIONS}
                    onChange={(value) => handleFormSelect("title", value)}
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    menuTitle="Customer title"
                  />
                </label>

                <label className="field-lang">
                  <span>Lang</span>
                  <CustomSelect
                    id="form-language"
                    value={formData.customerLang}
                    options={LANGUAGE_OPTIONS}
                    onChange={(value) => handleFormSelect("customerLang", value)}
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    menuTitle="Customer language"
                  />
                </label>

                <label className="field-name">
                  <span>Name</span>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Customer" />
                </label>

                <label className="field-phone">
                  <span>Phone</span>
                  <input type="text" name="fullPhone" value={formData.fullPhone} onChange={handleChange} required placeholder="0750..." />
                </label>

                <label className="field-items">
                  <span>Items</span>
                  <input type="number" min="1" name="items" value={formData.items} onChange={handleChange} required />
                </label>

                <label className="field-date">
                  <span>Date</span>
                  <input type="text" name="date" value={formData.date} onChange={handleChange} required placeholder="04.07.2026" />
                </label>

                <label className="field-usd">
                  <span className="label-with-select">
                    USD
                    <CustomSelect
                      id="exchange-rate"
                      value={exchangeRate}
                      options={RATE_OPTIONS}
                      onChange={handleRateChange}
                      openSelectId={openSelectId}
                      setOpenSelectId={setOpenSelectId}
                      className="mini-select-trigger"
                      menuTitle="Exchange rate"
                    />
                  </span>
                  <input type="number" name="amountUSD" value={formData.amountUSD === 0 ? "" : formData.amountUSD} placeholder="0" onChange={handleUSDChange} required />
                </label>

                <label className="field-iqd">
                  <span>IQD</span>
                  <input type="number" name="amountIQD" value={formData.amountIQD === 0 ? "" : formData.amountIQD} placeholder="0" onChange={handleIQDChange} required />
                </label>

                <label className="field-ship">
                  <span>Delivery</span>
                  <CustomSelect
                    id="form-delivery"
                    value={formData.shippingIQD}
                    options={DELIVERY_OPTIONS}
                    onChange={(value) => handleFormSelect("shippingIQD", Number(value))}
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    menuTitle="Delivery fee"
                  />
                </label>

                <label className="field-status">
                  <span>Status</span>
                  <CustomSelect
                    id="form-status"
                    value={formData.status}
                    options={STATUS_SELECT_OPTIONS}
                    onChange={(value) => handleFormSelect("status", Number(value))}
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    className={`status-select ${getStatusOption(formData.status).tone}`}
                    menuTitle="Order status"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="ghost-btn" onClick={() => { setFormData(makeEmptyForm()); setNotice(null); }}>
                  Clear
                </button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Saving..." : isEditing ? "Save Update" : "Save Order"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel-card orders-panel">
            <div className="panel-title-row orders-title-row">
              <div>
                <span className="eyebrow">Orders</span>
                <h2>Order List <small>({displayedOrders.length})</small></h2>
              </div>
              <div className="filter-row">
                <input
                  type="text"
                  placeholder="Search code, name, phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <CustomSelect
                  id="filter-status"
                  value={filterStatus}
                  options={FILTER_STATUS_OPTIONS}
                  onChange={(value) => setFilterStatus(String(value))}
                  openSelectId={openSelectId}
                  setOpenSelectId={setOpenSelectId}
                  menuTitle="Filter status"
                />
              </div>
            </div>

            <div className={`bulk-bar ${selectedOrders.length > 0 ? "active" : ""}`}>
              <label className="select-all-inline">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === displayedOrders.length && displayedOrders.length > 0}
                  onChange={handleSelectAll}
                />
                <span>{selectedOrders.length} selected</span>
              </label>
              <CustomSelect
                id="bulk-status"
                value={bulkStatus}
                options={STATUS_SELECT_COMPACT_OPTIONS.map((status) => ({ ...status, label: `To: ${status.label}` }))}
                onChange={(value) => setBulkStatus(Number(value))}
                openSelectId={openSelectId}
                setOpenSelectId={setOpenSelectId}
                menuTitle="Bulk status"
              />
              <button type="button" className="primary-soft-btn" onClick={handleBulkUpdate} disabled={selectedOrders.length === 0 || loading}>Update</button>
              <button type="button" className="danger-soft-btn" onClick={handleBulkDelete} disabled={selectedOrders.length === 0 || loading}>Delete</button>
            </div>

            {loadingOrders ? (
              <div className="empty-state">Loading orders...</div>
            ) : displayedOrders.length === 0 ? (
              <div className="empty-state">No orders found.</div>
            ) : (
              <>
                <div className="mobile-orders-list">
                  {displayedOrders.map((order) => {
                    const status = normalizeActiveStatus(order.status);
                    const option = getStatusOption(status);
                    return (
                      <article key={order.id} className={`mobile-order-row ${selectedOrders.includes(order.id) ? "selected" : ""}`}>
                        <label className="mobile-select-box" aria-label={`Select ${order.id}`}>
                          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectOne(order.id)} />
                        </label>

                        <button type="button" className="mobile-main-info" onClick={() => handleEdit(order)}>
                          <span className="mobile-code">{order.id}</span>
                          <strong>{order.title}. {order._realName || "No name"}</strong>
                          <small dir="ltr">{order._realPhone || "No phone"} · {formatUSD(order.amountUSD)} · {order.date || "-"}</small>
                        </button>

                        <CustomSelect
                          id={`mobile-status-${order.id}`}
                          value={status}
                          options={STATUS_SELECT_COMPACT_OPTIONS}
                          onChange={(value) => handleQuickStatusChange(order.id, String(value))}
                          openSelectId={openSelectId}
                          setOpenSelectId={setOpenSelectId}
                          className={`status-select mobile-status ${option.tone}`}
                          menuTitle={`${order.id} status`}
                        />

                        <div className="mobile-row-actions">
                          <button type="button" className="wa-btn" onClick={() => sendWhatsApp(order)}>WA</button>
                          <button type="button" className="edit-btn" onClick={() => handleEdit(order)}>Edit</button>
                          <button type="button" className="delete-btn" onClick={() => handleDelete(order.id)}>Del</button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="table-wrap">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th className="check-col"></th>
                        <th onClick={() => handleSort("id")}>Code{sortMark("id")}</th>
                        <th onClick={() => handleSort("_realName")}>Customer{sortMark("_realName")}</th>
                        <th onClick={() => handleSort("status")}>Status{sortMark("status")}</th>
                        <th onClick={() => handleSort("amountUSD")}>Price{sortMark("amountUSD")}</th>
                        <th onClick={() => handleSort("date")}>Date{sortMark("date")}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedOrders.map((order) => {
                        const status = normalizeActiveStatus(order.status);
                        const option = getStatusOption(status);
                        return (
                          <tr key={order.id} className={selectedOrders.includes(order.id) ? "selected-row" : ""}>
                            <td>
                              <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectOne(order.id)} />
                            </td>
                            <td>
                              <strong className="order-code">{order.id}</strong>
                            </td>
                            <td>
                              <div className="customer-cell">
                                <strong>{order.title}. {order._realName || "No name"}</strong>
                                <span>{order._realPhone || "No phone"}</span>
                              </div>
                            </td>
                            <td>
                              <CustomSelect
                                id={`table-status-${order.id}`}
                                value={status}
                                options={STATUS_SELECT_OPTIONS}
                                onChange={(value) => handleQuickStatusChange(order.id, String(value))}
                                openSelectId={openSelectId}
                                setOpenSelectId={setOpenSelectId}
                                className={`status-select ${option.tone}`}
                                menuTitle={`${order.id} status`}
                              />
                            </td>
                            <td>
                              <strong>{formatUSD(order.amountUSD)}</strong>
                              <span className="sub-money">{formatIQD(order.amountIQD)}</span>
                            </td>
                            <td>{order.date}</td>
                            <td>
                              <div className="row-actions">
                                <button type="button" className="wa-btn" onClick={() => sendWhatsApp(order)}>WA</button>
                                <button type="button" className="edit-btn" onClick={() => handleEdit(order)}>Edit</button>
                                <button type="button" className="delete-btn" onClick={() => handleDelete(order.id)}>Del</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

function AdminStyles() {
  return (
    <style>{`
      :root {
        --admin-bg: #030504;
        --admin-card: #08100d;
        --admin-card-strong: #0c1712;
        --admin-soft: #050a08;
        --admin-text: #fff3df;
        --admin-muted: #b6a991;
        --admin-border: rgba(0, 155, 105, 0.24);
        --admin-primary: #009b69;
        --admin-primary-dark: #007a53;
        --admin-primary-glow: rgba(25, 212, 147, 0.18);
        --admin-orange: #b85a16;
        --admin-orange-dark: #8c3f0d;
        --admin-on-orange: #100b07;
        --admin-danger: #d9485f;
        --admin-warning: #b85a16;
        --admin-shadow: 0 22px 70px rgba(0, 0, 0, 0.58);
        --admin-radius: 18px;
      }

      * { box-sizing: border-box; }

      .admin-login-page,
      .admin-page {
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--admin-text);
        background:
          radial-gradient(circle at 8% -8%, rgba(0, 155, 105, 0.22), transparent 34%),
          radial-gradient(circle at 92% 0%, rgba(184, 90, 22, 0.15), transparent 30%),
          linear-gradient(180deg, #07100c 0%, var(--admin-bg) 52%, #010202 100%);
        text-shadow: 0 0 9px rgba(255, 243, 223, 0.08);
      }

      .admin-page { padding: 18px; }

      .admin-shell {
        width: min(1260px, 100%);
        margin: 0 auto;
        display: grid;
        gap: 14px;
      }

      .admin-header,
      .panel-card,
      .stat-card,
      .login-card {
        background: linear-gradient(180deg, rgba(12, 23, 18, 0.98), rgba(4, 9, 7, 0.98));
        border: 1px solid var(--admin-border);
        box-shadow: var(--admin-shadow);
      }

      .admin-header {
        min-height: 84px;
        border-radius: var(--admin-radius);
        padding: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .admin-heading h1,
      .panel-title-row h2 {
        margin: 2px 0 0;
        line-height: 1;
      }

      .admin-heading h1 { font-size: 2rem; letter-spacing: -0.05em; }
      .admin-heading p { margin: 8px 0 0; color: var(--admin-muted); font-size: 13px; font-weight: 700; }

      .eyebrow {
        color: var(--admin-primary);
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      button,
      .secondary-link {
        border: 0;
        border-radius: 12px;
        padding: 11px 14px;
        min-height: 40px;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.12s ease, opacity 0.12s ease, background 0.12s ease;
      }

      button:active,
      .secondary-link:active { transform: scale(0.98); }
      button:disabled { opacity: 0.5; cursor: not-allowed; }

      .primary-btn {
        background: linear-gradient(135deg, var(--admin-orange), #d06a18);
        color: var(--admin-on-orange);
        box-shadow: 0 0 18px rgba(184, 90, 22, 0.20);
      }
      .primary-btn:hover { background: linear-gradient(135deg, #ca681d, var(--admin-orange)); }
      .ghost-btn, .secondary-link { background: rgba(255, 243, 223, 0.06); color: var(--admin-text); border: 1px solid rgba(0, 155, 105, 0.22); }
      .primary-soft-btn { background: rgba(0, 155, 105, 0.17); color: #bfffe8; border: 1px solid rgba(0, 155, 105, 0.32); }
      .danger-soft-btn { background: rgba(217, 72, 95, 0.13); color: #ffd1d8; border: 1px solid rgba(217, 72, 95, 0.26); }
      .wa-btn { background: rgba(0, 155, 105, 0.17); color: #bfffe8; border: 1px solid rgba(0, 155, 105, 0.32); }
      .edit-btn { background: rgba(184, 90, 22, 0.16); color: #ffd2a8; border: 1px solid rgba(184, 90, 22, 0.32); }
      .delete-btn { background: rgba(217, 72, 95, 0.13); color: #ffd1d8; border: 1px solid rgba(217, 72, 95, 0.26); }

      .notice {
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 13px;
        font-weight: 850;
        border: 1px solid transparent;
      }
      .notice.success { color: #c7ffe9; background: rgba(0, 155, 105, 0.12); border-color: rgba(0, 155, 105, 0.28); }
      .notice.error { color: #ffd1d8; background: rgba(217, 72, 95, 0.12); border-color: rgba(217, 72, 95, 0.28); }
      .notice.info { color: #ffe1bd; background: rgba(184, 90, 22, 0.12); border-color: rgba(184, 90, 22, 0.28); }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .stat-card {
        border-radius: 16px;
        padding: 14px 16px;
        display: grid;
        gap: 4px;
      }
      .stat-card span { color: var(--admin-muted); font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.09em; }
      .stat-card strong { font-size: 24px; letter-spacing: -0.04em; }

      .panel-card {
        border-radius: var(--admin-radius);
        padding: 16px;
      }

      .panel-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .panel-title-row h2 { font-size: 1.35rem; letter-spacing: -0.04em; }
      .panel-title-row small { color: var(--admin-muted); font-size: 0.9rem; }

      .edit-chip {
        background: rgba(0, 155, 105, 0.16);
        color: #c7ffe9;
        border: 1px solid rgba(0, 155, 105, 0.32);
        border-radius: 999px;
        padding: 8px 11px;
        font-size: 12px;
        font-weight: 950;
      }

      .quick-order-form { display: grid; gap: 12px; }

      .form-strip {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 8px;
        align-items: end;
      }

      .form-strip label {
        display: grid;
        gap: 5px;
        min-width: 0;
        color: var(--admin-muted);
        font-size: 11px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .field-code { grid-column: span 2; }
      .field-title { grid-column: span 1; }
      .field-lang { grid-column: span 2; }
      .field-name { grid-column: span 3; }
      .field-phone { grid-column: span 3; }
      .field-items { grid-column: span 1; }
      .field-date { grid-column: span 2; }
      .field-usd { grid-column: span 2; }
      .field-iqd { grid-column: span 2; }
      .field-ship { grid-column: span 2; }
      .field-status { grid-column: span 4; }

      input,
      .custom-select-trigger {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--admin-border);
        background: linear-gradient(180deg, #08100d, #050a08);
        color: var(--admin-text);
        border-radius: 12px;
        min-height: 42px;
        padding: 10px 11px;
        outline: none;
        font-size: 14px;
        font-weight: 850;
        box-shadow: inset 0 1px 0 rgba(255, 243, 223, 0.04), 0 0 0 rgba(0, 155, 105, 0);
      }

      .custom-select { position: relative; width: 100%; min-width: 0; }
      .custom-select-trigger {
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        text-align: left;
      }
      .custom-select-trigger span:first-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .select-arrow {
        width: 24px;
        height: 24px;
        flex: 0 0 auto;
        border-radius: 8px;
        background: rgba(0, 155, 105, 0.16);
        color: #bfffe8;
        display: grid;
        place-items: center;
        line-height: 1;
        box-shadow: 0 0 12px rgba(0, 155, 105, 0.12);
      }
      .custom-select.is-open .select-arrow { transform: rotate(180deg); }

      .select-popover-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(1, 2, 2, 0.46);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }
      .select-popover {
        width: min(380px, calc(100vw - 28px));
        max-height: min(650px, calc(100vh - 36px));
        overflow: hidden;
        border-radius: 20px;
        background: linear-gradient(180deg, #0b1611, #030605);
        border: 1px solid rgba(0, 155, 105, 0.36);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.70), 0 0 30px rgba(0, 155, 105, 0.13);
      }
      .select-popover-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 14px 10px;
        border-bottom: 1px solid rgba(0, 155, 105, 0.18);
      }
      .select-popover-head strong {
        color: var(--admin-text);
        font-size: 13px;
        font-weight: 950;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }
      .select-popover-head button {
        min-height: 32px;
        width: 32px;
        padding: 0;
        border-radius: 10px;
        background: rgba(184, 90, 22, 0.18);
        color: #ffd2a8;
        border: 1px solid rgba(184, 90, 22, 0.30);
        font-size: 20px;
        line-height: 1;
      }
      .select-option-list {
        display: grid;
        gap: 7px;
        padding: 10px;
        max-height: min(540px, calc(100vh - 118px));
        overflow: auto;
      }
      .select-option {
        width: 100%;
        min-height: 42px;
        justify-content: space-between;
        border-radius: 13px;
        padding: 10px 12px;
        background: rgba(255, 243, 223, 0.055);
        color: var(--admin-text);
        border: 1px solid rgba(0, 155, 105, 0.16);
        text-align: left;
        box-shadow: none;
      }
      .select-option:hover {
        background: linear-gradient(135deg, var(--admin-orange), #d06a18);
        color: var(--admin-on-orange);
        border-color: rgba(255, 175, 95, 0.5);
        text-shadow: none;
      }
      .select-option.active {
        background: linear-gradient(135deg, rgba(0, 155, 105, 0.32), rgba(0, 122, 83, 0.38));
        border-color: rgba(0, 155, 105, 0.55);
        box-shadow: 0 0 18px rgba(0, 155, 105, 0.14);
      }
      .select-option b { color: #bfffe8; font-size: 15px; }

      input::placeholder { color: rgba(237, 253, 247, 0.42); }

      input:focus,
      .custom-select-trigger:focus {
        border-color: rgba(0, 155, 105, 0.70);
        box-shadow: 0 0 0 4px rgba(0, 155, 105, 0.13), 0 0 16px rgba(0, 155, 105, 0.10);
      }

      .label-with-select {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .label-with-select .custom-select { width: 78px; }
      .label-with-select .custom-select-trigger,
      .label-with-select .mini-select-trigger {
        min-height: 26px;
        padding: 3px 6px;
        border-radius: 8px;
        font-size: 11px;
      }
      .label-with-select .select-arrow {
        width: 17px;
        height: 17px;
        border-radius: 6px;
        font-size: 10px;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .form-actions button { min-width: 130px; }

      .orders-title-row { align-items: end; }
      .filter-row {
        display: grid;
        grid-template-columns: minmax(180px, 270px) minmax(160px, 240px);
        gap: 8px;
      }

      .bulk-bar {
        display: grid;
        grid-template-columns: minmax(130px, 0.8fr) minmax(180px, 1.1fr) auto auto;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 14px;
        background: var(--admin-soft);
        border: 1px solid var(--admin-border);
      }
      .bulk-bar.active { background: rgba(0, 155, 105, 0.13); border-color: rgba(0, 155, 105, 0.34); }
      .select-all-inline {
        display: flex;
        align-items: center;
        gap: 9px;
        font-size: 13px;
        color: var(--admin-muted);
        font-weight: 950;
      }
      .select-all-inline input,
      .orders-table input[type="checkbox"],
      .mobile-select-box input {
        width: 18px;
        height: 18px;
        min-height: 18px;
        accent-color: var(--admin-primary);
        cursor: pointer;
      }

      .empty-state {
        border-radius: 14px;
        background: var(--admin-soft);
        border: 1px dashed var(--admin-border);
        color: var(--admin-muted);
        padding: 24px;
        text-align: center;
        font-weight: 900;
      }

      .table-wrap {
        width: 100%;
        overflow: auto;
        border: 1px solid var(--admin-border);
        border-radius: 16px;
        background: #050a08;
      }
      .orders-table {
        width: 100%;
        min-width: 900px;
        border-collapse: collapse;
      }
      .orders-table th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #0b1611;
        color: #9fb9b0;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.08em;
        text-align: left;
        text-transform: uppercase;
        padding: 11px 12px;
        border-bottom: 1px solid var(--admin-border);
        cursor: pointer;
        white-space: nowrap;
      }
      .orders-table th:last-child { cursor: default; text-align: right; }
      .orders-table td {
        padding: 10px 12px;
        border-top: 1px solid rgba(0, 155, 105, 0.13);
        vertical-align: middle;
        font-size: 13px;
        font-weight: 800;
      }
      .orders-table tr:hover { background: rgba(0, 155, 105, 0.07); }
      .orders-table tr.selected-row { background: rgba(0, 155, 105, 0.13); }
      .order-code { color: var(--admin-primary); font-size: 15px; letter-spacing: 0.02em; }
      .customer-cell { display: grid; gap: 2px; }
      .customer-cell span,
      .sub-money { display: block; color: var(--admin-muted); font-size: 12px; font-weight: 800; margin-top: 2px; }

      .status-select {
        min-height: 38px;
        max-width: 230px;
        font-size: 12px;
        border-width: 1px;
      }
      .status-select.neutral { background: rgba(255, 243, 223, 0.055); color: #fff3df; border-color: rgba(255, 243, 223, 0.15); }
      .status-select.amber { background: rgba(184, 90, 22, 0.16); color: #ffd2a8; border-color: rgba(184, 90, 22, 0.32); }
      .status-select.purple { background: rgba(104, 73, 132, 0.18); color: #e8d4ff; border-color: rgba(162, 123, 202, 0.28); }
      .status-select.cyan { background: rgba(0, 116, 107, 0.17); color: #c7fff2; border-color: rgba(0, 155, 135, 0.30); }
      .status-select.orange { background: rgba(184, 90, 22, 0.20); color: #ffd2a8; border-color: rgba(184, 90, 22, 0.38); }
      .status-select.indigo { background: rgba(64, 73, 115, 0.18); color: #d9e2ff; border-color: rgba(112, 128, 190, 0.28); }
      .status-select.green { background: rgba(0, 155, 105, 0.17); color: #bfffe8; border-color: rgba(0, 155, 105, 0.34); }
      .status-select.emerald { background: rgba(0, 155, 105, 0.22); color: #d1ffef; border-color: rgba(0, 155, 105, 0.42); }

      .filter-row .custom-select-trigger,
      .bulk-bar .custom-select-trigger,
      .field-status .custom-select-trigger,
      .status-select,
      .mobile-status {
        box-shadow: inset 0 1px 0 rgba(255, 243, 223, 0.04), 0 8px 20px rgba(0, 0, 0, 0.16);
      }

      .status-select:hover,
      .filter-row .custom-select-trigger:hover,
      .bulk-bar .custom-select-trigger:hover,
      .field-status .custom-select-trigger:hover {
        border-color: rgba(0, 155, 105, 0.54);
      }

      .row-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        white-space: nowrap;
      }
      .row-actions button { padding: 8px 10px; min-height: 34px; font-size: 12px; }

      .mobile-orders-list { display: none; }

      .login-card {
        width: min(420px, calc(100% - 28px));
        margin: 14vh auto 0;
        border-radius: 22px;
        padding: 28px;
        display: grid;
        gap: 14px;
        text-align: center;
      }
      .login-badge {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        background: linear-gradient(135deg, #16a34a, #14b8a6);
        color: white;
        display: grid;
        place-items: center;
        margin: 0 auto;
        font-weight: 950;
        font-size: 20px;
      }
      .login-card h1 { margin: 0; font-size: 2rem; letter-spacing: -0.06em; }
      .login-card p { margin: 0; color: var(--admin-muted); font-weight: 800; }
      .login-card button { background: var(--admin-primary); color: white; }

      @media (max-width: 920px) {
        .stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .admin-header { align-items: stretch; }
        .admin-heading p { display: none; }
        .header-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); min-width: 320px; }
        .header-actions > * { width: 100%; }
        .orders-title-row { align-items: stretch; flex-direction: column; }
        .filter-row { grid-template-columns: 1fr 1fr; }
      }

      @media (max-width: 760px) {
        .admin-page { padding: 8px 6px 22px; }
        .admin-shell { gap: 8px; }
        .admin-header {
          min-height: 0;
          padding: 10px;
          border-radius: 14px;
          align-items: center;
        }
        .admin-heading h1 { font-size: 1.25rem; }
        .eyebrow { font-size: 9px; letter-spacing: 0.12em; }
        .header-actions { min-width: 0; grid-template-columns: repeat(3, 1fr); gap: 5px; }
        .header-actions > * { min-height: 34px; padding: 7px 5px; font-size: 10px; border-radius: 10px; }

        .stats-grid { display: none; }
        .panel-card { padding: 9px; border-radius: 14px; }
        .panel-title-row { margin-bottom: 7px; }
        .panel-title-row h2 { font-size: 1.02rem; }
        .edit-chip { padding: 5px 7px; font-size: 10px; }

        .quick-order-form { gap: 7px; }
        .form-strip {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }
        .form-strip label { gap: 3px; font-size: 9px; letter-spacing: 0.04em; }
        .field-code { grid-column: span 2; }
        .field-title { grid-column: span 1; }
        .field-lang { grid-column: span 1; }
        .field-name { grid-column: span 2; }
        .field-phone { grid-column: span 2; }
        .field-items { grid-column: span 1; }
        .field-date { grid-column: span 1; }
        .field-usd { grid-column: span 1; }
        .field-iqd { grid-column: span 1; }
        .field-ship { grid-column: span 2; }
        .field-status { grid-column: span 2; }

        input,
        .custom-select-trigger {
          min-height: 36px;
          border-radius: 9px;
          padding: 7px 7px;
          font-size: 12px;
          font-weight: 850;
        }
        .label-with-select { gap: 3px; }
        .label-with-select .custom-select { width: 58px; }
        .label-with-select .custom-select-trigger,
        .label-with-select .mini-select-trigger { min-height: 20px; font-size: 9px; padding: 1px 3px; border-radius: 6px; }
        .label-with-select .select-arrow { width: 14px; height: 14px; font-size: 8px; border-radius: 5px; }
        .form-actions { display: grid; grid-template-columns: 0.75fr 1.25fr; gap: 6px; }
        .form-actions button { width: 100%; min-width: 0; min-height: 37px; padding: 8px 6px; font-size: 12px; border-radius: 10px; }

        .orders-title-row { gap: 7px; }
        .filter-row { grid-template-columns: 1fr 1fr; gap: 6px; }
        .filter-row input,
        .filter-row .custom-select-trigger { min-height: 36px; }

        .bulk-bar {
          grid-template-columns: minmax(94px, 0.8fr) minmax(118px, 1.1fr) 62px 58px;
          gap: 5px;
          padding: 6px;
          margin-bottom: 6px;
          border-radius: 11px;
        }
        .bulk-bar .custom-select-trigger { min-height: 34px; font-size: 11px; }
        .bulk-bar button { min-height: 34px; padding: 7px 3px; font-size: 10px; border-radius: 9px; }
        .select-all-inline { gap: 5px; font-size: 11px; }
        .select-all-inline input { width: 16px; height: 16px; min-height: 16px; }

        .table-wrap { display: none; }
        .mobile-orders-list {
          display: grid;
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          overflow: hidden;
          background: #050a08;
        }
        .mobile-order-row {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) 104px;
          grid-template-areas:
            "check main status"
            "check main actions";
          align-items: center;
          gap: 5px 7px;
          padding: 7px;
          border-bottom: 1px solid rgba(0, 155, 105, 0.13);
          background: #050a08;
        }
        .mobile-order-row:last-child { border-bottom: 0; }
        .mobile-order-row.selected { background: rgba(0, 155, 105, 0.13); }
        .mobile-select-box { grid-area: check; display: grid; place-items: center; }
        .mobile-select-box input { width: 17px; height: 17px; min-height: 17px; }
        .mobile-main-info {
          grid-area: main;
          min-width: 0;
          min-height: 0;
          padding: 0;
          border-radius: 0;
          background: transparent;
          color: var(--admin-text);
          display: grid;
          justify-content: stretch;
          text-align: left;
          gap: 1px;
        }
        .mobile-main-info:hover { background: transparent; }
        .mobile-code { color: var(--admin-primary); font-size: 13px; font-weight: 950; letter-spacing: 0.02em; }
        .mobile-main-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          line-height: 1.1;
        }
        .mobile-main-info small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--admin-muted);
          font-size: 10.5px;
          font-weight: 850;
        }
        .mobile-status {
          grid-area: status;
          width: 100%;
          max-width: 104px;
          min-height: 34px;
          padding: 6px 5px;
          font-size: 10.5px;
          border-radius: 9px;
        }
        .mobile-row-actions {
          grid-area: actions;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 3px;
        }
        .mobile-row-actions button {
          min-height: 28px;
          padding: 4px 2px;
          border-radius: 8px;
          font-size: 9.5px;
        }
      }

      @media (max-width: 430px) {
        .admin-page { padding-left: 5px; padding-right: 5px; }
        .panel-card { padding: 7px; }
        .form-strip { gap: 5px; }
        input, .custom-select-trigger { font-size: 11.5px; padding-left: 6px; padding-right: 6px; }
        .bulk-bar { grid-template-columns: 1fr 1fr; }
        .bulk-bar .primary-soft-btn,
        .bulk-bar .danger-soft-btn { min-height: 32px; }
        .mobile-order-row {
          grid-template-columns: 22px minmax(0, 1fr) 92px;
          gap: 4px 5px;
          padding: 6px;
        }
        .mobile-status { max-width: 92px; font-size: 10px; }
        .mobile-code { font-size: 12.5px; }
        .mobile-main-info strong { font-size: 11.5px; }
        .mobile-main-info small { font-size: 10px; }
      }
    `}</style>
  );
}
