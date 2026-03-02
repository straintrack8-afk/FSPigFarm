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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            {/* Language and Currency Selector - Top Right */}
            <div className="absolute top-6 right-6 flex items-center gap-3">
                {/* Language Selector */}
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-md px-3 py-2 border border-slate-200">
                    <Globe size={18} className="text-slate-600" />
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="en">English</option>
                        <option value="id">Bahasa Indonesia</option>
                        <option value="vi">Tiếng Việt</option>
                    </select>
                </div>

                {/* Currency Selector */}
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-md px-3 py-2 border border-slate-200">
                    <DollarSign size={18} className="text-slate-600" />
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="USD">USD ($)</option>
                        <option value="IDR">IDR (Rp)</option>
                        <option value="VND">VND (₫)</option>
                    </select>
                </div>
            </div>

            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
                        {t.title}
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        {t.subtitle}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Option 1: No CAPEX (Production Calculator) */}
                    <button
                        onClick={() => onSelectMode('production')}
                        className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-blue-500 text-left"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
                        <div className="p-8 relative z-10">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Factory className="text-blue-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">
                                {t.productionCalc.title}
                            </h2>
                            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-4">
                                {t.productionCalc.badge}
                            </div>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                {t.productionCalc.description}
                            </p>
                            <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                                {t.productionCalc.button} <ArrowRight size={20} className="ml-2" />
                            </div>
                        </div>
                    </button>

                    {/* Option 2: With CAPEX (Feasibility Calculator) */}
                    <button
                        onClick={() => onSelectMode('feasibility')}
                        className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-emerald-500 text-left"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
                        <div className="p-8 relative z-10">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <PiggyBank className="text-emerald-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">
                                {t.feasibilityStudy.title}
                            </h2>
                            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-4">
                                {t.feasibilityStudy.badge}
                            </div>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                {t.feasibilityStudy.description}
                            </p>
                            <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
                                {t.feasibilityStudy.button} <ArrowRight size={20} className="ml-2" />
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-12 text-center text-slate-400 text-sm">
                    {t.footer}
                </div>
            </div>
        </div>
    );
}
