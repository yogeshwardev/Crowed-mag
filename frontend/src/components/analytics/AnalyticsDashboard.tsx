import React, { useState } from 'react';
import {
  BarChart3,
  FileDown,
  Download,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { TelemetrySnapshot, Blueprint, AIRiskAnalysis } from '../../types';
import { api } from '../../utils/api';

interface AnalyticsDashboardProps {
  telemetry: TelemetrySnapshot | null;
  blueprint: Blueprint;
  riskAnalysis: AIRiskAnalysis | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  telemetry,
  blueprint,
  riskAnalysis,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [reportFilename, setReportFilename] = useState<string>('');

  const capacity = telemetry?.capacity;
  const queues = telemetry?.queues ?? [];
  const riskScore = riskAnalysis?.risk_score ?? 35;

  // Real-time Queue chart data
  const queueChartData = queues.map(q => ({
    name: q.gate_name.replace('Main Gate ', 'G-').replace('Security Screening Pavilion', 'Sec-1'),
    incoming: q.incoming_flow_per_min,
    processing: q.processing_rate_per_min,
    queueLength: q.queue_length
  }));

  // Density Distribution bar data
  const densityData = [
    { zone: 'North Concourse', density: 2.1, threshold: 3.5 },
    { zone: 'South Concourse', density: 3.8, threshold: 3.5 },
    { zone: 'East Terrace', density: 1.6, threshold: 3.5 },
    { zone: 'West Terrace', density: 2.9, threshold: 3.5 },
    { zone: 'Main Entry Plaza', density: 4.2, threshold: 3.5 },
  ];

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await api.generateSafetyReport();
      if (res.download_url) {
        setDownloadUrl(res.download_url);
        setReportFilename(res.filename);
        // Automatically trigger browser download
        const fullUrl = `http://localhost:8000${res.download_url}`;
        window.open(fullUrl, '_blank');
      }
    } catch (err) {
      console.error('PDF generation error', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#080c14] overflow-y-auto p-6 space-y-6">
      {/* Top Banner: PDF Generation & Safety Certification */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Compliance & Audit</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                REPORTLAB PDF ENGINE
              </span>
            </div>
            <p className="text-base font-bold text-slate-100 mt-1">
              Generate an official, publication-ready crowd safety audit & emergency egress report.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-glow-green transition active:scale-95 disabled:opacity-50"
          >
            <FileDown className={`w-4 h-4 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
            <span>{isGeneratingPdf ? 'COMPILING AUDIT PDF...' : 'DOWNLOAD OFFICIAL PDF AUDIT'}</span>
          </button>
        </div>
      </div>

      {downloadUrl && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Audit report ready: <strong>{reportFilename}</strong></span>
          </span>
          <a
            href={`http://localhost:8000${downloadUrl}`}
            download
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </a>
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gate Throughput & Queue Length */}
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Turnstiles Incoming Flow vs Processing Capacity (p/min)</span>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#090e1a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="incoming" name="Inflow Rate" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="processing" name="Service Capacity" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Density Distribution */}
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Zone Density vs Safe Threshold (3.5 persons/m²)</span>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={densityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="zone" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#090e1a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="density" name="Current Density" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="threshold" name="Warning Limit" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spatial Geometry & Capacity Summary */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Venue Spatial Breakdown & Capacity Model</span>
        </span>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-sans">Total Footprint</span>
            <span className="text-lg font-bold text-slate-200 mt-1 block">
              {capacity?.total_area_m2.toLocaleString()} m²
            </span>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-emerald-400 uppercase block font-sans">Usable Surface</span>
            <span className="text-lg font-bold text-emerald-400 mt-1 block">
              {capacity?.usable_area_m2.toLocaleString()} m²
            </span>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-cyan-400 uppercase block font-sans">Safe Cap (2.0 p/m²)</span>
            <span className="text-lg font-bold text-cyan-300 mt-1 block">
              {capacity?.safe_capacity.toLocaleString()} persons
            </span>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-rose-400 uppercase block font-sans">Max Cap (4.5 p/m²)</span>
            <span className="text-lg font-bold text-rose-400 mt-1 block">
              {capacity?.maximum_capacity.toLocaleString()} persons
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
