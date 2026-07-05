"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../firebase";
import "./style.css";


type Lang = "en" | "ku" | "ar";
type Theme = "dark" | "light";

type TrackingOrder = {
  id: string;
  title?: string;
  customerLang?: Lang | string;
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

type StatusValue = 0 | 2 | 3 | 4 | 6 | 7 | 8 | 9;

type Translation = {
  brand: string;
  subtitle: string;
  admin: string;
  adminName: string;
  dashboard: string;
  logout: string;
  themeLight: string;
  themeDark: string;
  heroKicker: string;
  heroHeadline: string;
  heroDescription: string;
  routeShein: string;
  routeDubai: string;
  routeKurdistan: string;
  metricStages: string;
  metricCode: string;
  metricSupport: string;
  terminalTitle: string;
  liveLookup: string;
  placeholder: string;
  trackBtn: string;
  searching: string;
  idleTitle: string;
  idleText: string;
  privacyNote: string;
  notFound: string;
  connectionError: string;
  orderCode: string;
  currentStage: string;
  completed: string;
  progress: string;
  expected: string;
  journey: string;
  customerInfo: string;
  phone: string;
  items: string;
  date: string;
  equals: string;
  deliveryFee: string;
  totalAmount: string;
  currencyIQD: string;
  printBtn: string;
  titleMr: string;
  titleMiss: string;
  needHelp: string;
  whatsapp: string;
  instagram: string;
  waMessage: string;
  adminPasswordPrompt: string;
  adminWrongPassword: string;
  s0: string;
  s2: string;
  s3: string;
  s4: string;
  s6: string;
  s7: string;
  s8: string;
  s9: string;
  time0: string;
  time2: string;
  time3: string;
  time4: string;
  time6: string;
  time7: string;
  time8Ku: string;
  time8Ar: string;
  time9: string;
};

const languageOptions: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
];

