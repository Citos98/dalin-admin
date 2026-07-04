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

const ADMIN_PASSWORD = "dalin1998";

const STATUS_LABELS = [
  "0 - Order Placed",
  "1 - Order Purchased",
  "2 - Preparing by Shein",
  "3 - Shipped to Dubai",
  "4 - Arrived in Dubai",
  "5 - Waiting in Dubai",
  "6 - On the way to Kurdistan",
  "7 - Received & Packing",
  "8 - Out for Delivery",
  "9 - Delivered",
];

const STATUS_TONE = [
  "neutral",
  "blue",
  "amber",
  "purple",
  "cyan",
  "slate",
  "orange",
  "indigo",
  "green",
  "emerald",
];

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
      result = result.filter((order) => Number(order.status || 0) === Number(filterStatus));
    }

    result.sort((a, b) => {
      const valA = a[sortConfig.key as keyof Order] ?? "";
      const valB = b[sortConfig.key as keyof Order] ?? "";
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, searchTerm, filterStatus, sortConfig]);

  const stats = useMemo(() => {
    const delivered = orders.filter((order) => Number(order.status || 0) === 9).length;
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
        ordersList.push({ id: orderDoc.id, ...(orderDoc.data() as Omit<Order, "id">) });
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
      setNotice({ type: "success", text: "Welcome back. Dashboard is ready." });
    } else {
      setNotice({ type: "error", text: "Wrong password." });
    }
  }

  function handleLogout() {
    setIsAuth(false);
    localStorage.removeItem("adminAuth");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
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

  function handleRateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const rate = Number(e.target.value) || 1200;
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
          status: Number(formData.status),
          _realName: formData.fullName.trim(),
          _realPhone: formData.fullPhone.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setNotice({ type: "success", text: isEditing ? `${code} updated successfully.` : `${code} saved successfully.` });
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
      status: Number(order.status || 0),
    });
    setNotice({ type: "info", text: `${order.id} loaded. Edit the form and press Save/Update.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const typed = window.prompt(`Type ${id} to permanently delete this order:`);
    if (typed !== id) return;

    try {
      await deleteDoc(doc(db, "orders", id));
      setNotice({ type: "success", text: `${id} deleted.` });
      await fetchOrders();
    } catch (error: unknown) {
      console.error("Delete order error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Delete failed. Firestore rules may be blocking delete for safety.") });
    }
  }

  function sendWhatsApp(order: Order) {
    const lang = order.customerLang || "ku";

    const statusTexts = {
      ku: ["داواکاری کرا", "داواکاری کڕدرا", "شین ئامادەی دەکات", "نێردرا بۆ دوبەی", "گەیشتە دوبەی", "لە دوبەی چاوەڕێ دەکات", "بەرەو کوردستان بەڕێکەوت", "وەرگیرا و پاکەت دەکرێت", "لە ڕێگایە بۆ گەیاندن", "گەیەنرا"],
      ar: ["تم الطلب", "تم شراء الطلب", "تجهيز بواسطة شي إن", "شحن إلى دبي", "وصل إلى دبي", "في الانتظار بدبي", "في الطريق إلى كردستان", "تم الاستلام والتغليف", "في الطريق للتسليم", "تم التوصيل"],
    };

    const durations = {
      ku: ["لە چاوەڕوانیدایە", "12 - 24 کاتژمێر", "1 - 3 ڕۆژ", "6 - 10 ڕۆژ", "1 - 2 ڕۆژ", "1 - 2 ڕۆژ", "6 - 7 ڕۆژ", "یەک ڕۆژ", "1 - 2 ڕۆژ", "گەیەنرا"],
      ar: ["قيد الانتظار", "12 - 24 ساعة", "1 - 3 أيام", "6 - 10 أيام", "1 - 2 أيام", "1 - 2 أيام", "6 - 7 أيام", "يوم واحد", "2 - 3 أيام", "تم التوصيل"],
    };

    const customerLang = lang === "ar" ? "ar" : "ku";
    const currentStatus = Number(order.status || 0);
    const trackingLink = `${window.location.origin}`;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const currentDateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const nextStageName = currentStatus < 9 ? statusTexts[customerLang][currentStatus + 1] : customerLang === "ku" ? "گەیەنرا (Delivered)" : "تم التوصيل (Delivered)";

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
        ? `${greeting}،\n\n📅 بەرواری نامە: ${currentDateStr}\n\n📦 ژمارەی داواکاری: *${order.id}*\n🔄 قۆناغی ئێستا: *${statusTexts.ku[currentStatus]}*\n⏳ کاتی پێشبینیکراو بۆ ئەم قۆناغە: *${durations.ku[currentStatus]}*\n\n${currentStatus < 9 ? `⏭️ قۆناغی داهاتوو: *${nextStageName}*\n\n` : ""}📆 کاتی خەمڵێنراوی گەیشتن: *${estDate}*\n\n🔗 بۆ بەدواداچوونی وردی داواکارییەکەت، سەردانی ئەم بەستەرە بکە:\n${trackingLink}`
        : `${greeting}،\n\n📅 تاريخ الرسالة: ${currentDateStr}\n\n📦 رقم الطلب: *${order.id}*\n🔄 المرحلة الحالية: *${statusTexts.ar[currentStatus]}*\n⏳ الوقت المتوقع لهذه المرحلة: *${durations.ar[currentStatus]}*\n\n${currentStatus < 9 ? `⏭️ المرحلة التالية: *${nextStageName}*\n\n` : ""}📆 تاريخ الوصول المتوقع: *${estDate}*\n\n🔗 لتتبع طلبك بالتفصيل، يرجى زيارة الرابط التالي:\n${trackingLink}`;

    window.location.href = `https://api.whatsapp.com/send?phone=${cleanPhoneForWhatsApp(order._realPhone)}&text=${encodeURIComponent(message)}`;
  }

  async function handleQuickStatusChange(id: string, newStatus: string) {
    try {
      await updateDoc(doc(db, "orders", id), { status: Number(newStatus), updatedAt: new Date().toISOString() });
      setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status: Number(newStatus) } : order)));
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
      for (const id of selectedOrders) {
        await updateDoc(doc(db, "orders", id), { status: Number(bulkStatus), updatedAt: new Date().toISOString() });
      }
      setNotice({ type: "success", text: `${selectedOrders.length} orders updated to status ${bulkStatus}.` });
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

    const typed = window.prompt(`Type DELETE ${selectedOrders.length} to delete selected orders:`);
    if (typed !== `DELETE ${selectedOrders.length}`) return;

    setLoading(true);
    try {
      for (const id of selectedOrders) {
        await deleteDoc(doc(db, "orders", id));
      }
      setNotice({ type: "success", text: `${selectedOrders.length} selected orders deleted.` });
      await fetchOrders();
    } catch (error: unknown) {
      console.error("Bulk delete error:", error);
      setNotice({ type: "error", text: getErrorMessage(error, "Bulk delete failed. Firestore rules may be blocking delete for safety.") });
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
            <p>Secure staff dashboard for tracking orders.</p>
            {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Enter admin password"
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
            <div>
              <span className="eyebrow">Dalin Shopping</span>
              <h1>Admin Dashboard</h1>
              <p>Manage orders, customer updates, WhatsApp messages and tracking status.</p>
            </div>
            <div className="header-actions">
              <Link href="/" className="secondary-link">View Tracking Page</Link>
              <button type="button" className="ghost-btn" onClick={fetchOrders} disabled={loadingOrders}>Refresh</button>
              <button type="button" className="danger-soft-btn" onClick={handleLogout}>Logout</button>
            </div>
          </header>

          {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
          {fetchError && <div className="notice error">Firebase error: {fetchError}</div>}

          <section className="stats-grid">
            <div className="stat-card">
              <span>Total Orders</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card">
              <span>Active Orders</span>
              <strong>{stats.active}</strong>
            </div>
            <div className="stat-card">
              <span>Delivered</span>
              <strong>{stats.delivered}</strong>
            </div>
            <div className="stat-card">
              <span>Total USD</span>
              <strong>{formatUSD(stats.totalUSD)}</strong>
            </div>
          </section>

          <section className="panel-card form-panel">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">Order Form</span>
                <h2>{isEditing ? "Update Existing Order" : "Add New Order"}</h2>
              </div>
              {isEditing && <span className="edit-chip">Editing {normalizedCode}</span>}
            </div>

            <form onSubmit={handleSubmit} className="order-form">
              <div className="form-grid three">
                <label>
                  <span>Order Code</span>
                  <input type="text" name="orderCode" value={formData.orderCode} onChange={handleChange} required placeholder="DS215 or 215" />
                </label>
                <label>
                  <span>Title</span>
                  <select name="title" value={formData.title} onChange={handleChange}>
                    <option value="Mr">Mr.</option>
                    <option value="Miss">Miss.</option>
                  </select>
                </label>
                <label>
                  <span>Customer Language</span>
                  <select name="customerLang" value={formData.customerLang} onChange={handleChange}>
                    <option value="ku">Kurdish</option>
                    <option value="ar">Arabic</option>
                  </select>
                </label>
              </div>

              <div className="form-grid two">
                <label>
                  <span>Customer Full Name</span>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Customer name" />
                </label>
                <label>
                  <span>Phone Number</span>
                  <input type="text" name="fullPhone" value={formData.fullPhone} onChange={handleChange} required placeholder="0750 123 4567" />
                </label>
              </div>

              <div className="form-grid two">
                <label>
                  <span>Items</span>
                  <input type="number" min="1" name="items" value={formData.items} onChange={handleChange} required />
                </label>
                <label>
                  <span>Order Date</span>
                  <input type="text" name="date" value={formData.date} onChange={handleChange} required placeholder="04.07.2026" />
                </label>
              </div>

              <div className="form-grid three">
                <label>
                  <span className="label-with-select">
                    Amount USD
                    <select value={exchangeRate} onChange={handleRateChange}>
                      <option value={1200}>Rate 1200</option>
                      <option value={1190}>Rate 1190</option>
                    </select>
                  </span>
                  <input type="number" name="amountUSD" value={formData.amountUSD === 0 ? "" : formData.amountUSD} placeholder="0" onChange={handleUSDChange} required />
                </label>
                <label>
                  <span>Amount IQD</span>
                  <input type="number" name="amountIQD" value={formData.amountIQD === 0 ? "" : formData.amountIQD} placeholder="0" onChange={handleIQDChange} required />
                </label>
                <label>
                  <span>Delivery Fee</span>
                  <select name="shippingIQD" value={formData.shippingIQD} onChange={handleChange}>
                    <option value={5000}>5000 IQD</option>
                    <option value={0}>0 IQD (Free)</option>
                  </select>
                </label>
              </div>

              <label className="full-row">
                <span>Order Status</span>
                <select name="status" value={formData.status} onChange={handleChange}>
                  {STATUS_LABELS.map((label, idx) => (
                    <option key={idx} value={idx}>{label}</option>
                  ))}
                </select>
              </label>

              <div className="form-actions">
                <button type="button" className="ghost-btn" onClick={() => { setFormData(makeEmptyForm()); setNotice(null); }}>
                  Clear Form
                </button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Saving..." : isEditing ? "Save Update" : "Save Order"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel-card orders-panel">
            <div className="panel-title-row compact">
              <div>
                <span className="eyebrow">Orders</span>
                <h2>Manage Orders <small>({displayedOrders.length})</small></h2>
              </div>
              <div className="filter-row">
                <input
                  type="text"
                  placeholder="Search code, name or phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">Show All</option>
                  {STATUS_LABELS.map((label, idx) => (
                    <option key={idx} value={idx}>{label}</option>
                  ))}
                </select>
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
              <select value={bulkStatus} onChange={(e) => setBulkStatus(Number(e.target.value))}>
                {STATUS_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>Change to: {label}</option>
                ))}
              </select>
              <button type="button" className="primary-soft-btn" onClick={handleBulkUpdate} disabled={selectedOrders.length === 0 || loading}>Update Status</button>
              <button type="button" className="danger-soft-btn" onClick={handleBulkDelete} disabled={selectedOrders.length === 0 || loading}>Delete Selected</button>
            </div>

            {loadingOrders ? (
              <div className="empty-state">Loading orders...</div>
            ) : displayedOrders.length === 0 ? (
              <div className="empty-state">No orders found.</div>
            ) : (
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
                      const status = Number(order.status || 0);
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
                            <select className={`status-select ${STATUS_TONE[status] || "neutral"}`} value={status} onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}>
                              {STATUS_LABELS.map((label, idx) => (
                                <option key={idx} value={idx}>{label}</option>
                              ))}
                            </select>
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
        --admin-bg: #eef3f7;
        --admin-card: rgba(255, 255, 255, 0.92);
        --admin-text: #0f172a;
        --admin-muted: #64748b;
        --admin-border: #e2e8f0;
        --admin-primary: #059669;
        --admin-primary-dark: #047857;
        --admin-danger: #ef4444;
        --admin-shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
        --admin-radius: 24px;
      }

      .admin-login-page,
      .admin-page {
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--admin-text);
        background:
          radial-gradient(circle at top left, rgba(5, 150, 105, 0.18), transparent 34%),
          radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 32%),
          linear-gradient(135deg, #f8fafc 0%, #eef3f7 100%);
      }

      .admin-login-page {
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .login-card {
        width: min(420px, 100%);
        background: var(--admin-card);
        border: 1px solid rgba(255, 255, 255, 0.9);
        border-radius: 32px;
        padding: 36px;
        box-shadow: var(--admin-shadow);
        backdrop-filter: blur(18px);
        text-align: center;
      }

      .login-badge {
        width: 76px;
        height: 76px;
        margin: 0 auto 18px;
        border-radius: 24px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--admin-primary), #10b981);
        color: white;
        font-size: 28px;
        font-weight: 950;
        letter-spacing: -1px;
        box-shadow: 0 14px 30px rgba(5, 150, 105, 0.26);
      }

      .login-card h1,
      .admin-header h1,
      .panel-title-row h2 {
        margin: 0;
        letter-spacing: -0.04em;
      }

      .login-card p,
      .admin-header p {
        margin: 10px 0 22px;
        color: var(--admin-muted);
        line-height: 1.6;
      }

      .login-card input,
      .order-form input,
      .order-form select,
      .filter-row input,
      .filter-row select,
      .bulk-bar select {
        width: 100%;
        border: 1px solid var(--admin-border);
        background: white;
        border-radius: 14px;
        padding: 13px 14px;
        color: var(--admin-text);
        font-size: 14px;
        outline: none;
        transition: 0.2s ease;
      }

      .login-card input:focus,
      .order-form input:focus,
      .order-form select:focus,
      .filter-row input:focus,
      .filter-row select:focus,
      .bulk-bar select:focus {
        border-color: rgba(5, 150, 105, 0.55);
        box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12);
      }

      .login-card button,
      .primary-btn {
        width: 100%;
        border: none;
        border-radius: 16px;
        padding: 14px 18px;
        color: white;
        background: linear-gradient(135deg, var(--admin-primary), #10b981);
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 12px 24px rgba(5, 150, 105, 0.22);
        transition: 0.2s ease;
      }

      button:hover,
      .secondary-link:hover { transform: translateY(-1px); }
      button:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

      .admin-page { padding: 28px 18px 56px; }
      .admin-shell { max-width: 1220px; margin: 0 auto; display: grid; gap: 20px; }

      .admin-header,
      .panel-card,
      .stat-card {
        background: var(--admin-card);
        border: 1px solid rgba(255, 255, 255, 0.9);
        box-shadow: var(--admin-shadow);
        backdrop-filter: blur(18px);
      }

      .admin-header {
        border-radius: 32px;
        padding: 28px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: center;
      }

      .admin-header h1 { font-size: clamp(2rem, 4vw, 3.4rem); }
      .eyebrow { color: var(--admin-primary); text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; font-weight: 950; }

      .header-actions,
      .form-actions,
      .filter-row,
      .row-actions,
      .bulk-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .secondary-link,
      .ghost-btn,
      .danger-soft-btn,
      .primary-soft-btn,
      .wa-btn,
      .edit-btn,
      .delete-btn {
        border: none;
        border-radius: 13px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        text-decoration: none;
        transition: 0.2s ease;
        white-space: nowrap;
      }

      .secondary-link,
      .ghost-btn {
        color: var(--admin-text);
        background: #f8fafc;
        border: 1px solid var(--admin-border);
      }

      .primary-soft-btn { background: #d1fae5; color: #047857; }
      .danger-soft-btn { background: #fee2e2; color: #b91c1c; }
      .wa-btn { background: #dcfce7; color: #15803d; }
      .edit-btn { background: #dbeafe; color: #1d4ed8; }
      .delete-btn { background: #fee2e2; color: #dc2626; }

      .notice {
        border-radius: 16px;
        padding: 13px 16px;
        font-weight: 800;
        border: 1px solid transparent;
      }
      .notice.success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
      .notice.error { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
      .notice.info { background: #e0f2fe; color: #075985; border-color: #bae6fd; }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .stat-card {
        border-radius: 22px;
        padding: 20px;
      }
      .stat-card span { display: block; color: var(--admin-muted); font-weight: 800; font-size: 13px; margin-bottom: 8px; }
      .stat-card strong { display: block; font-size: 28px; letter-spacing: -0.04em; }

      .panel-card {
        border-radius: var(--admin-radius);
        padding: 24px;
      }

      .panel-title-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: start;
        margin-bottom: 20px;
      }
      .panel-title-row.compact { align-items: center; }
      .panel-title-row h2 { font-size: 1.5rem; }
      .panel-title-row small { color: var(--admin-muted); font-size: 0.9rem; }
      .edit-chip { background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 999px; font-weight: 900; font-size: 12px; }

      .order-form { display: grid; gap: 15px; }
      .form-grid { display: grid; gap: 15px; }
      .form-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .form-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .order-form label { display: grid; gap: 7px; color: var(--admin-muted); font-size: 13px; font-weight: 900; }
      .order-form label span { display: flex; justify-content: space-between; align-items: center; }
      .label-with-select select { width: auto; padding: 4px 8px; border-radius: 999px; font-size: 11px; }
      .full-row { grid-column: 1 / -1; }
      .form-actions { justify-content: flex-end; border-top: 1px solid var(--admin-border); padding-top: 15px; }
      .form-actions .primary-btn { width: auto; min-width: 170px; }

      .filter-row { justify-content: flex-end; }
      .filter-row input { width: 250px; }
      .filter-row select { width: 220px; }

      .bulk-bar {
        background: #f8fafc;
        border: 1px dashed var(--admin-border);
        border-radius: 18px;
        padding: 12px;
        margin-bottom: 16px;
        opacity: 0.72;
      }
      .bulk-bar.active { border-style: solid; opacity: 1; background: #f0fdf4; }
      .select-all-inline { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; color: var(--admin-primary); }
      .select-all-inline input,
      .orders-table input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--admin-primary); cursor: pointer; }
      .bulk-bar select { max-width: 260px; }

      .table-wrap { overflow-x: auto; border-radius: 18px; border: 1px solid var(--admin-border); }
      .orders-table { width: 100%; min-width: 930px; border-collapse: collapse; background: white; }
      .orders-table th {
        color: #64748b;
        background: #f8fafc;
        text-align: left;
        font-size: 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 14px;
        cursor: pointer;
      }
      .orders-table th:last-child { cursor: default; text-align: right; }
      .orders-table td { padding: 14px; border-top: 1px solid #eef2f7; vertical-align: middle; }
      .orders-table tr.selected-row { background: #f0fdf4; }
      .order-code { color: #047857; letter-spacing: 0.03em; }
      .customer-cell { display: grid; gap: 4px; }
      .customer-cell span,
      .sub-money { color: var(--admin-muted); font-size: 12px; display: block; margin-top: 4px; }

      .status-select {
        border: none;
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 900;
        outline: none;
        cursor: pointer;
        max-width: 190px;
      }
      .status-select.neutral { background: #f1f5f9; color: #475569; }
      .status-select.blue { background: #dbeafe; color: #1d4ed8; }
      .status-select.amber { background: #fef3c7; color: #b45309; }
      .status-select.purple { background: #f3e8ff; color: #7e22ce; }
      .status-select.cyan { background: #cffafe; color: #0e7490; }
      .status-select.slate { background: #e2e8f0; color: #334155; }
      .status-select.orange { background: #ffedd5; color: #c2410c; }
      .status-select.indigo { background: #e0e7ff; color: #4338ca; }
      .status-select.green { background: #dcfce7; color: #15803d; }
      .status-select.emerald { background: #d1fae5; color: #047857; }

      .row-actions { justify-content: flex-end; flex-wrap: nowrap; }
      .empty-state { text-align: center; color: var(--admin-muted); padding: 42px 20px; font-weight: 900; }

      @media (max-width: 900px) {
        .admin-header,
        .panel-title-row.compact { flex-direction: column; align-items: stretch; }
        .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .form-grid.two,
        .form-grid.three { grid-template-columns: 1fr; }
        .filter-row { justify-content: stretch; }
        .filter-row input,
        .filter-row select { width: 100%; }
        .header-actions > *,
        .bulk-bar > *,
        .form-actions > * { width: 100%; justify-content: center; text-align: center; }
        .form-actions .primary-btn { width: 100%; }
      }

      @media (max-width: 560px) {
        .admin-page { padding: 14px 10px 34px; }
        .admin-header,
        .panel-card { border-radius: 20px; padding: 18px; }
        .stats-grid { grid-template-columns: 1fr; }
        .stat-card strong { font-size: 24px; }
        .panel-title-row { flex-direction: column; }
      }
    `}</style>
  );
}
