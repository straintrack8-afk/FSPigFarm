import React from 'react';
import { Calculator, PiggyBank, ArrowRight, Factory, TrendingUp } from 'lucide-react';

export default function WelcomePage({ onSelectMode }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
                        Farm Financial Suite
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Comprehensive tools for pig farm financial modeling, production planning, and feasibility analysis.
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
                                Production Calculator
                            </h2>
                            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-4">
                                NO CAPEX
                            </div>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                Focus on operational costs, cohort tracking, and production margins without modeling infrastructure investments.
                            </p>
                            <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                                Open Calculator <ArrowRight size={20} className="ml-2" />
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
                                Feasibility Study
                            </h2>
                            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-4">
                                WITH CAPEX
                            </div>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                Full project analysis including Land, Building, & Equipment CAPEX, depreciation, loan financing, and NPV/IRR.
                            </p>
                            <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
                                Open Calculator <ArrowRight size={20} className="ml-2" />
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-12 text-center text-slate-400 text-sm">
                    © 2026 Farm Financial Suite. All rights reserved.
                </div>
            </div>
        </div>
    );
}