const translations: Record<Lang, Translation> = {
  en: {
    brand: "DALIN SHOPPING",
    subtitle: "ORDER TRACKING",
    admin: "Admin",
    adminName: "Dalin Admin",
    dashboard: "Dashboard",
    logout: "Logout",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    heroKicker: "UAE → Kurdistan · Private shopping route",
    heroHeadline: "Track your order like a flight mission.",
    heroDescription:
      "From Shein purchase to Dubai handling and final delivery in Kurdistan, every stage is shown in one clean, private and beautiful tracking room.",
    routeShein: "Shein",
    routeDubai: "Dubai",
    routeKurdistan: "Kurdistan",
    metricStages: "active stages",
    metricCode: "smart code",
    metricSupport: "support ready",
    terminalTitle: "Tracking Terminal",
    liveLookup: "Live lookup",
    placeholder: "Enter order number",
    trackBtn: "Track Order",
    searching: "Checking...",
    idleTitle: "Enter your order code",
    idleText: "You can write 215 or DS215. Both will open the same tracking record.",
    privacyNote: "Customer details are partially hidden for privacy.",
    notFound: "Order not found. Please check your number and try again.",
    connectionError: "Connection error. Please try again.",
    orderCode: "Order Code",
    currentStage: "Current Stage",
    completed: "Completed",
    progress: "Progress",
    expected: "Expected in this stage",
    journey: "Journey Map",
    customerInfo: "Customer Name",
    phone: "Contact",
    items: "Total Items",
    date: "Order Date",
    equals: "Equals",
    deliveryFee: "Delivery Fee",
    totalAmount: "Total Amount",
    currencyIQD: "IQD",
    printBtn: "Download PDF Receipt",
    titleMr: "Mr.",
    titleMiss: "Miss.",
    needHelp: "Need help with this order?",
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    waMessage: "Hello, I have a question regarding my order with code: ",
    adminPasswordPrompt: "Please enter Admin Password:",
    adminWrongPassword: "Incorrect password!",
    s0: "Order Placed",
    s2: "Preparing by Shein",
    s3: "Shipped to Dubai",
    s4: "Arrived in Dubai",
    s6: "On the way to Kurdistan",
    s7: "Received & Packing",
    s8: "Out for Delivery",
    s9: "Delivered",
    time0: "Pending",
    time2: "1 - 3 Days",
    time3: "6 - 10 Days",
    time4: "1 - 2 Days",
    time6: "6 - 7 Days",
    time7: "1 Day",
    time8Ku: "1 - 2 Days",
    time8Ar: "2 - 3 Days",
    time9: "Completed",
  },
  ku: {
    brand: "دالین شۆپینگ",
    subtitle: "بەدواداچوونی داواکاری",
    admin: "ئەدمین",
    adminName: "ئەدمینی دالین",
    dashboard: "داشبۆرد",
    logout: "چوونەدەرەوە",
    themeLight: "ڕووناک",
    themeDark: "تاریک",
    heroKicker: "ئیمارات → کوردستان · ڕێگای تایبەتی شۆپینگ",
    heroHeadline: "داواکارییەکەت وەک گەشتێکی فڕۆکە ببینە.",
    heroDescription:
      "لە کڕین لە شینەوە بۆ مامەڵەی دوبەی و گەیاندنی کۆتایی لە کوردستان، هەموو قۆناغەکان لە شوێنێکی جوان و تایبەتدا دەردەکەون.",
    routeShein: "شین",
    routeDubai: "دوبەی",
    routeKurdistan: "کوردستان",
    metricStages: "قۆناغی چالاک",
    metricCode: "کۆدی زیرەک",
    metricSupport: "یارمەتی ئامادەیە",
    terminalTitle: "تێرمیناڵی بەدواداچوون",
    liveLookup: "گەڕانی ڕاستەوخۆ",
    placeholder: "ژمارەی داواکاری بنووسە",
    trackBtn: "گەڕان",
    searching: "دەگەڕێت...",
    idleTitle: "کۆدی داواکارییەکەت بنووسە",
    idleText: "دەتوانیت 215 یان DS215 بنووسیت. هەردوو هەمان داواکاری دەکاتەوە.",
    privacyNote: "زانیاری کڕیار بۆ پاراستنی تایبەتمەندی بەشێک شاراوەیە.",
    notFound: "داواکاری نەدۆزرایەوە. تکایە ژمارەکە بپشکنە و دووبارە هەوڵبدە.",
    connectionError: "کێشەی پەیوەندی. تکایە دووبارە هەوڵبدە.",
    orderCode: "کۆدی داواکاری",
    currentStage: "قۆناغی ئێستا",
    completed: "تەواوبوو",
    progress: "پێشکەوتن",
    expected: "کاتی پێشبینیکراو بۆ ئەم قۆناغە",
    journey: "نەخشەی گەشت",
    customerInfo: "ناوی کڕیار",
    phone: "پەیوەندی",
    items: "کۆی کاڵاکان",
    date: "بەرواری داواکاری",
    equals: "بەرامبەرە بە",
    deliveryFee: "نرخی گەیاندن",
    totalAmount: "کۆی گشتی",
    currencyIQD: "دینار",
    printBtn: "داگرتنی وەسڵی PDF",
    titleMr: "کاک",
    titleMiss: "خان",
    needHelp: "پێویستت بە یارمەتییە بۆ ئەم داواکارییە؟",
    whatsapp: "واتساپ",
    instagram: "ئینستاگرام",
    waMessage: "سڵاو، پرسیارم هەیە دەربارەی داواکارییەکەم بە کۆدی: ",
    adminPasswordPrompt: "وشەی نهێنی ئەدمین بنووسە:",
    adminWrongPassword: "وشەی نهێنی هەڵەیە!",
    s0: "داواکاری کرا",
    s2: "شین ئامادەی دەکات",
    s3: "نێردرا بۆ دوبەی",
    s4: "گەیشتە دوبەی",
    s6: "بەرەو کوردستان بەڕێکەوت",
    s7: "وەرگیرا و پاکەت دەکرێت",
    s8: "لە ڕێگایە بۆ گەیاندن",
    s9: "گەیەنرا",
    time0: "لە چاوەڕوانیدایە",
    time2: "1 - 3 ڕۆژ",
    time3: "6 - 10 ڕۆژ",
    time4: "1 - 2 ڕۆژ",
    time6: "6 - 7 ڕۆژ",
    time7: "یەک ڕۆژ",
    time8Ku: "1 - 2 ڕۆژ",
    time8Ar: "2 - 3 ڕۆژ",
    time9: "تەواوکراو",
  },
  ar: {
    brand: "دالين شوبينغ",
    subtitle: "تتبع الطلب",
    admin: "الإدارة",
    adminName: "إدارة دالين",
    dashboard: "لوحة التحكم",
    logout: "تسجيل الخروج",
    themeLight: "الوضع الفاتح",
    themeDark: "الوضع الداكن",
    heroKicker: "الإمارات → كردستان · مسار تسوق خاص",
    heroHeadline: "تتبع طلبك كرحلة جوية منظمة.",
    heroDescription:
      "من الشراء من شي إن إلى تجهيز دبي ثم التسليم النهائي في كردستان، تظهر كل مرحلة في غرفة تتبع خاصة وواضحة وجميلة.",
    routeShein: "شي إن",
    routeDubai: "دبي",
    routeKurdistan: "كردستان",
    metricStages: "مراحل نشطة",
    metricCode: "كود ذكي",
    metricSupport: "الدعم جاهز",
    terminalTitle: "محطة التتبع",
    liveLookup: "بحث مباشر",
    placeholder: "أدخل رقم الطلب",
    trackBtn: "تتبع الطلب",
    searching: "جاري الفحص...",
    idleTitle: "أدخل كود طلبك",
    idleText: "يمكنك كتابة 215 أو DS215. كلاهما يفتح نفس سجل التتبع.",
    privacyNote: "يتم إخفاء بعض بيانات العميل للحفاظ على الخصوصية.",
    notFound: "لم يتم العثور على الطلب. يرجى التأكد من الرقم والمحاولة مرة أخرى.",
    connectionError: "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
    orderCode: "كود الطلب",
    currentStage: "المرحلة الحالية",
    completed: "مكتمل",
    progress: "التقدم",
    expected: "الوقت المتوقع لهذه المرحلة",
    journey: "خريطة الرحلة",
    customerInfo: "اسم العميل",
    phone: "جهة الاتصال",
    items: "إجمالي العناصر",
    date: "تاريخ الطلب",
    equals: "يساوي",
    deliveryFee: "رسوم التوصيل",
    totalAmount: "المبلغ الإجمالي",
    currencyIQD: "دينار",
    printBtn: "تحميل وصل PDF",
    titleMr: "السيد",
    titleMiss: "الآنسة",
    needHelp: "تحتاج مساعدة بخصوص هذا الطلب؟",
    whatsapp: "واتساب",
    instagram: "إنستغرام",
    waMessage: "مرحباً، لدي استفسار حول طلبي برقم: ",
    adminPasswordPrompt: "يرجى إدخال كلمة مرور الإدارة:",
    adminWrongPassword: "كلمة المرور غير صحيحة!",
    s0: "تم الطلب",
    s2: "تجهيز بواسطة شي إن",
    s3: "شحن إلى دبي",
    s4: "وصل إلى دبي",
    s6: "في الطريق إلى كردستان",
    s7: "تم الاستلام والتغليف",
    s8: "في الطريق للتسليم",
    s9: "تم التوصيل",
    time0: "قيد الانتظار",
    time2: "1 - 3 أيام",
    time3: "6 - 10 أيام",
    time4: "1 - 2 أيام",
    time6: "6 - 7 أيام",
    time7: "يوم واحد",
    time8Ku: "1 - 2 أيام",
    time8Ar: "2 - 3 أيام",
    time9: "مكتمل",
  },
};

