"use client";

import React, { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 

import "./style.css";

import anim0 from "../animations/placed.json";
import anim1 from "../animations/purchased.json";
import anim2 from "../animations/preparing.json";
import anim3 from "../animations/flight.json";
import anim4 from "../animations/arrived.json";
import anim5 from "../animations/waiting.json";
import anim6 from "../animations/truck.json";
import anim7 from "../animations/packing.json";
import anim8 from "../animations/delivery.json";

const animationsList = [anim0, anim1, anim2, anim3, anim4, anim5, anim6, anim7, anim8];

const languageOptions = [
  { code: "en", label: "English" },
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" }
];

const translations = {
  en: {
    brand: "DALIN SHOPPING",
    subtitle: "ORDER TRACKING",
    placeholder: "Enter order number (e.g., 215)",
    trackBtn: "TRACK ORDER",
    customerInfo: "Customer Name",
    phone: "Contact",
    items: "Total Items",
    date: "Order Date",
    equals: "Equals",
    deliveryFee: "Delivery Fee",
    totalAmount: "Total Amount",
    currencyIQD: "IQD",
    notFound: "Order not found! Please verify your number.",
    printBtn: "Download PDF Receipt",
    titleMr: "Mr.",
    titleMiss: "Miss.",
    estimatedDelivery: "Expected in this Stage",
    delivered: "Delivered",
    s0: "Order Placed",
    s1: "Order Purchased",
    s2: "Preparing by Shein",
    s3: "Shipped to Dubai",
    s4: "Arrived in Dubai",
    s5: "Waiting in Dubai",
    s6: "Departed for Iraq",
    s7: "Received & Packing",
    s8: "Out for Delivery",
    // Guncellenmis Sureler
    time_s0: "Pending",
    time_s1: "12 - 24 Hours",
    time_s2: "1 - 3 Days",
    time_s3: "6 - 10 Days",
    time_s4: "1 - 2 Days",
    time_s5: "1 - 2 Days",
    time_s6: "6 - 7 Days",
    time_s7: "1 Day",
    time_s8_ku: "1 - 2 Days",
    time_s8_ar: "2 - 3 Days"
  },
  ar: {
    brand: "دالين للتسوق",
    subtitle: "تتبع الطلب",
    placeholder: "أدخل رقم الطلب (مثل 215)",
    trackBtn: "تتبع الطلب",
    customerInfo: "اسم العميل",
    phone: "جهة الاتصال",
    items: "إجمالي العناصر",
    date: "تاريخ الطلب",
    equals: "يساوي",
    deliveryFee: "رسوم التوصيل",
    totalAmount: "المبلغ الإجمالي",
    currencyIQD: "دينار",
    notFound: "الطلب غير موجود! يرجى التحقق من الرقم.",
    printBtn: "تحميل وصل PDF", 
    titleMr: "السيد",
    titleMiss: "الآنسة",
    estimatedDelivery: "الوقت المتوقع لهذه المرحلة",
    delivered: "تم التوصيل",
    s0: "تم الطلب",
    s1: "تم شراء الطلب",
    s2: "تجهيز بواسطة شي إن",
    s3: "شحن إلى دبي",
    s4: "وصل إلى دبي",
    s5: "في الانتظار بدبي",
    s6: "غادر إلى العراق",
    s7: "تم الاستلام والتغليف",
    s8: "في الطريق للتسليم",
    // Guncellenmis Sureler
    time_s0: "قيد الانتظار",
    time_s1: "12 - 24 ساعة",
    time_s2: "1 - 3 أيام",
    time_s3: "6 - 10 أيام",
    time_s4: "1 - 2 أيام",
    time_s5: "1 - 2 أيام",
    time_s6: "6 - 7 أيام",
    time_s7: "يوم واحد",
    time_s8_ku: "1 - 2 أيام",
    time_s8_ar: "2 - 3 أيام"
  },
  ku: {
    brand: "دالین شۆپینگ",
    subtitle: "بەدواداچوونی داواکاری",
    placeholder: "ژمارەی داواکاری بنووسە (وەک 215)",
    trackBtn: "گەڕان",
    customerInfo: "ناوی کڕیار",
    phone: "پەیوەندی",
    items: "کۆی کاڵاکان",
    date: "بەرواری داواکاری",
    equals: "بەرامبەرە بە",
    deliveryFee: "نرخی گەیاندن",
    totalAmount: "کۆی گشتی",
    currencyIQD: "دینار",
    notFound: "داواکاری نەدۆزرایەوە! تکایە ژمارەکە بپشکنە.",
    printBtn: "داگرتنی وەسڵی PDF",
    titleMr: "کاک", 
    titleMiss: "خان",
    estimatedDelivery: "کاتی پێشبینیکراو بۆ ئەم قۆناغە",
    delivered: "گەیەنرا",
    s0: "داواکاری کرا",
    s1: "داواکاری کڕدرا",
    s2: "شین ئامادەی دەکات",
    s3: "نێردرا بۆ دوبەی",
    s4: "گەیشتە دوبەی",
    s5: "لە دوبەی چاوەڕێ دەکات",
    s6: "بەرەو عێراق بەڕێکەوت",
    s7: "وەرگیرا و پاکەت دەکرێت",
    s8: "لە ڕێگایە بۆ گەیاندن",
    // Guncellenmis Sureler
    time_s0: "لە چاوەڕوانیدایە",
    time_s1: "12 - 24 کاتژمێر",
    time_s2: "1 - 3 ڕۆژ",
    time_s3: "6 - 10 ڕۆژ",
    time_s4: "1 - 2 ڕۆژ",
    time_s5: "1 - 2 ڕۆژ",
    time_s6: "6 - 7 ڕۆژ",
    time_s7: "یەک ڕۆژ",
    time_s8_ku: "1 - 2 ڕۆژ",
    time_s8_ar: "2 - 3 ڕۆژ"
  },
};

export default function OrderTracking() {
  const [orderCode, setOrderCode] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [theme, setTheme] = useState("dark"); 
  const [lang, setLang] = useState<"en" | "ar" | "ku">("en");
  
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("Dalin Admin");

  const t = translations[lang];
  const statusLabels = [t.s0, t.s1, t.s2, t.s3, t.s4, t.s5, t.s6, t.s7, t.s8];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (localStorage.getItem("dalinIsAdmin") === "true") {
      setIsAdmin(true);
    }
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTrack = async () => {
    if (!orderCode) return alert(t.notFound);
    
    const finalCode = "DS" + orderCode;
    
    try {
      const docRef = doc(db, "orders", finalCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setOrderData({ id: docSnap.id, ...docSnap.data() }); 
      } else {
        alert(t.notFound);
      }
    } catch (error) {
      console.error("Arama Hatasi:", error);
      alert("Bir bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleAdminLogin = () => {
    const password = prompt("Please enter Admin Password:");
    if (password === "dalin1998") { 
      setIsAdmin(true);
      localStorage.setItem("dalinIsAdmin", "true");
    } else if (password) {
      alert("Incorrect password!");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("dalinIsAdmin");
  };

  const renderCustomerName = () => {
    if (!orderData) return "";
    
    const displayName = (isAdmin && orderData._realName) 
      ? orderData._realName 
      : `${orderData.nameFirstLetter}*** ${orderData.nameLastLetter}`;

    const isMiss = orderData.title === "Miss";
    
    if (lang === "ku") {
      if (isMiss) return <>{displayName} <strong style={{ opacity: 1, color: "var(--primary)" }}>{t.titleMiss}</strong></>;
      return <><strong style={{ opacity: 1, color: "var(--primary)" }}>{t.titleMr}</strong> {displayName}</>;
    } else {
      const translatedTitle = isMiss ? t.titleMiss : t.titleMr;
      return <><strong style={{ opacity: 1, color: "var(--primary)" }}>{translatedTitle}</strong> {displayName}</>;
    }
  };

  const renderPhoneNumber = () => {
    if (!orderData) return "";
    
    if (isAdmin && orderData._realPhone) {
      return <span style={{ color: "var(--primary)" }}>{orderData._realPhone}</span>;
    }
    
    return `+964 ${orderData.phoneNetwork} ${orderData.phoneFirst}** **${orderData.phoneLast}`;
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const getDeliveryTime = () => {
    if (!orderData) return "";
    const st = orderData.status;
    const custLang = orderData.customerLang || "ku";

    if (st === 0) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s0}</span>;
    if (st === 1) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s1}</span>;
    if (st === 2) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s2}</span>;
    if (st === 3) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s3}</span>;
    if (st === 4) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s4}</span>;
    if (st === 5) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s5}</span>;
    if (st === 6) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s6}</span>;
    if (st === 7) return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s7}</span>;
    
    if (st === 8) {
      if (custLang === "ku") return <span style={{ color: "var(--primary)", fontWeight: "bold" }}>⏳ {t.time_s8_ku}</span>;
      return <span style={{ color: "var(--primary)", fontWeight: "bold" }}>⏳ {t.time_s8_ar}</span>;
    }

    return <span style={{ color: "var(--primary)", fontWeight: "bold" }}>✅ {t.delivered}</span>;
  };

  const getProgressWidth = () => {
    if (!orderData) return "0%";
    const percentage = (orderData.status / 8) * 100;
    return `${percentage}%`;
  };

  return (
    <div className="main-wrapper" dir={lang === "ar" || lang === "ku" ? "rtl" : "ltr"}>
      
      <div className="top-controls">
        
        {!isAdmin ? (
          <button onClick={handleAdminLogin} className="control-btn" style={{ width: "auto", padding: "0 15px", gap: "5px", fontSize: "12px", fontWeight: "bold" }}>
            <span style={{ fontSize: "14px" }}>🔒</span> Admin
          </button>
        ) : (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(16, 185, 129, 0.1)", padding: "0 10px", borderRadius: "20px", border: "1px solid var(--primary)" }}>
            <span style={{ fontSize: "12px", fontWeight: "900", color: "var(--primary)", whiteSpace: "nowrap" }}>👤 {adminName}</span>
            <div style={{ width: "1px", height: "15px", background: "var(--primary)", opacity: 0.3 }}></div>
            
            <a href="/admin" className="control-btn" style={{ width: "auto", padding: "0 10px", gap: "5px", fontSize: "12px", fontWeight: "bold", textDecoration: "none", background: "transparent", border: "none", boxShadow: "none" }} title="Go to Dashboard">
              ⚙️
            </a>
            
            <button onClick={handleAdminLogout} className="control-btn" style={{ width: "auto", padding: "0 10px", gap: "5px", fontSize: "12px", fontWeight: "bold", background: "transparent", border: "none", boxShadow: "none" }} title="Logout">
              🔓
            </button>
          </div>
        )}

        <div className="control-divider"></div>

        <div ref={dropdownRef} className={`custom-dropdown ${isLangOpen ? 'open' : ''}`}>
          <div className="dropdown-header" onClick={() => setIsLangOpen(!isLangOpen)}>
            {languageOptions.find(l => l.code === lang)?.label}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          
          {isLangOpen && (
            <div className="dropdown-list fade-content">
              {languageOptions.map((opt) => (
                <div 
                  key={opt.code} 
                  className={`dropdown-item ${lang === opt.code ? 'active' : ''}`}
                  onClick={() => {
                    setLang(opt.code as any);
                    setIsLangOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="control-divider"></div>
        <button onClick={toggleTheme} className="control-btn">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="header-section">
        <h1 className="brand-title">{t.brand}</h1>
        <p className="brand-subtitle">{t.subtitle}</p>
      </div>

      <div className="glass-card">
        
        <div className="search-container">
          <div className="search-input-wrapper" dir="ltr">
            <span className="search-prefix">DS</span>
            <input 
              type="text" 
              placeholder={t.placeholder}
              value={orderCode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setOrderCode(val);
              }}
              className="search-inner-input"
            />
          </div>
          <button onClick={handleTrack} className="search-btn">
            {t.trackBtn}
          </button>
        </div>

        {orderData && (
          <div key={lang} className="fade-content">
            
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ display: "inline-block", background: "var(--widget-bg)", padding: "10px 25px", borderRadius: "15px", border: "1px solid var(--glass-border)", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: "14px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", fontWeight: "bold", marginRight: "10px" }}>Order Code:</span>
                <span style={{ fontSize: "1.2rem", fontWeight: "900", color: "var(--primary)", letterSpacing: "3px" }} dir="ltr">
                  {orderData.id}
                </span>
              </div>
            </div>

            <div style={{ maxWidth: "500px", margin: "0 auto 40px auto", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase" }}>{t.estimatedDelivery}</span>
                {getDeliveryTime()}
              </div>
              <div style={{ height: "8px", background: "var(--glass-border)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--primary)", width: getProgressWidth(), transition: "width 1s ease-in-out", boxShadow: "0 0 10px rgba(16,185,129,0.5)" }}></div>
              </div>
            </div>

            <div className="timeline-window">
              <div className="timeline-line-bg"></div>
              
              {orderData.status > 0 ? (
                <div className="step-box prev">
                  <div className="icon-circle">
                    <div className="checkmark">✓</div>
                    <Lottie animationData={animationsList[orderData.status - 1]} loop={false} style={{ width: 40, height: 40 }} />
                  </div>
                  <span className="step-label">{statusLabels[orderData.status - 1]}</span>
                </div>
              ) : (
                <div className="step-box empty"></div>
              )}

              <div className="step-box curr">
                <div className="icon-circle">
                  <Lottie animationData={animationsList[orderData.status]} loop={true} style={{ width: 60, height: 60 }} />
                </div>
                <span className="step-label">{statusLabels[orderData.status]}</span>
              </div>

              {orderData.status < 8 ? (
                <div className="step-box next">
                  <div className="icon-circle">
                    <Lottie animationData={animationsList[orderData.status + 1]} loop={false} style={{ width: 40, height: 40 }} />
                  </div>
                  <span className="step-label">{statusLabels[orderData.status + 1]}</span>
                </div>
              ) : (
                <div className="step-box empty"></div>
              )}
            </div>

            <div className="info-grid">
              
              <div className="widget">
                <div className="info-row">
                  <div>
                    <div className="info-label">{t.customerInfo}</div>
                    <div className="info-value" style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                      {renderCustomerName()}
                    </div>
                  </div>
                  <div style={{ textAlign: lang === 'en' ? 'right' : 'left' }}>
                    <div className="info-label">{t.phone}</div>
                    <div className="info-value" dir="ltr">
                      {renderPhoneNumber()}
                    </div>
                  </div>
                </div>
                
                <hr style={{ borderTop: '1px solid var(--glass-border)', margin: '15px 0' }} />
                
                <div className="info-row">
                  <div>
                    <div className="info-label">{t.date}</div>
                    <div className="info-value">{orderData.date}</div>
                  </div>
                  <div style={{ textAlign: lang === 'en' ? 'right' : 'left' }}>
                    <div className="info-label">{t.items}</div>
                    <div className="info-value">{orderData.items}</div>
                  </div>
                </div>
              </div>

              <div className="widget price-widget">
                <div className="price-usd">${orderData.amountUSD}</div>
                
                <div className="price-calc-row">
                  <span>{t.equals}</span>
                  <span>{orderData.amountIQD.toLocaleString()} {t.currencyIQD}</span>
                </div>
                
                <div className="price-calc-row price-delivery">
                  <span>{t.deliveryFee}</span>
                  <span>+{orderData.shippingIQD.toLocaleString()} {t.currencyIQD}</span>
                </div>
                
                <hr className="price-divider" />
                
                <div className="price-total">
                  <span>{t.totalAmount}</span>
                  <span>{(orderData.amountIQD + orderData.shippingIQD).toLocaleString()} {t.currencyIQD}</span>
                </div>
              </div>

            </div>

            <button onClick={handleDownloadPDF} className="print-receipt-btn">
              <span>📄</span> {t.printBtn}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}