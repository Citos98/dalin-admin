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
    s6: "On the way to Kurdistan", // Guncellendi
    s7: "Received & Packing",
    s8: "Out for Delivery",
    s9: "Delivered", // Stage 9 Eklendi
    time_s0: "Pending",
    time_s1: "12 - 24 Hours",
    time_s2: "1 - 3 Days",
    time_s3: "6 - 10 Days",
    time_s4: "1 - 2 Days",
    time_s5: "1 - 2 Days",
    time_s6: "6 - 7 Days",
    time_s7: "1 Day",
    time_s8_ku: "1 - 2 Days",
    time_s8_ar: "2 - 3 Days",
    time_s9: "Completed",
    needHelp: "Need help with this order?",
    waMessage: "Hello, I have a question regarding my order with code: "
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
    s6: "في الطريق إلى كردستان", // Guncellendi
    s7: "تم الاستلام والتغليف",
    s8: "في الطريق للتسليم",
    s9: "تم التوصيل", // Stage 9 Eklendi
    time_s0: "قيد الانتظار",
    time_s1: "12 - 24 ساعة",
    time_s2: "1 - 3 أيام",
    time_s3: "6 - 10 أيام",
    time_s4: "1 - 2 أيام",
    time_s5: "1 - 2 أيام",
    time_s6: "6 - 7 أيام",
    time_s7: "يوم واحد",
    time_s8_ku: "1 - 2 أيام",
    time_s8_ar: "2 - 3 أيام",
    time_s9: "مكتمل",
    needHelp: "تحتاج مساعدة بخصوص هذا الطلب؟",
    waMessage: "مرحباً، لدي استفسار حول طلبي برقم: "
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
    s6: "بەرەو کوردستان بەڕێکەوت", // Guncellendi
    s7: "وەرگیرا و پاکەت دەکرێت",
    s8: "لە ڕێگایە بۆ گەیاندن",
    s9: "گەیەنرا", // Stage 9 Eklendi
    time_s0: "لە چاوەڕوانیدایە",
    time_s1: "12 - 24 کاتژمێر",
    time_s2: "1 - 3 ڕۆژ",
    time_s3: "6 - 10 ڕۆژ",
    time_s4: "1 - 2 ڕۆژ",
    time_s5: "1 - 2 ڕۆژ",
    time_s6: "6 - 7 ڕۆژ",
    time_s7: "یەک ڕۆژ",
    time_s8_ku: "1 - 2 ڕۆژ",
    time_s8_ar: "2 - 3 ڕۆژ",
    time_s9: "تەواوکراو",
    needHelp: "پێویستت بە یارمەتییە بۆ ئەم داواکارییە؟",
    waMessage: "سڵاو، پرسیارم هەیە دەربارەی داواکارییەکەم بە کۆدی: "
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
  const statusLabels = [t.s0, t.s1, t.s2, t.s3, t.s4, t.s5, t.s6, t.s7, t.s8, t.s9];

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

  const handleWhatsAppClick = () => {
    // Sifiri atip +964 ekliyoruz
    const phoneNumber = "9647517363196"; 
    // Mevcut dildeki hazir mesaji ve siparis kodunu birlestiriyoruz
    const message = encodeURIComponent(`${t.waMessage}${orderData.id}`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
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
      if (custLang === "ku") return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s8_ku}</span>;
      return <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>⏳ {t.time_s8_ar}</span>;
    }

    // STAGE 9 EKLENDİ
    if (st === 9) {
      return <span style={{ color: "var(--primary)", fontWeight: "bold" }}>✅ {t.time_s9}</span>;
    }

    return <span style={{ color: "var(--primary)", fontWeight: "bold" }}>✅ {t.delivered}</span>;
  };

  const getProgressWidth = () => {
    if (!orderData) return "0%";
    const percentage = (orderData.status / 9) * 100; // 8 yerine 9 yazıldı
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
          <div key={lang} className={`fade-content ${orderData.status === 9 ? 'stage9-active' : ''}`} style={{ position: "relative", overflow: "hidden", minHeight: "400px" }}>
            
            {/* STAGE 9 İÇİN ÖZEL CSS VE ŞEFFAF TİK EFEKTİ */}
            <style>{`
              .stage9-active * {
                color: #059669 !important;
                border-color: rgba(5, 150, 105, 0.3) !important;
              }
              .stage9-bg-tick {
                position: absolute;
                top: 45%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 400px;
                color: rgba(5, 150, 105, 0.05) !important;
                z-index: 0;
                pointer-events: none;
                line-height: 1;
              }
            `}</style>

            {orderData.status === 9 && (
              <div className="stage9-bg-tick">✓</div>
            )}
            
            <div style={{ position: "relative", zIndex: 1 }}>
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
                      {animationsList[orderData.status - 1] ? (
                        <Lottie animationData={animationsList[orderData.status - 1]} loop={false} style={{ width: 40, height: 40 }} />
                      ) : (
                        <span style={{ fontSize: "24px" }}>✅</span>
                      )}
                    </div>
                    <span className="step-label">{statusLabels[orderData.status - 1]}</span>
                  </div>
                ) : (
                  <div className="step-box empty"></div>
                )}

                <div className="step-box curr">
                  <div className="icon-circle">
                    {orderData.status === 9 ? (
                      <span style={{ fontSize: "40px" }}>✅</span>
                    ) : (
                      <Lottie animationData={animationsList[orderData.status]} loop={true} style={{ width: 60, height: 60 }} />
                    )}
                  </div>
                  <span className="step-label" style={{ fontWeight: orderData.status === 9 ? "bold" : "normal" }}>
                    {statusLabels[orderData.status]}
                  </span>
                </div>

                {orderData.status < 9 ? (
                  <div className="step-box next">
                    <div className="icon-circle">
                      {animationsList[orderData.status + 1] ? (
                        <Lottie animationData={animationsList[orderData.status + 1]} loop={false} style={{ width: 40, height: 40 }} />
                      ) : (
                        <span style={{ fontSize: "24px", color: "gray" }}>✅</span>
                      )}
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

              {/* YENİ EKLENEN İLETİŞİM BÖLÜMÜ */}
              <div style={{ marginTop: "25px", paddingTop: "20px", borderTop: "1px solid var(--glass-border)" }}>
                <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)", marginBottom: "15px", fontWeight: "bold" }}>
                  {t.needHelp}
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "15px", flexWrap: "wrap" }}>
                  
                  {/* WhatsApp Butonu */}
                  <button 
                    onClick={() => {
                      const phoneNumber = "9647517363196"; 
                      const message = encodeURIComponent(`${t.waMessage}${orderData.id}`);
                      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
                    }} 
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #25D366, #128C7E)", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 15px rgba(37, 211, 102, 0.3)", transition: "transform 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.124.553 4.195 1.604 6.01L.063 23.94l6.046-1.584A11.96 11.96 0 0 0 12.031 24c6.648 0 12.031-5.383 12.031-12.031S18.679 0 12.031 0zm0 21.996c-1.802 0-3.567-.485-5.115-1.403l-.367-.218-3.799.996.996-3.799-.218-.367c-.918-1.548-1.403-3.313-1.403-5.115 0-5.546 4.514-10.06 10.06-10.06 5.546 0 10.06 4.514 10.06 10.06 0 5.546-4.514 10.06-10.06 10.06zm5.524-7.534c-.303-.152-1.793-.886-2.071-.987-.278-.101-.48-.152-.682.152-.202.303-.783.987-.96 1.189-.177.202-.354.227-.657.076-1.353-.687-2.457-1.442-3.411-3.056-.202-.34-.025-.525.126-.676.136-.136.303-.354.455-.53.152-.177.202-.303.303-.505.101-.202.051-.38-.025-.531-.076-.152-.682-1.641-.934-2.247-.247-.591-.499-.51-.682-.52-.177-.01-.38-.01-.581-.01-.202 0-.53.076-.808.38-.278.303-1.061 1.035-1.061 2.525 0 1.49 1.086 2.93 1.237 3.132.152.202 2.134 3.258 5.166 4.566 2.062.89 2.658.747 3.143.626.687-.17 1.793-.732 2.046-1.44.253-.708.253-1.314.177-1.44-.076-.126-.278-.202-.581-.354z"/></svg>
                    WhatsApp
                  </button>
                  
                  {/* Instagram Butonu */}
                  <button 
                    onClick={() => window.open('https://instagram.com/dalin.shoping', '_blank')} 
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", border: "none", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 15px rgba(220, 39, 67, 0.3)", transition: "transform 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                  </button>
                </div>
              </div>
              {/* İLETİŞİM BÖLÜMÜ SONU */}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}