const ADMIN_PASSWORD = "dalin1998";
const WHATSAPP_NUMBER = "9647517363196";
const INSTAGRAM_URL = "https://instagram.com/dalin.shoping";
const activeStatusValues: StatusValue[] = [0, 2, 3, 4, 6, 7, 8, 9];
const statusIconMap: Record<StatusValue, string> = {
  0: "🧾",
  2: "🧵",
  3: "✈️",
  4: "🏙️",
  6: "🚚",
  7: "📦",
  8: "🛵",
  9: "✓",
};

function normalizeTrackingCode(value: string) {
  const numbersOnly = value.trim().toUpperCase().replace(/^DS/, "").replace(/\D/g, "");
  return numbersOnly ? `DS${numbersOnly}` : "";
}

function normalizeActiveStatus(value?: number | string): StatusValue {
  const numeric = Number(value ?? 0);
  if (numeric === 1) return 2;
  if (numeric === 5) return 6;
  if (activeStatusValues.includes(numeric as StatusValue)) return numeric as StatusValue;
  if (numeric >= 9) return 9;
  return 0;
}

function formatMoney(value?: number) {
  return Number(value ?? 0).toLocaleString();
}

export default function OrderTracking() {
  const [orderCode, setOrderCode] = useState("");
  const [orderData, setOrderData] = useState<TrackingOrder | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLang] = useState<Lang>("en");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("dalinIsAdmin") === "true" : false
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];
  const isRtl = lang === "ar" || lang === "ku";
  const activeStatus = normalizeActiveStatus(orderData?.status);
  const activeIndex = activeStatusValues.indexOf(activeStatus);
  const progressPercent = orderData ? Math.round((activeIndex / (activeStatusValues.length - 1)) * 100) : 0;
  const orderTotal = Number(orderData?.amountIQD ?? 0) + Number(orderData?.shippingIQD ?? 0);

  const statusSteps = useMemo(
    () => [
      { value: 0 as StatusValue, label: t.s0, time: t.time0, code: "01" },
      { value: 2 as StatusValue, label: t.s2, time: t.time2, code: "02" },
      { value: 3 as StatusValue, label: t.s3, time: t.time3, code: "03" },
      { value: 4 as StatusValue, label: t.s4, time: t.time4, code: "04" },
      { value: 6 as StatusValue, label: t.s6, time: t.time6, code: "05" },
      { value: 7 as StatusValue, label: t.s7, time: t.time7, code: "06" },
      { value: 8 as StatusValue, label: t.s8, time: (orderData?.customerLang || "ku") === "ku" ? t.time8Ku : t.time8Ar, code: "07" },
      { value: 9 as StatusValue, label: t.s9, time: t.time9, code: "08" },
    ],
    [orderData?.customerLang, t]
  );

  const currentStep = statusSteps.find((step) => step.value === activeStatus) ?? statusSteps[0];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTrack = async () => {
    const finalCode = normalizeTrackingCode(orderCode);

    if (!finalCode) {
      setTrackError(t.notFound);
      setOrderData(null);
      return;
    }

    setIsTracking(true);
    setTrackError("");

    try {
      const docRef = doc(db, "orders", finalCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const nextOrder = { id: docSnap.id, ...(docSnap.data() as Omit<TrackingOrder, "id">) };
        if (nextOrder._deletedAt) {
          setOrderData(null);
          setTrackError(t.notFound);
        } else {
          setOrderData(nextOrder);
        }
      } else {
        setOrderData(null);
        setTrackError(t.notFound);
      }
    } catch (error) {
      console.error("Tracking error:", error);
      setOrderData(null);
      setTrackError(t.connectionError);
    } finally {
      setIsTracking(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setOrderCode(value.toUpperCase().replace(/^DS/, "").replace(/[^0-9]/g, ""));
    setTrackError("");
  };

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  const handleAdminLogin = () => {
    const password = prompt(t.adminPasswordPrompt);
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem("dalinIsAdmin", "true");
    } else if (password) {
      alert(t.adminWrongPassword);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("dalinIsAdmin");
  };

  const renderCustomerName = () => {
    if (!orderData) return "";

    const displayName = isAdmin && orderData._realName
      ? orderData._realName
      : `${orderData.nameFirstLetter ?? ""}*** ${orderData.nameLastLetter ?? ""}`.trim();

    const translatedTitle = orderData.title === "Miss" ? t.titleMiss : t.titleMr;

    if (lang === "ku" && orderData.title === "Miss") {
      return <>{displayName} <strong>{translatedTitle}</strong></>;
    }

    return <><strong>{translatedTitle}</strong> {displayName}</>;
  };

  const renderPhoneNumber = () => {
    if (!orderData) return "";
    if (isAdmin && orderData._realPhone) return orderData._realPhone;
    return `+964 ${orderData.phoneNetwork ?? ""} ${orderData.phoneFirst ?? ""}** **${orderData.phoneLast ?? ""}`;
  };

  const openWhatsapp = () => {
    if (!orderData) return;
    const message = encodeURIComponent(`${t.waMessage}${orderData.id}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="home-shell" dir={isRtl ? "rtl" : "ltr"}>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="home-controls" dir="ltr">
        {!isAdmin ? (
          <button onClick={handleAdminLogin} className="home-control-button admin-login" type="button">
            <span>🔒</span>
            <b>{t.admin}</b>
          </button>
        ) : (
          <div className="admin-session">
            <span>{t.adminName}</span>
            <a href="/admin" title={t.dashboard}>⚙️</a>
            <button onClick={handleAdminLogout} type="button" title={t.logout}>🔓</button>
          </div>
        )}

        <div ref={dropdownRef} className={`language-switch ${isLangOpen ? "is-open" : ""}`}>
          <button className="language-trigger" onClick={() => setIsLangOpen((open) => !open)} type="button">
            <span>{languageOptions.find((option) => option.code === lang)?.label}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {isLangOpen && (
            <div className="language-menu">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={option.code === lang ? "active" : ""}
                  onClick={() => {
                    setLang(option.code);
                    setIsLangOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={toggleTheme} className="home-control-button theme-button" type="button" title={theme === "dark" ? t.themeLight : t.themeDark}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <section className="home-stage">
        <div className="hero-board">
          <div className="hero-glass-line" aria-hidden="true" />
          <div className="logo-mark">DS</div>
          <div className="hero-kicker">{t.heroKicker}</div>

          <div className="flight-hub" aria-hidden="true">
            <div className="flight-orbit">
              <span className="flight-plane">✈</span>
              <span className="orbit-dot orbit-dot-one" />
              <span className="orbit-dot orbit-dot-two" />
            </div>
          </div>

          <div className="route-card" aria-label="Shopping route">
            <span>{t.routeShein}</span>
            <i />
            <span>{t.routeDubai}</span>
            <i />
            <span>{t.routeKurdistan}</span>
          </div>

          <div className="hero-stats">
            <div><strong>08</strong><span>{t.metricStages}</span></div>
            <div><strong>DS</strong><span>{t.metricCode}</span></div>
            <div><strong>24/7</strong><span>{t.metricSupport}</span></div>
          </div>
        </div>

        <div className="tracking-card">
          <div className="terminal-header">
            <div>
              <span className="status-light" />
              <strong>{t.terminalTitle}</strong>
            </div>
            <em>{t.liveLookup}</em>
          </div>

          <div className="search-panel" dir="ltr">
            <label className="code-input-box">
              <span>DS</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder={t.placeholder}
                value={orderCode}
                onChange={(event) => handleCodeChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleTrack();
                }}
              />
            </label>
            <button onClick={handleTrack} disabled={isTracking} className="track-button" type="button">
              {isTracking ? t.searching : t.trackBtn}
            </button>
          </div>

          {trackError && <div className="home-error">{trackError}</div>}

          {!orderData && !trackError && (
            <div className="idle-panel">
              <div className="mini-route" aria-hidden="true">
                <span>01</span><i /><span>04</span><i /><span>08</span>
              </div>
              <strong>{t.idleTitle}</strong>
              <p>{t.idleText}</p>
              <small>{t.privacyNote}</small>
            </div>
          )}

          {orderData && (
            <section className="result-panel">
              <div className="result-top">
                <div>
                  <span>{t.orderCode}</span>
                  <strong dir="ltr">{orderData.id}</strong>
                </div>
                <div>
                  <span>{t.currentStage}</span>
                  <strong>{currentStep.label}</strong>
                </div>
              </div>

              <div className="current-stage-card">
                <div className={`stage-icon-badge ${activeStatus === 9 ? "delivered" : ""}`} aria-hidden="true">
                  {statusIconMap[activeStatus]}
                </div>
                <div className="stage-copy">
                  <span>{t.expected}</span>
                  <h2>{currentStep.time}</h2>
                  <p>{t.progress}: {progressPercent}% {activeStatus === 9 ? `· ${t.completed}` : ""}</p>
                </div>
              </div>

              <div className="progress-track" aria-label={t.progress}>
                <div style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="journey-title">{t.journey}</div>
              <div className="stage-grid">
                {statusSteps.map((step) => {
                  const stepIndex = activeStatusValues.indexOf(step.value);
                  const isDone = stepIndex < activeIndex;
                  const isCurrent = step.value === activeStatus;
                  return (
                    <div key={step.value} className={`stage-tile ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}>
                      <span>{isDone ? "✓" : statusIconMap[step.value]}</span>
                      <strong>{step.label}</strong>
                      <small>{step.time}</small>
                    </div>
                  );
                })}
              </div>

              <div className="details-grid">
                <div className="detail-card customer-card">
                  <div className="detail-row">
                    <span>{t.customerInfo}</span>
                    <strong>{renderCustomerName()}</strong>
                  </div>
                  <div className="detail-row">
                    <span>{t.phone}</span>
                    <strong dir="ltr">{renderPhoneNumber()}</strong>
                  </div>
                  <div className="detail-row two-col">
                    <div>
                      <span>{t.date}</span>
                      <strong>{orderData.date || "-"}</strong>
                    </div>
                    <div>
                      <span>{t.items}</span>
                      <strong>{orderData.items ?? 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="detail-card price-card">
                  <div className="usd-price">${formatMoney(orderData.amountUSD)}</div>
                  <div className="price-line"><span>{t.equals}</span><strong>{formatMoney(orderData.amountIQD)} {t.currencyIQD}</strong></div>
                  <div className="price-line"><span>{t.deliveryFee}</span><strong>+{formatMoney(orderData.shippingIQD)} {t.currencyIQD}</strong></div>
                  <div className="price-total"><span>{t.totalAmount}</span><strong>{formatMoney(orderTotal)} {t.currencyIQD}</strong></div>
                </div>
              </div>

              <div className="action-row">
                <button onClick={() => window.print()} className="secondary-action" type="button">📄 {t.printBtn}</button>
                <button onClick={openWhatsapp} className="whatsapp-action" type="button">{t.whatsapp}</button>
                <button onClick={() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")} className="instagram-action" type="button">{t.instagram}</button>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
