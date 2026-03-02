import React, { useState, useEffect } from 'react';
import { Calculator, PiggyBank, ArrowRight, Factory, TrendingUp, Globe, DollarSign } from 'lucide-react';

// Welcome page translations
const welcomeTranslations = {
    en: {
        title: "Pig Farm Feasibility Suite",
        subtitle: "Integrated platform for production modeling, financial projection, and investment analysis — built for breeding, fattening, and integrated pig farming operations.",
        productionCalc: {
            title: "Operational Profitability Calculator",
            badge: "NO CAPEX",
            description: "Analyze production performance and operational margins without infrastructure investment. Ideal for evaluating existing farm efficiency, benchmarking KPIs, and stress-testing cost assumptions across breeding, fattening, or integrated operations.",
            button: "Open Calculator"
        },
        feasibilityStudy: {
            title: "Feasibility Study",
            badge: "WITH CAPEX",
            description: "Full project analysis including Land, Building, & Equipment CAPEX, depreciation, loan financing, and NPV/IRR.",
            button: "Open Calculator"
        },
        footer: "© 2026 Farm Financial Suite. All rights reserved."
    },
    id: {
        title: "Pig Farm Feasibility Suite",
        subtitle: "Platform terintegrasi untuk pemodelan produksi, proyeksi keuangan, dan analisis investasi — dibangun untuk operasi peternakan babi breeding, fattening, dan terintegrasi.",
        productionCalc: {
            title: "Kalkulator Profitabilitas Operasional",
            badge: "TANPA CAPEX",
            description: "Analisis kinerja produksi dan margin operasional tanpa investasi infrastruktur. Ideal untuk mengevaluasi efisiensi farm yang sudah ada, benchmarking KPI, dan stress-testing asumsi biaya di operasi breeding, fattening, atau terintegrasi.",
            button: "Buka Kalkulator"
        },
        feasibilityStudy: {
            title: "Studi Kelayakan",
            badge: "DENGAN CAPEX",
            description: "Analisis proyek lengkap termasuk CAPEX Lahan, Bangunan, & Peralatan, depresiasi, pembiayaan pinjaman, dan NPV/IRR.",
            button: "Buka Kalkulator"
        },
        footer: "© 2026 Farm Financial Suite. Hak cipta dilindungi."
    },
    vi: {
        title: "Pig Farm Feasibility Suite",
        subtitle: "Nền tảng tích hợp cho mô hình sản xuất, dự báo tài chính và phân tích đầu tư — được xây dựng cho hoạt động chăn nuôi heo giống, vỗ béo và tích hợp.",
        productionCalc: {
            title: "Máy Tính Lợi Nhuận Hoạt Động",
            badge: "KHÔNG CAPEX",
            description: "Phân tích hiệu suất sản xuất và biên lợi nhuận hoạt động mà không cần đầu tư cơ sở hạ tầng. Lý tưởng để đánh giá hiệu quả trang trại hiện có, so sánh KPI và kiểm tra căng thẳng các giả định chi phí trong hoạt động giống, vỗ béo hoặc tích hợp.",
            button: "Mở Máy Tính"
        },
        feasibilityStudy: {
            title: "Nghiên Cứu Khả Thi",
            badge: "CÓ CAPEX",
            description: "Phân tích dự án đầy đủ bao gồm CAPEX Đất, Xây dựng & Thiết bị, khấu hao, tài chính vay và NPV/IRR.",
            button: "Mở Máy Tính"
        },
        footer: "© 2026 Farm Financial Suite. Đã đăng ký bản quyền."
    }
};

export default function WelcomePage({ onSelectMode }) {
    const [language, setLanguage] = useState(() => localStorage.getItem('farmfs-language') || 'en');
    const [currency, setCurrency] = useState(() => localStorage.getItem('farmfs-currency') || 'USD');

    useEffect(() => {
        localStorage.setItem('farmfs-language', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('farmfs-currency', currency);
    }, [currency]);

    const t = welcomeTranslations[language];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center py-6 sm:py-12 p-4 relative">
            {/* Language and Currency Selector - Top Center on Mobile, Top Right on Desktop */}
            <div className="absolute top-4 left-0 right-0 sm:left-auto sm:right-6 flex justify-center sm:justify-end items-center gap-2 sm:gap-3 z-50 px-2 sm:px-0">
                {/* Language Selector */}
                <div className="flex items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm sm:shadow-md px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-200">
                    <Globe className="text-slate-500 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="en">English</option>
                        <option value="id">Bahasa</option>
                        <option value="vi">Tiếng Việt</option>
                    </select>
                </div>

                {/* Currency Selector */}
                <div className="flex items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm sm:shadow-md px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-200">
                    <DollarSign className="text-slate-500 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="USD">USD ($)</option>
                        <option value="IDR">IDR (Rp)</option>
                        <option value="VND">VND (₫)</option>
                    </select>
                </div>
            </div>

            <div className="max-w-4xl w-full mt-16 sm:mt-12 mb-auto flex-grow flex flex-col justify-center">
                <div className="text-center mb-8 px-2">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 mb-3 sm:mb-4 tracking-tight leading-tight">
                        {t.title}
                    </h1>
                    <p className="text-sm sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto px-2">
                        {t.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 sm:px-0 flex-grow">
                    {/* Option 1: No CAPEX (Production Calculator) */}
                    <button
                        onClick={() => onSelectMode('production')}
                        className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-blue-500 text-left flex flex-col"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
                        <div className="p-6 sm:p-8 relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Factory className="text-blue-600 sm:w-8 sm:h-8 w-6 h-6" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 sm:mb-3 group-hover:text-blue-700 transition-colors">
                                {t.productionCalc.title}
                            </h2>
                            <div className="inline-block self-start px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-bold mb-3 sm:mb-4">
                                {t.productionCalc.badge}
                            </div>
                            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 leading-relaxed flex-grow">
                                {t.productionCalc.description}
                            </p>
                            <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform mt-auto text-sm sm:text-base">
                                {t.productionCalc.button} <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </button>

                    {/* Option 2: With CAPEX (Feasibility Calculator) */}
                    <button
                        onClick={() => onSelectMode('feasibility')}
                        className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-emerald-500 text-left flex flex-col"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
                        <div className="p-6 sm:p-8 relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <PiggyBank className="text-emerald-600 sm:w-8 sm:h-8 w-6 h-6" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 sm:mb-3 group-hover:text-emerald-700 transition-colors">
                                {t.feasibilityStudy.title}
                            </h2>
                            <div className="inline-block self-start px-2 sm:px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] sm:text-xs font-bold mb-3 sm:mb-4">
                                {t.feasibilityStudy.badge}
                            </div>
                            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 leading-relaxed flex-grow">
                                {t.feasibilityStudy.description}
                            </p>
                            <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform mt-auto text-sm sm:text-base">
                                {t.feasibilityStudy.button} <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-8 text-center text-slate-400 text-xs sm:text-sm pb-4">
                    {t.footer}
                </div>
            </div>
        </div>
    );
}
