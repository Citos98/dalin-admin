"use client";

import React, { useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from "firebase/firestore"; 
import { db } from "../../firebase"; 

export default function AdminPanel() {
  // --- ADMIN AUTH ---
  const [isAuth, setIsAuth] = useState(false);
  const [passInput, setPassInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]); 
  const [loadingOrders, setLoadingOrders] = useState(true);

  // --- TABLO: FILTRELEME, ARAMA, SIRALAMA VE TOPLU ISLEM STATELERI ---
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" }>({ key: "id", direction: "desc" });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<number>(0);

  // --- CANLI KUR HESAPLAYICI (USD -> IQD) ---
  const [exchangeRate, setExchangeRate] = useState<number>(1200); 

  // --- DINAR SÜRÜCÜSÜ KONTROLÜ (Kilitlenmeyi Önlemek İçin) ---
  const [isIqdDriving, setIsIqdDriving] = useState(false);

  // --- OTOMATIK TARIH ---
  const getTodayDate = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  // --- FORM DATA ---
  const [formData, setFormData] = useState({
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
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("adminAuth") === "yes") {
      setIsAuth(true);
    }
    fetchOrders();
  }, []);

  // --- KOD KONTROLU (UYARI ICIN) ---
  useEffect(() => {
    let code = formData.orderCode.trim().toUpperCase();
    if (/^\d+$/.test(code)) code = "DS" + code;
    const exists = orders.some(o => o.id === code);
    setIsEditing(exists);
  }, [formData.orderCode, orders]);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (passInput === "dalin1998") {
      setIsAuth(true);
      localStorage.setItem("adminAuth", "yes");
    } else {
      alert("Yanlis sifre!");
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      const ordersList: any[] = [];
      querySnapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersList);
    } catch (error) {
      console.error("Hata:", error);
    }
    setLoadingOrders(false);
    setSelectedOrders([]); 
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // DOLAR YAZINCA DINAR HESAPLAR
  const handleUSDChange = (e: any) => {
    const usd = e.target.value === "" ? 0 : Number(e.target.value);
    setIsIqdDriving(false); // Dolar tetiklendiği an Dinar sürücülüğü biter
    setFormData({ 
      ...formData, 
      amountUSD: usd, 
      amountIQD: usd * exchangeRate 
    });
  };

  // DINAR YAZINCA DOLARI HESAPLAR VEYA KORUR
  const handleIQDChange = (e: any) => {
    const iqd = e.target.value === "" ? 0 : Number(e.target.value);
    
    // Eğer Dolar henüz 0 ise ya da zaten Dinar yazarak başladıysak otomatik hesaplamaya devam et
    if (formData.amountUSD === 0 || isIqdDriving) {
      const newUsd = exchangeRate > 0 ? Number((iqd / exchangeRate).toFixed(2)) : 0;
      setFormData({ 
        ...formData, 
        amountIQD: iqd,
        amountUSD: newUsd
      });
      setIsIqdDriving(iqd > 0);
    } else {
      // Eğer kullanıcı önce Dolar girip sonra Dinarı manuel yuvarlıyorsa Doları koru
      setFormData({ 
        ...formData, 
        amountIQD: iqd
      });
    }
  };

  const handleRateChange = (e: any) => {
    const rate = Number(e.target.value) || 1200;
    setExchangeRate(rate);
    setFormData({ 
      ...formData, 
      amountIQD: formData.amountUSD * rate 
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    let code = formData.orderCode.trim().toUpperCase();
    if (/^\d+$/.test(code)) code = "DS" + code;
    if (!code.startsWith("DS")) return alert("Order code must start with DS! (e.g., DS215)");
    if (!formData.fullName || !formData.fullPhone) return alert("Please enter name and phone!");

    const nameStr = formData.fullName.trim();
    const nameFirstLetter = nameStr.charAt(0).toUpperCase();
    const nameLastLetter = nameStr.charAt(nameStr.length - 1).toUpperCase();

    let phoneStr = formData.fullPhone.replace(/\D/g, ''); 
    if (phoneStr.startsWith('964')) phoneStr = phoneStr.substring(3); 
    if (phoneStr.startsWith('0')) phoneStr = phoneStr.substring(1); 
    
    const phoneNetwork = phoneStr.substring(0, 3) || "750"; 
    const phoneFirst = phoneStr.substring(3, 4) || "*";     
    const phoneLast = phoneStr.slice(-2) || "**";            

    setLoading(true);
    try {
      await setDoc(doc(db, "orders", code), {
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
        _realName: formData.fullName,
        _realPhone: formData.fullPhone
      });
      
      alert("✅ Order Successfully Saved / Updated!");
      
      setFormData({
        orderCode: "", title: "Miss", customerLang: "ku", fullName: "", fullPhone: "", items: 1, date: getTodayDate(), amountUSD: 0, amountIQD: 0, shippingIQD: 5000, status: 0
      });
      setIsIqdDriving(false);
      fetchOrders(); 
      
    } catch (error) {
      console.error("Error:", error);
      alert("❌ An error occurred.");
    }
    setLoading(false);
  };

  const handleEdit = (order: any) => {
    setIsIqdDriving(false);
    setFormData({
      orderCode: order.id,
      title: order.title || "Miss",
      customerLang: order.customerLang || "ku",
      fullName: order._realName || "",
      fullPhone: order._realPhone || "",
      items: order.items || 1,
      date: order.date || getTodayDate(),
      amountUSD: order.amountUSD || 0,
      amountIQD: order.amountIQD || 0,
      shippingIQD: order.shippingIQD !== undefined ? order.shippingIQD : 5000,
      status: order.status || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete order ${id}?`)) {
      if (window.confirm(`⚠️ FINAL WARNING: This action cannot be undone. Delete ${id}?`)) {
        try {
          await deleteDoc(doc(db, "orders", id));
          fetchOrders(); 
        } catch (error) {
          alert("Delete failed!");
        }
      }
    }
  };

  const sendWhatsApp = (order: any) => {
    const lang = order.customerLang || "ku";
    
    const statusTexts = {
      ku: ["داواکاری کرا", "داواکاری کڕدرا", "شین ئامادەی دەکات", "نێردرا بۆ دوبەی", "گەیشتە دوبەی", "لە دوبەی چاوەڕێ دەکات", "بەرەو کوردستان بەڕێکەوت", "وەرگیرا و پاکەت دەکرێت", "لە ڕێگایە بۆ گەیاندن", "گەیەنرا"],
      ar: ["تم الطلب", "تم شراء الطلب", "تجهيز بواسطة شي إن", "شحن إلى دبي", "وصل إلى دبي", "في الانتظار بدبي", "في الطريق إلى كردستان", "تم الاستلام والتغليف", "في الطريق للتسليم", "تم التوصيل"]
    };

    const durations = {
      ku: ["لە چاوەڕوانیدایە", "12 - 24 کاتژمێر", "1 - 3 ڕۆژ", "6 - 10 ڕۆژ", "1 - 2 ڕۆژ", "1 - 2 ڕۆژ", "6 - 7 ڕۆژ", "یەک ڕۆژ", "1 - 2 ڕۆژ", "گەیەنرا"],
      ar: ["قيد الانتظار", "12 - 24 ساعة", "1 - 3 أيام", "6 - 10 أيام", "1 - 2 أيام", "1 - 2 أيام", "6 - 7 أيام", "يوم واحد", "2 - 3 أيام", "تم التوصيل"]
    };
    
    const trackingLink = `${window.location.origin}`; 
    
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const currentDateStr = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const nextStageName = order.status < 9 
      ? statusTexts[lang as "ku"|"ar"][order.status + 1] 
      : (lang === 'ku' ? 'گەیەنرا (Delivered)' : 'تم التوصيل (Delivered)');

    let estDate = "";
    if (order.date) {
      const parts = order.date.split('.');
      if(parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        d.setDate(d.getDate() + 20); 
        estDate = `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
      }
    }
    if(!estDate) estDate = (lang === 'ku' ? "15-20 ڕۆژ" : "15-20 يوماً");

    let message = "";
    let greeting = "";

    if (lang === "ku") {
      greeting = `سڵاو بەڕێز ${order.title === 'Miss' ? 'خان ' + order._realName : 'کاک ' + order._realName}`;
      message = `${greeting}،\n\n` +
                `📅 بەرواری نامە: ${currentDateStr}\n\n` +
                `📦 ژمارەی داواکاری: *${order.id}*\n` +
                `🔄 قۆناغی ئێستا: *${statusTexts.ku[order.status]}*\n` +
                `⏳ کاتی پێشبینیکراو بۆ ئەم قۆناغە: *${durations.ku[order.status]}*\n\n` +
                (order.status < 9 ? `⏭️ قۆناغی داهاتوو: *${nextStageName}*\n\n` : '') +
                `📆 کاتی خەمڵێنراوی گەیشتن: *${estDate}*\n\n` +
                `🔗 بۆ بەدواداچوونی وردی داواکارییەکەت، سەردانی ئەم بەستەرە بکە:\n${trackingLink}`;
    } else {
      greeting = `مرحباً ${order.title === 'Miss' ? 'الآنسة' : 'السيد'} ${order._realName}`;
      message = `${greeting}،\n\n` +
                `📅 تاريخ الرسالة: ${currentDateStr}\n\n` +
                `📦 رقم الطلب: *${order.id}*\n` +
                `🔄 المرحلة الحالية: *${statusTexts.ar[order.status]}*\n` +
                `⏳ الوقت المتوقع لهذه المرحلة: *${durations.ar[order.status]}*\n\n` +
                (order.status < 9 ? `⏭️ المرحلة التالية: *${nextStageName}*\n\n` : '') +
                `📆 تاريخ الوصول المتوقع: *${estDate}*\n\n` +
                `🔗 لتتبع طلبك بالتفصيل، يرجى زيارة الرابط التالي:\n${trackingLink}`;
    }

    let phone = order._realPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    if (!phone.startsWith('964')) phone = '964' + phone;

    window.location.href = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  };

  const enStatusLabels = [
    "0 - Order Placed",
    "1 - Order Purchased",
    "2 - Preparing by Shein",
    "3 - Shipped to Dubai",
    "4 - Arrived in Dubai",
    "5 - Waiting in Dubai",
    "6 - On the way to Kurdistan",
    "7 - Received & Packing",
    "8 - Out for Delivery",
    "9 - Delivered"
  ];

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { status: Number(newStatus) });
      fetchOrders(); 
    } catch (error) {
      alert("❌ Status update failed!");
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(displayedOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(orderId => orderId !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedOrders.length === 0) return alert("Select at least one order!");
    setLoading(true);
    try {
      for (const id of selectedOrders) {
        await updateDoc(doc(db, "orders", id), { status: Number(bulkStatus) });
      }
      alert(`✅ ${selectedOrders.length} orders updated to Status ${bulkStatus}`);
      fetchOrders();
    } catch (error) {
      alert("❌ Update failed.");
    }
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return alert("Select at least one order!");
    if (window.confirm(`Are you sure you want to delete ${selectedOrders.length} selected orders?`)) {
      if (window.confirm(`⚠️ FINAL WARNING: This action will completely erase ${selectedOrders.length} orders. Are you REALLY sure?`)) {
        setLoading(true);
        try {
          for (const id of selectedOrders) {
            await deleteDoc(doc(db, "orders", id));
          }
          alert("✅ Selected orders deleted.");
          fetchOrders();
        } catch (error) {
          alert("❌ Delete failed.");
        }
        setLoading(false);
      }
    }
  };

  let displayedOrders = [...orders];
  
  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    displayedOrders = displayedOrders.filter(o => 
      o.id.toLowerCase().includes(lowerSearch) || 
      (o._realName && o._realName.toLowerCase().includes(lowerSearch)) || 
      (o._realPhone && o._realPhone.includes(lowerSearch))
    );
  }

  if (filterStatus !== "all") {
    displayedOrders = displayedOrders.filter(o => o.status === Number(filterStatus));
  }
  
  displayedOrders.sort((a, b) => {
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];
    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  if (!isAuth) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textAlign: "center", width: "350px" }}>
          <h2 style={{ color: "#059669", marginBottom: "20px" }}>🔒 Admin Login</h2>
          <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} placeholder="Enter admin password" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "16px", boxSizing: "border-box" }} />
          <button type="submit" style={{ background: "#059669", color: "white", padding: "12px 20px", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", width: "100%" }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .admin-wrap { padding: 40px 20px; max-width: 1050px; margin: 0 auto; font-family: sans-serif; }
        .form-grid { display: flex; gap: 15px; flex-wrap: wrap; }
        .form-col { flex: 1 1 40%; }
        .form-col-3 { flex: 1 1 30%; }
        .action-bar { display: flex; justify-content: space-between; align-items: center; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 15px; margin-bottom: 20px; }
        .table-responsive { overflow-x: auto; }
        input[type="checkbox"] { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
        
        @media (max-width: 768px) {
          .admin-wrap { padding: 20px 10px; }
          .form-col, .form-col-3 { flex: 1 1 100%; }
          .action-bar { flex-direction: column; align-items: stretch; }
          .action-bar > div { display: flex; flex-direction: column; gap: 10px; width: 100%; }
          .bulk-btn { width: 100%; }
        }
      `}</style>

      <div className="admin-wrap">
        <h1 style={{ color: "#059669", textAlign: "center", marginBottom: "30px", fontSize: "2rem", fontWeight: "900" }}>⚙️ DALIN ADMIN DASHBOARD</h1>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", background: "#f3f5f8", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          
          <div className="form-grid">
            <div className="form-col" style={{ flex: "1 1 30%", position: "relative" }}>
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:کۆدی داواکاری</label>
              {isEditing && (
                <div style={{ position: "absolute", top: "-5px", right: "0", background: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "bold" }}>
                  ⚠️ کودەکە هەیە ئێستا گۆرانکاری دەکەی
                </div>
              )}
              <input type="text" name="orderCode" value={formData.orderCode} onChange={handleChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "16px", fontWeight: "bold", boxSizing: "border-box" }} />
            </div>
            <div className="form-col" style={{ flex: "1 1 15%" }}>
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:نازناو</label>
              <select name="title" value={formData.title} onChange={handleChange} style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "bold", boxSizing: "border-box" }}>
                <option value="Mr">Mr.</option>
                <option value="Miss">Miss.</option>
              </select>
            </div>
            <div className="form-col" style={{ flex: "1 1 20%" }}>
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:زمانی کڕیار</label>
              <select name="customerLang" value={formData.customerLang} onChange={handleChange} style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "bold", boxSizing: "border-box" }}>
                <option value="ku">Kurdish</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-col">
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:ناوی تەواوی کڕیار</label>
              <input type="text" placeholder="e.g., Dahat" name="fullName" value={formData.fullName} onChange={handleChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div className="form-col">
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:ژمارەی مۆبایل</label>
              <input type="text" placeholder="e.g., 0750 123 4567" name="fullPhone" value={formData.fullPhone} onChange={handleChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-col">
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:ژمارەی کاڵاکان</label>
              <input type="number" name="items" value={formData.items} onChange={handleChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div className="form-col">
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:بەرواری داواکاری</label>
              <input type="text" placeholder="03.06.2026" name="date" value={formData.date} onChange={handleChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-col-3">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:بڕی گشتی (دۆلار)</label>
                <span style={{ fontSize: "11px", color: "#059669", fontWeight: "bold" }}>
                  Rate: 
                  <select value={exchangeRate} onChange={handleRateChange} style={{ width: "55px", background: "transparent", border: "none", borderBottom: "1px solid #059669", color: "#059669", fontWeight: "bold", marginLeft: "2px", outline: "none", textAlign: "center", cursor: "pointer" }}>
                    <option value={1200}>1200</option>
                    <option value={1190}>1190</option>
                  </select>
                </span>
              </div>
              <input type="number" name="amountUSD" value={formData.amountUSD === 0 ? "" : formData.amountUSD} placeholder="0" onChange={handleUSDChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div className="form-col-3">
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:دینار</label>
              <input type="number" name="amountIQD" value={formData.amountIQD === 0 ? "" : formData.amountIQD} placeholder="0" onChange={handleIQDChange} required style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", background: "#f8fafc", boxSizing: "border-box" }} />
            </div>
            <div className="form-col-3">
              <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:کرێی گەیاندن</label>
              <select name="shippingIQD" value={formData.shippingIQD} onChange={handleChange} style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "bold", cursor: "pointer", appearance: "menulist", boxSizing: "border-box" }}>
                <option value={5000}>5000 IQD</option>
                <option value={0}>0 IQD (Free)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>:دۆخی داواکاری</label>
            <select name="status" value={formData.status} onChange={handleChange} style={{ width: "100%", padding: "12px", marginTop: "5px", borderRadius: "10px", border: "1px solid #059669", outline: "none", fontWeight: "bold", color: "#059669", cursor: "pointer", appearance: "menulist", boxSizing: "border-box" }}>
              {enStatusLabels.map((label, idx) => (
                <option key={idx} value={idx}>{label}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} style={{ background: "#059669", color: "white", padding: "16px", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "15px", transition: "0.3s", boxShadow: "0 4px 15px rgba(5,150,105,0.3)" }}>
            {loading ? "چاوەڕێ بکە..." : "SAVE/UPDATE"}
          </button>
        </form>

        <div style={{ marginTop: "50px", background: "white", padding: "30px 20px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ color: "#334155", margin: 0, fontSize: "1.5rem" }}>📦 Manage Orders ({displayedOrders.length})</h2>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <input 
                type="text" 
                placeholder="🔍 Search Name, Phone or DS..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ padding: "8px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", width: "220px", fontSize: "14px" }} 
              />
              
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "8px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
                <option value="all">Filter: Show All</option>
                {enStatusLabels.map((label, idx) => (
                  <option key={idx} value={idx}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="action-bar" style={{ opacity: selectedOrders.length > 0 ? 1 : 0.5, pointerEvents: selectedOrders.length > 0 ? "auto" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: "bold", color: "#059669" }}>{selectedOrders.length} selected</span>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(Number(e.target.value))} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                {enStatusLabels.map((label, idx) => (
                  <option key={idx} value={idx}>Change to: {label.split(' - ')[0]}</option>
                ))}
              </select>
              <button onClick={handleBulkUpdate} className="bulk-btn" style={{ background: "#059669", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Update Status</button>
            </div>
            <div>
              <button onClick={handleBulkDelete} className="bulk-btn" style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Delete Selected</button>
            </div>
          </div>

          {loadingOrders ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>Loading orders...</p>
          ) : displayedOrders.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>No orders found.</p>
          ) : (
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#64748b", textAlign: "left", fontSize: "13px", textTransform: "uppercase" }}>
                    <th style={{ padding: "15px", borderRadius: "10px 0 0 10px", width: "40px" }}>
                      <input type="checkbox" checked={selectedOrders.length === displayedOrders.length && displayedOrders.length > 0} onChange={handleSelectAll} />
                    </th>
                    <th style={{ padding: "15px", cursor: "pointer" }} onClick={() => handleSort("id")}>
                      Code {sortConfig.key === "id" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th style={{ padding: "15px", cursor: "pointer" }} onClick={() => handleSort("_realName")}>
                      Customer {sortConfig.key === "_realName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th style={{ padding: "15px", cursor: "pointer" }} onClick={() => handleSort("status")}>
                      Status {sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th style={{ padding: "15px", cursor: "pointer" }} onClick={() => handleSort("amountUSD")}>
                      Price {sortConfig.key === "amountUSD" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th style={{ padding: "15px", cursor: "pointer" }} onClick={() => handleSort("date")}>
                      Date {sortConfig.key === "date" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th style={{ padding: "15px", textAlign: "right", borderRadius: "0 10px 10px 0" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: "1px solid #f1f5f9", background: selectedOrders.includes(order.id) ? "#f0fdf4" : "transparent" }}>
                      <td style={{ padding: "15px" }}>
                        <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectOne(order.id)} />
                      </td>
                      <td style={{ padding: "15px", fontWeight: "bold", color: "#0f172a" }}>{order.id}</td>
                      <td style={{ padding: "15px" }}>
                        <div style={{ fontWeight: "bold", color: "#334155" }}><span style={{color: "#94a3b8", fontSize: "11px"}}>{order.title}.</span> {order._realName}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{order._realPhone}</div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <select 
                          value={order.status} 
                          onChange={(e) => handleQuickStatusChange(order.id, e.target.value)} 
                          style={{ background: "rgba(16,185,129,0.1)", color: "#059669", padding: "5px 10px", borderRadius: "15px", fontSize: "12px", fontWeight: "bold", border: "none", outline: "none", cursor: "pointer" }}
                        >
                          {enStatusLabels.map((label, idx) => (
                            <option key={idx} value={idx}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "15px", fontWeight: "bold", color: "#0f172a" }}>${order.amountUSD}</td>
                      <td style={{ padding: "15px", color: "#64748b", fontSize: "13px" }}>{order.date}</td>
                      <td style={{ padding: "15px", textAlign: "right", display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                        
                        <button onClick={() => sendWhatsApp(order)} style={{ background: "#25D366", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }} title="Send WhatsApp">
                          <span style={{ fontSize: "14px" }}>💬</span> WA
                        </button>
                        
                        <button onClick={() => handleEdit(order)} style={{ background: "#eff6ff", color: "#3b82f6", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Edit</button>
                        <button onClick={() => handleDelete(order.id)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}