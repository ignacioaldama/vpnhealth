/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Globe, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Network,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Edit2,
  Check,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Move
} from 'lucide-react';

// --- Types ---

type HealthStatus = 'ok' | 'affected' | 'down';

interface Site {
  id: string;
  name: string;
  city?: string;
  status: HealthStatus;
  x: number;
  y: number;
}

interface Connection {
  vpnId: string;
  siteId: string;
  status: HealthStatus;
}

interface VPN {
  id: string;
  name: string;
  siteIds: string[]; // IDs of sites in this VPN
  x: number;
  y: number;
}

interface Alarm {
  id: string;
  vpnId: string;
  vpnName: string;
  status: HealthStatus;
  rootCause: string;
  timestamp: number;
}

// --- Constants & Defaults ---

const HPE_GREEN = '#01A982';
const HPE_GRAY = '#425563';
const HPE_DARK = '#2D3E4B';
const HPE_LIGHT = '#F1F1F1';

const FAMOUS_CITIES = [
  { name: 'New York', x: 215, y: 175 },
  { name: 'London', x: 395, y: 135 },
  { name: 'Tokyo', x: 695, y: 175 },
  { name: 'Paris', x: 410, y: 160 },
  { name: 'Singapore', x: 645, y: 325 },
  { name: 'Sydney', x: 735, y: 415 },
  { name: 'Dubai', x: 515, y: 225 },
  { name: 'São Paulo', x: 295, y: 375 },
  { name: 'Mumbai', x: 565, y: 265 },
  { name: 'Berlin', x: 450, y: 140 },
  { name: 'San Francisco', x: 135, y: 175 },
  { name: 'Hong Kong', x: 665, y: 245 },
  { name: 'Johannesburg', x: 445, y: 395 },
  { name: 'Cairo', x: 465, y: 225 },
  { name: 'Lagos', x: 405, y: 305 },
  { name: 'Mexico City', x: 195, y: 245 },
  { name: 'Toronto', x: 225, y: 160 },
];

const STATUS_COLORS: Record<HealthStatus, string> = {
  ok: 'text-[#01A982] bg-[#01A982]/10 border-[#01A982]/20',
  affected: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  down: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
};

const MAP_STATUS_COLORS: Record<HealthStatus, string> = {
  ok: '#01A982', // HPE Green
  affected: '#f59e0b', // amber-500
  down: '#f43f5e', // rose-500
};

const STATUS_ICONS: Record<HealthStatus, any> = {
  ok: CheckCircle2,
  affected: AlertTriangle,
  down: XCircle,
};

const VPN_STATUS_ICONS: Record<HealthStatus, any> = {
  ok: ShieldCheck,
  affected: ShieldAlert,
  down: ShieldX,
};

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const getVPNRootCause = (vpn: VPN, sites: Site[], connections: Connection[]): string => {
  const vpnSites = sites.filter(s => vpn.siteIds.includes(s.id));
  const vpnConnections = connections.filter(c => c.vpnId === vpn.id);

  const issues: string[] = [];

  vpnSites.forEach(s => {
    if (s.status !== 'ok') {
      issues.push(`Site "${s.name}" is ${s.status.toUpperCase()}`);
    }
  });

  vpnConnections.forEach(c => {
    if (c.status !== 'ok') {
      const site = sites.find(s => s.id === c.siteId);
      issues.push(`Connection to "${site?.name || 'Unknown'}" is ${c.status.toUpperCase()}`);
    }
  });

  return issues.length > 0 ? issues.join(', ') : 'Unknown cause';
};

const getVPNStatus = (vpn: VPN, sites: Site[], connections: Connection[]): HealthStatus => {
  const vpnSites = sites.filter(s => vpn.siteIds.includes(s.id));
  const vpnConnections = connections.filter(c => c.vpnId === vpn.id);

  if (vpnSites.length === 0) return 'ok';

  const sitesDown = vpnSites.filter(s => s.status === 'down').length;
  const connectionsDown = vpnConnections.filter(c => c.status === 'down').length;

  const sitesAffectedOrDown = vpnSites.filter(s => s.status !== 'ok').length;
  const connectionsAffectedOrDown = vpnConnections.filter(c => c.status !== 'ok').length;

  const totalSites = vpnSites.length;
  const totalConnections = vpnConnections.length;

  // Rule: 50% or more sites down -> VPN down
  if (totalSites > 0 && (sitesDown / totalSites) >= 0.5) return 'down';
  // Rule: 50% or more connections down -> VPN down
  if (totalConnections > 0 && (connectionsDown / totalConnections) >= 0.5) return 'down';

  // Rule: Some sites/connections down or affected -> VPN affected
  if (sitesAffectedOrDown > 0 || connectionsAffectedOrDown > 0) return 'affected';

  return 'ok';
};

// --- Components ---

const EditableText: React.FC<{
  value: string;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
}> = ({ value, onSave, className, inputClassName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (tempValue.trim() && tempValue !== value) {
      onSave(tempValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`bg-white border border-[#01A982] outline-none px-1 py-0.5 w-full ${inputClassName}`}
        />
        <button onClick={handleSave} className="text-[#01A982] hover:bg-[#01A982]/10 p-0.5 rounded">
          <Check size={14} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`group/edit flex items-center gap-2 cursor-pointer ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <span className="truncate">{value}</span>
      <Edit2 size={12} className="opacity-0 group-hover/edit:opacity-40 transition-opacity text-[#425563]" />
    </div>
  );
};

const StatusBadge = ({ status, label }: { status: HealthStatus; label?: string }) => {
  const Icon = STATUS_ICONS[status];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[status]}`}>
      <Icon size={12} strokeWidth={2.5} />
      {label || status}
    </div>
  );
};

const TopologyMap = ({ 
  vpns, 
  sites, 
  connections, 
  vpnStatuses, 
  onSelectVpn, 
  selectedVpnId,
  onUpdatePos,
  onRefreshGeo,
  onPositionTop,
  onPositionBottom,
  onSaveLayout
}: { 
  vpns: VPN[]; 
  sites: Site[]; 
  connections: Connection[]; 
  vpnStatuses: Record<string, HealthStatus>;
  onSelectVpn: (id: string) => void;
  selectedVpnId: string | null;
  onUpdatePos: (type: 'site' | 'vpn', id: string, x: number, y: number) => void;
  onRefreshGeo: () => void;
  onPositionTop: () => void;
  onPositionBottom: () => void;
  onSaveLayout: () => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ type: 'site' | 'vpn', id: string, offsetX: number, offsetY: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;
    onUpdatePos(dragging.type, dragging.id, x - dragging.offsetX, y - dragging.offsetY);
  };

  const handleMouseUp = () => setDragging(null);

  const startDragging = (e: React.MouseEvent, type: 'site' | 'vpn', id: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    const mouseX = (e.clientX - CTM.e) / CTM.a;
    const mouseY = (e.clientY - CTM.f) / CTM.d;
    setDragging({ 
      type, 
      id, 
      offsetX: mouseX - currentX, 
      offsetY: mouseY - currentY 
    });
  };

  return (
    <div className="relative w-full h-[500px] bg-[#F8F9FA] border border-[#141414] overflow-hidden group/map">
      {/* World Map Background */}
      <div 
        className="absolute inset-0 opacity-[0.15] grayscale contrast-125" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} 
      />
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#141414 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <svg 
        ref={svgRef}
        className="w-full h-full touch-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connection Lines */}
        {vpns.map(vpn => (
          vpn.siteIds.map(sid => {
            const site = sites.find(s => s.id === sid);
            const conn = connections.find(c => c.vpnId === vpn.id && c.siteId === sid);
            if (!site || !conn) return null;

            const isSelected = selectedVpnId === vpn.id;

            return (
              <line
                key={`${vpn.id}-${sid}`}
                x1={vpn.x}
                y1={vpn.y}
                x2={site.x}
                y2={site.y}
                stroke={MAP_STATUS_COLORS[conn.status]}
                strokeWidth={isSelected ? 3 : 1.5}
                strokeDasharray={conn.status === 'affected' ? '5,5' : 'none'}
                opacity={isSelected ? 1 : 0.3}
                className="transition-all duration-300"
              />
            );
          })
        ))}

        {/* Sites (Squares) */}
        {sites.map(site => (
          <g
            key={site.id}
            transform={`translate(${site.x - 12}, ${site.y - 12})`}
            onMouseDown={(e) => startDragging(e, 'site', site.id, site.x, site.y)}
            className="cursor-move"
          >
            <rect
              width="24"
              height="24"
              fill="white"
              stroke={MAP_STATUS_COLORS[site.status]}
              strokeWidth="2"
              rx="2"
            />
            <text
              x="12"
              y="40"
              textAnchor="middle"
              className="text-[9px] font-bold uppercase tracking-tighter fill-[#141414] opacity-60 pointer-events-none select-none"
            >
              {site.name}
            </text>
            <rect
              width="8"
              height="8"
              x="8"
              y="8"
              fill={MAP_STATUS_COLORS[site.status]}
              className={site.status !== 'ok' ? 'animate-pulse' : ''}
              rx="1"
            />
          </g>
        ))}

        {/* VPNs (Circles) */}
        {vpns.map(vpn => {
          const status = vpnStatuses[vpn.id];
          const isSelected = selectedVpnId === vpn.id;

          return (
            <g
              key={vpn.id}
              transform={`translate(${vpn.x}, ${vpn.y})`}
              onMouseDown={(e) => startDragging(e, 'vpn', vpn.id, vpn.x, vpn.y)}
              onClick={() => onSelectVpn(vpn.id)}
              className="cursor-move group/vpn"
            >
              <circle
                r="20"
                fill="white"
                stroke={MAP_STATUS_COLORS[status]}
                strokeWidth={isSelected ? 4 : 2}
                className="transition-all duration-300"
              />
              <circle
                r="12"
                fill={MAP_STATUS_COLORS[status]}
                className={status !== 'ok' ? 'animate-pulse' : ''}
              />
              <text
                y="-30"
                textAnchor="middle"
                className={`text-[10px] font-bold uppercase tracking-tight fill-[#141414] transition-opacity pointer-events-none select-none ${isSelected ? 'opacity-100' : 'opacity-40 group-hover/vpn:opacity-100'}`}
              >
                {vpn.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button 
          onClick={onSaveLayout}
          className="p-2 bg-white border border-[#01A982] text-[#01A982] hover:bg-[#01A982] hover:text-white transition-all rounded-sm shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/save"
          title="Save Layout"
        >
          <Save size={14} />
          <span className="hidden group-hover/map:block">Save Layout</span>
        </button>
        <button 
          onClick={onPositionTop}
          className="p-2 bg-white border border-[#425563]/20 hover:bg-[#01A982] hover:text-white transition-all rounded-sm shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn"
          title="Align VPNs Top"
        >
          <ArrowUp size={14} />
          <span className="hidden group-hover/map:block">VPNs Top</span>
        </button>
        <button 
          onClick={onPositionBottom}
          className="p-2 bg-white border border-[#425563]/20 hover:bg-[#01A982] hover:text-white transition-all rounded-sm shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn"
          title="Align VPNs Bottom"
        >
          <ArrowDown size={14} />
          <span className="hidden group-hover/map:block">VPNs Bottom</span>
        </button>
        <button 
          className="p-2 bg-[#01A982] text-white border border-[#01A982] transition-all rounded-sm shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn"
          title="Free Move Mode (Active)"
        >
          <Move size={14} />
          <span className="hidden group-hover/map:block">Free Move</span>
        </button>
        <button 
          onClick={onRefreshGeo}
          className="p-2 bg-white border border-[#425563]/20 hover:bg-[#01A982] hover:text-white transition-all rounded-sm shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn"
          title="Refresh Geo Coordinates"
        >
          <RefreshCw size={14} className="group-hover/btn:animate-spin" />
          <span className="hidden group-hover/map:block">Refresh Coordinates</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-4 bg-white border border-[#425563]/20 space-y-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#01A982]" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#425563]">Nominal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#425563]">Affected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#425563]">Down</span>
        </div>
        <div className="pt-2 border-t border-[#425563]/10 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[#425563]/40 rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[#425563]">VPN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[#425563]/40 rounded-sm" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[#425563]">Site</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // --- State ---
  const [sites, setSites] = useState<Site[]>([
    { id: 'site-ny', name: 'New York', city: 'New York', status: 'ok', x: 215, y: 175 },
    { id: 'site-mex', name: 'Mexico City', city: 'Mexico City', status: 'ok', x: 195, y: 245 },
    { id: 'site-par', name: 'Paris', city: 'Paris', status: 'ok', x: 410, y: 160 },
    { id: 'site-ldn', name: 'London', city: 'London', status: 'ok', x: 395, y: 135 },
    { id: 'site-ber', name: 'Berlin', city: 'Berlin', status: 'ok', x: 450, y: 140 },
    { id: 'site-mum', name: 'Mumbai', city: 'Mumbai', status: 'ok', x: 565, y: 265 },
    { id: 'site-dub', name: 'Dubai', city: 'Dubai', status: 'ok', x: 515, y: 225 },
  ]);

  const [vpns, setVpns] = useState<VPN[]>([
    { id: 'vpn-1', name: 'VPN-1', siteIds: ['site-ny', 'site-mex', 'site-par'], x: 270, y: 190 },
    { id: 'vpn-2', name: 'VPN-2', siteIds: ['site-par', 'site-ldn', 'site-ber'], x: 410, y: 120 },
    { id: 'vpn-3', name: 'VPN-3', siteIds: ['site-par', 'site-mum', 'site-dub'], x: 500, y: 210 },
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    { vpnId: 'vpn-1', siteId: 'site-ny', status: 'ok' },
    { vpnId: 'vpn-1', siteId: 'site-mex', status: 'ok' },
    { vpnId: 'vpn-1', siteId: 'site-par', status: 'ok' },
    { vpnId: 'vpn-2', siteId: 'site-par', status: 'ok' },
    { vpnId: 'vpn-2', siteId: 'site-ldn', status: 'ok' },
    { vpnId: 'vpn-2', siteId: 'site-ber', status: 'ok' },
    { vpnId: 'vpn-3', siteId: 'site-par', status: 'ok' },
    { vpnId: 'vpn-3', siteId: 'site-mum', status: 'ok' },
    { vpnId: 'vpn-3', siteId: 'site-dub', status: 'ok' },
  ]);

  const [selectedVpnId, setSelectedVpnId] = useState<string | null>(null);
  const [isAddingSite, setIsAddingSite] = useState(false);
  const [isAddingVpn, setIsAddingVpn] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [selectedCity, setSelectedCity] = useState(FAMOUS_CITIES[0].name);
  const [newVpnName, setNewVpnName] = useState('');
  const [isMonitoringOn, setIsMonitoringOn] = useState(false);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const lastVpnStatuses = useRef<Record<string, HealthStatus>>({});

  // --- Persistence ---
  useEffect(() => {
    const savedSites = localStorage.getItem('hpe-sites-layout');
    const savedVpns = localStorage.getItem('hpe-vpns-layout');
    
    if (savedSites) {
      const parsed = JSON.parse(savedSites);
      setSites(prev => prev.map(s => {
        const saved = parsed.find((p: any) => p.id === s.id);
        return saved ? { ...s, x: saved.x, y: saved.y } : s;
      }));
    }
    
    if (savedVpns) {
      const parsed = JSON.parse(savedVpns);
      setVpns(prev => prev.map(v => {
        const saved = parsed.find((p: any) => p.id === v.id);
        return saved ? { ...v, x: saved.x, y: saved.y } : v;
      }));
    }
  }, []);

  const saveLayout = () => {
    const sitesPos = sites.map(s => ({ id: s.id, x: s.x, y: s.y }));
    const vpnsPos = vpns.map(v => ({ id: v.id, x: v.x, y: v.y }));
    localStorage.setItem('hpe-sites-layout', JSON.stringify(sitesPos));
    localStorage.setItem('hpe-vpns-layout', JSON.stringify(vpnsPos));
    
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  // --- Derived State ---
  const vpnStatuses = useMemo(() => {
    return vpns.reduce((acc, vpn) => {
      acc[vpn.id] = getVPNStatus(vpn, sites, connections);
      return acc;
    }, {} as Record<string, HealthStatus>);
  }, [vpns, sites, connections]);

  // --- Handlers ---

  const updatePosition = (type: 'site' | 'vpn', id: string, x: number, y: number) => {
    if (type === 'site') {
      setSites(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
    } else {
      setVpns(prev => prev.map(v => v.id === id ? { ...v, x, y } : v));
    }
  };

  const refreshGeoCoordinates = () => {
    setSites(prev => prev.map(site => {
      const cityData = FAMOUS_CITIES.find(c => c.name === site.city || c.name === site.name);
      if (cityData) {
        return { ...site, x: cityData.x, y: cityData.y };
      }
      return site;
    }));
  };

  const positionVpnsTop = () => {
    setVpns(prev => prev.map((vpn, i) => ({
      ...vpn,
      x: (i + 1) * (800 / (prev.length + 1)),
      y: 60
    })));
  };

  const positionVpnsBottom = () => {
    setVpns(prev => prev.map((vpn, i) => ({
      ...vpn,
      x: (i + 1) * (800 / (prev.length + 1)),
      y: 440
    })));
  };

  const cycleSiteStatus = (siteId: string) => {
    setSites(prev => prev.map(s => {
      if (s.id !== siteId) return s;
      const next: HealthStatus = s.status === 'ok' ? 'affected' : s.status === 'affected' ? 'down' : 'ok';
      return { ...s, status: next };
    }));
  };

  const cycleConnectionStatus = (vpnId: string, siteId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.vpnId !== vpnId || c.siteId !== siteId) return c;
      const next: HealthStatus = c.status === 'ok' ? 'affected' : c.status === 'affected' ? 'down' : 'ok';
      return { ...c, status: next };
    }));
  };

  const addSite = () => {
    const cityData = FAMOUS_CITIES.find(c => c.name === selectedCity);
    const name = newSiteName.trim() || selectedCity;
    
    const newSite: Site = { 
      id: generateId(), 
      name: name, 
      city: selectedCity,
      status: 'ok',
      x: cityData?.x || 400,
      y: cityData?.y || 250
    };
    setSites(prev => [...prev, newSite]);
    setNewSiteName('');
    setIsAddingSite(false);
  };

  const removeSite = (id: string) => {
    setSites(prev => prev.filter(s => s.id !== id));
    setVpns(prev => prev.map(v => ({ ...v, siteIds: v.siteIds.filter(sid => sid !== id) })));
    setConnections(prev => prev.filter(c => c.siteId !== id));
  };

  const updateSiteName = (id: string, name: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const addVpn = () => {
    if (!newVpnName.trim()) return;
    const newVpn: VPN = { 
      id: generateId(), 
      name: newVpnName, 
      siteIds: [],
      x: 100 + Math.random() * 600,
      y: 100 + Math.random() * 300
    };
    setVpns(prev => [...prev, newVpn]);
    setNewVpnName('');
    setIsAddingVpn(false);
  };

  const removeVpn = (id: string) => {
    setVpns(prev => prev.filter(v => v.id !== id));
    setConnections(prev => prev.filter(c => c.vpnId !== id));
    if (selectedVpnId === id) setSelectedVpnId(null);
  };

  const updateVpnName = (id: string, name: string) => {
    setVpns(prev => prev.map(v => v.id === id ? { ...v, name } : v));
  };

  const toggleSiteInVpn = (vpnId: string, siteId: string) => {
    setVpns(prev => prev.map(v => {
      if (v.id !== vpnId) return v;
      const exists = v.siteIds.includes(siteId);
      if (exists) {
        setConnections(c => c.filter(conn => !(conn.vpnId === vpnId && conn.siteId === siteId)));
        return { ...v, siteIds: v.siteIds.filter(sid => sid !== siteId) };
      } else {
        setConnections(c => [...c, { vpnId, siteId, status: 'ok' }]);
        return { ...v, siteIds: [...v.siteIds, siteId] };
      }
    }));
  };
  
  useEffect(() => {
    if (!isMonitoringOn) {
      lastVpnStatuses.current = {};
      return;
    }

    // Initialize tracking if it's the first run since turning on
    if (Object.keys(lastVpnStatuses.current).length === 0) {
      lastVpnStatuses.current = { ...vpnStatuses };
      return;
    }

    const newAlarms: Alarm[] = [];
    (Object.entries(vpnStatuses) as [string, HealthStatus][]).forEach(([vpnId, currentStatus]) => {
      const previousStatus = lastVpnStatuses.current[vpnId] || 'ok';

      if (currentStatus !== 'ok' && currentStatus !== previousStatus) {
        const vpn = vpns.find(v => v.id === vpnId);
        if (vpn) {
          newAlarms.push({
            id: generateId(),
            vpnId,
            vpnName: vpn.name,
            status: currentStatus,
            rootCause: getVPNRootCause(vpn, sites, connections),
            timestamp: Date.now()
          });
        }
      }
    });

    if (newAlarms.length > 0) {
      setAlarms(prev => [...newAlarms, ...prev].slice(0, 50));
    }

    lastVpnStatuses.current = { ...vpnStatuses };
  }, [isMonitoringOn, vpnStatuses, vpns, sites, connections]);

  const selectedVpn = useMemo(() => vpns.find(v => v.id === selectedVpnId), [vpns, selectedVpnId]);

  const selectedVpnStats = useMemo(() => {
    if (!selectedVpn) return null;
    const vpnSites = sites.filter(s => selectedVpn.siteIds.includes(s.id));
    const vpnConnections = connections.filter(c => c.vpnId === selectedVpn.id);
    
    const totalSites = vpnSites.length;
    const totalConnections = vpnConnections.length;
    
    if (totalSites === 0) return {
      sitesAffectedPct: 0,
      sitesDownPct: 0,
      connectionsAffectedPct: 0,
      connectionsDownPct: 0,
    };

    const sitesAffected = vpnSites.filter(s => s.status === 'affected').length;
    const sitesDown = vpnSites.filter(s => s.status === 'down').length;
    const connectionsAffected = vpnConnections.filter(c => c.status === 'affected').length;
    const connectionsDown = vpnConnections.filter(c => c.status === 'down').length;

    return {
      sitesAffectedPct: Math.round((sitesAffected / totalSites) * 100),
      sitesDownPct: Math.round((sitesDown / totalSites) * 100),
      connectionsAffectedPct: Math.round((connectionsAffected / (totalConnections || 1)) * 100),
      connectionsDownPct: Math.round((connectionsDown / (totalConnections || 1)) * 100),
    };
  }, [selectedVpn, sites, connections]);

  return (
    <div className="min-h-screen bg-[#F1F1F1] text-[#000000] font-sans selection:bg-[#01A982] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#425563]/20 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-6 bg-[#01A982] flex items-center justify-center">
            <Network size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">HPE Connectivity</h1>
            <p className="text-[10px] font-bold text-[#425563] uppercase tracking-widest">VPN Health Monitor // Enterprise Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 px-4 py-2 border border-[#425563]/10 rounded-sm bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#01A982] animate-pulse" />
              <span className="text-[10px] font-black uppercase text-[#425563]">System Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#425563]/50 uppercase">Active VPNs:</span>
              <span className="text-[10px] font-black">{vpns.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#425563]/50 uppercase">Total Sites:</span>
              <span className="text-[10px] font-black">{sites.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: VPN Overview */}
        <section className="lg:col-span-8 space-y-6">
          {/* Topology Map Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#425563]">
              <Network size={16} className="text-[#01A982]" />
              Network Topology
            </h2>
            <TopologyMap 
              vpns={vpns}
              sites={sites}
              connections={connections}
              vpnStatuses={vpnStatuses}
              onSelectVpn={setSelectedVpnId}
              selectedVpnId={selectedVpnId}
              onUpdatePos={updatePosition}
              onRefreshGeo={refreshGeoCoordinates}
              onPositionTop={positionVpnsTop}
              onPositionBottom={positionVpnsBottom}
              onSaveLayout={saveLayout}
            />
            
            <AnimatePresence>
              {showSaveToast && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#01A982] text-white px-6 py-3 rounded-sm shadow-2xl z-[100] flex items-center gap-3 border-t-4 border-white/20"
                >
                  <CheckCircle2 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Network Layout Saved Successfully</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between pt-4">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#425563]">
              <ShieldCheck size={16} className="text-[#01A982]" />
              VPN Infrastructure
            </h2>
            <button 
              onClick={() => setIsAddingVpn(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#01A982] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#018a6a] transition-colors"
            >
              <Plus size={14} />
              Provision VPN
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {vpns.map((vpn) => {
                const status = vpnStatuses[vpn.id];
                const VpnIcon = VPN_STATUS_ICONS[status];
                const isSelected = selectedVpnId === vpn.id;

                return (
                  <motion.div
                    key={vpn.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedVpnId(vpn.id)}
                    className={`group relative p-6 border-l-4 transition-all duration-300 bg-white shadow-sm hover:shadow-md ${
                      isSelected 
                        ? 'border-[#01A982]' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-2 rounded-sm ${isSelected ? 'bg-[#01A982]/10' : 'bg-[#425563]/5'}`}>
                        <VpnIcon size={20} className={status === 'ok' ? 'text-[#01A982]' : status === 'affected' ? 'text-amber-500' : 'text-rose-500'} />
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div>
                      <EditableText 
                        value={vpn.name} 
                        onSave={(newName) => updateVpnName(vpn.id, newName)}
                        className="font-black text-lg leading-tight mb-1 uppercase tracking-tight"
                      />
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#01A982]' : 'text-[#425563]/60'}`}>
                        ID: {vpn.id} // {vpn.siteIds.length} Connected Sites
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {vpn.siteIds.slice(0, 3).map((sid) => (
                          <div key={sid} className={`w-6 h-6 border-2 flex items-center justify-center text-[8px] font-black ${isSelected ? 'bg-[#01A982] text-white border-white' : 'bg-[#425563]/10 border-white text-[#425563]'}`}>
                            {sites.find(s => s.id === sid)?.name.charAt(0)}
                          </div>
                        ))}
                        {vpn.siteIds.length > 3 && (
                          <div className={`w-6 h-6 border-2 flex items-center justify-center text-[8px] font-black ${isSelected ? 'bg-[#01A982] text-white border-white' : 'bg-[#425563]/10 border-white text-[#425563]'}`}>
                            +{vpn.siteIds.length - 3}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className={`transition-transform ${isSelected ? 'translate-x-1 text-[#01A982]' : 'opacity-20'}`} />
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); removeVpn(vpn.id); }}
                      className={`absolute top-4 right-4 p-1.5 rounded-sm transition-opacity ${isSelected ? 'text-[#425563]/30 hover:text-rose-500 hover:bg-rose-500/10' : 'text-[#425563]/20 hover:text-rose-500 hover:bg-rose-500/10'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* VPN Detail View */}
          <AnimatePresence mode="wait">
            {selectedVpn ? (
              <motion.div
                key={selectedVpn.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border border-[#141414] p-6"
              >
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#425563]/10">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <EditableText 
                        value={selectedVpn.name} 
                        onSave={(newName) => updateVpnName(selectedVpn.id, newName)}
                        className="text-2xl font-black uppercase tracking-tight text-[#000000]"
                      />
                      <StatusBadge status={vpnStatuses[selectedVpn.id]} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#425563]/50">Detailed Connectivity Matrix</p>
                  </div>
                  <button 
                    onClick={() => setSelectedVpnId(null)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#425563]/50 hover:text-[#01A982] transition-colors"
                  >
                    Close Detail
                  </button>
                </div>

                {/* Stats Summary Box */}
                {selectedVpnStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 border border-[#425563]/10 bg-[#F1F1F1]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#425563]/40 mb-1">Sites Affected</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-amber-600">{selectedVpnStats.sitesAffectedPct}%</span>
                      </div>
                    </div>
                    <div className="p-4 border border-[#425563]/10 bg-[#F1F1F1]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#425563]/40 mb-1">Sites Down</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-rose-600">{selectedVpnStats.sitesDownPct}%</span>
                      </div>
                    </div>
                    <div className="p-4 border border-[#425563]/10 bg-[#F1F1F1]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#425563]/40 mb-1">Links Affected</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-amber-600">{selectedVpnStats.connectionsAffectedPct}%</span>
                      </div>
                    </div>
                    <div className="p-4 border border-[#425563]/10 bg-[#F1F1F1]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#425563]/40 mb-1">Links Down</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-rose-600">{selectedVpnStats.connectionsDownPct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#425563]/40">
                    <div className="col-span-5">Site Name</div>
                    <div className="col-span-3 text-center">Site Health</div>
                    <div className="col-span-3 text-center">Link Status</div>
                    <div className="col-span-1"></div>
                  </div>

                  {selectedVpn.siteIds.map((sid) => {
                    const site = sites.find(s => s.id === sid);
                    const connection = connections.find(c => c.vpnId === selectedVpn.id && c.siteId === sid);
                    if (!site || !connection) return null;

                    return (
                      <div key={sid} className="grid grid-cols-12 items-center px-4 py-3 border border-[#141414]/5 hover:border-[#141414]/20 transition-colors group">
                        <div className="col-span-5 flex items-center gap-3">
                          <Globe size={14} className="opacity-30" />
                          <EditableText 
                            value={site.name} 
                            onSave={(newName) => updateSiteName(site.id, newName)}
                            className="font-bold text-sm"
                          />
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <button 
                            onClick={() => cycleSiteStatus(site.id)}
                            className="transition-transform hover:scale-105 active:scale-95"
                          >
                            <StatusBadge status={site.status} />
                          </button>
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <button 
                            onClick={() => cycleConnectionStatus(selectedVpn.id, site.id)}
                            className="transition-transform hover:scale-105 active:scale-95"
                          >
                            <StatusBadge status={connection.status} label="Link" />
                          </button>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button 
                            onClick={() => toggleSiteInVpn(selectedVpn.id, sid)}
                            className="p-1.5 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-sm transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {selectedVpn.siteIds.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-[#141414]/30 border border-dashed border-[#141414]/10">
                      <Network size={32} className="mb-4 opacity-20" />
                      <p className="text-[10px] font-mono uppercase tracking-widest">No sites connected to this VPN</p>
                      <p className="text-[10px] mt-1">Use the site management panel to add sites.</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-[#425563]/10 flex items-start gap-4">
                  <div className="p-2 bg-[#425563]/5 rounded-sm">
                    <Info size={16} className="text-[#425563]/40" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#425563]">Status Logic</p>
                    <p className="text-[10px] leading-relaxed text-[#425563]/60 font-bold uppercase tracking-tight">
                      VPN is <span className="text-rose-600">DOWN</span> if ≥50% sites or connections are down.<br />
                      VPN is <span className="text-amber-600">AFFECTED</span> if any site or connection is not OK.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-[#425563]/20 rounded-sm bg-white/30">
                <Activity size={48} className="text-[#01A982]/10 mb-4 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#425563]/30">Select a VPN to view detailed matrix</p>
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Column: Site Management */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Agent Monitor Toggle */}
          <div className="bg-white border border-[#425563]/10 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className={isMonitoringOn ? "text-[#01A982]" : "text-[#425563]/30"} />
                <h2 className="text-sm font-black uppercase tracking-widest text-[#425563]">Agent Monitor</h2>
              </div>
              <button 
                onClick={() => {
                  if (isMonitoringOn) setAlarms([]);
                  setIsMonitoringOn(!isMonitoringOn);
                }}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${isMonitoringOn ? 'bg-[#01A982]' : 'bg-[#425563]/20'}`}
              >
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isMonitoringOn ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#425563]/50 mt-2">
              Monitoring Status: {isMonitoringOn ? 'Active' : 'Inactive'}
            </p>
          </div>

          {/* Alarms Section */}
          <AnimatePresence>
            {isMonitoringOn && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-[#425563]/10 p-6 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#425563] flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-500" />
                    Active Alarms ({alarms.length})
                  </h3>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {alarms.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-[#425563]/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#425563]/30 italic">No alarms detected</p>
                      </div>
                    ) : (
                      alarms.map(alarm => (
                        <motion.div 
                          key={alarm.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className={`p-3 border-l-4 ${alarm.status === 'down' ? 'border-rose-500 bg-rose-50' : 'border-amber-500 bg-amber-50'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black uppercase tracking-tight">{alarm.vpnName}</span>
                            <span className="text-[8px] font-bold opacity-40">{new Date(alarm.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[9px] font-bold text-[#425563] leading-tight mb-2">
                            STATUS: <span className={alarm.status === 'down' ? 'text-rose-600' : 'text-amber-600'}>{alarm.status.toUpperCase()}</span>
                          </p>
                          <div className="bg-white/50 p-2 rounded-sm">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[#425563]/40 mb-1">Root Cause</p>
                            <p className="text-[9px] font-bold text-[#425563] italic">{alarm.rootCause}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white border border-[#425563]/10 p-6 h-fit sticky top-24 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#425563]">
                <Globe size={16} className="text-[#01A982]" />
                Site Registry
              </h2>
              <button 
                onClick={() => setIsAddingSite(true)}
                className="p-1.5 bg-[#01A982] text-white rounded-sm hover:bg-[#018a6a] transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {sites.map((site) => (
                  <motion.div
                    key={site.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 border border-[#141414]/5 hover:border-[#141414]/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <EditableText 
                        value={site.name} 
                        onSave={(newName) => updateSiteName(site.id, newName)}
                        className="font-black text-xs truncate max-w-[150px] uppercase tracking-tight"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => cycleSiteStatus(site.id)}>
                          <StatusBadge status={site.status} />
                        </button>
                        <button 
                          onClick={() => removeSite(site.id)}
                          className="p-1 text-[#141414]/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    {/* VPN Associations */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {vpns.map(vpn => {
                        const isInVpn = vpn.siteIds.includes(site.id);
                        return (
                          <button
                            key={vpn.id}
                            onClick={() => toggleSiteInVpn(vpn.id, site.id)}
                            className={`text-[8px] px-1.5 py-0.5 rounded-sm border transition-all font-black uppercase tracking-widest ${
                              isInVpn 
                                ? 'bg-[#01A982] text-white border-[#01A982]' 
                                : 'bg-transparent text-[#425563]/30 border-[#425563]/10 hover:border-[#425563]/30'
                            }`}
                          >
                            {vpn.name.split(' ').pop()}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {sites.length === 0 && (
              <div className="py-8 text-center opacity-30 italic text-[10px]">
                No sites registered.
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#425563]/10 p-5 shadow-sm group hover:border-[#01A982] transition-colors">
              <p className="text-[10px] font-black uppercase text-[#425563]/50 mb-2">Global Health</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black tracking-tighter text-[#000000]">
                  {Math.round((sites.filter(s => s.status === 'ok').length / (sites.length || 1)) * 100)}%
                </span>
                <span className="text-[9px] font-black mb-1.5 uppercase text-[#01A982] tracking-widest">Nominal</span>
              </div>
            </div>
            <div className="bg-white border border-[#425563]/10 p-5 shadow-sm group hover:border-rose-500 transition-colors">
              <p className="text-[10px] font-black uppercase text-[#425563]/50 mb-2">Alert Count</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black tracking-tighter text-[#000000]">
                  {sites.filter(s => s.status !== 'ok').length + connections.filter(c => c.status !== 'ok').length}
                </span>
                <span className="text-[9px] font-black mb-1.5 uppercase text-rose-500 tracking-widest">Active</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddingSite && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAddingSite(false)}
              className="absolute inset-0 bg-[#141414]/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-white border-t-8 border-[#01A982] p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-black uppercase tracking-tight mb-6">Register New Site</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Select Location</label>
                  <select 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-white border border-[#425563]/20 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#01A982]/20 appearance-none cursor-pointer font-bold"
                  >
                    {FAMOUS_CITIES.map(city => (
                      <option key={city.name} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Custom Site Name (Optional)</label>
                  <input 
                    type="text" 
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSite()}
                    placeholder={`e.g. ${selectedCity} Hub`}
                    className="w-full bg-white border border-[#425563]/20 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#01A982]/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={addSite}
                    className="flex-1 bg-[#01A982] text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#018a6a] transition-colors"
                  >
                    Confirm Registration
                  </button>
                  <button 
                    onClick={() => setIsAddingSite(false)}
                    className="px-6 border border-[#425563]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#425563]/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingVpn && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAddingVpn(false)}
              className="absolute inset-0 bg-[#141414]/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-white border-t-8 border-[#01A982] p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-black uppercase tracking-tight mb-6">Provision New VPN</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">VPN Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newVpnName}
                    onChange={(e) => setNewVpnName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVpn()}
                    placeholder="e.g. Secure Link Delta"
                    className="w-full bg-white border border-[#425563]/20 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#01A982]/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={addVpn}
                    className="flex-1 bg-[#01A982] text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#018a6a] transition-colors"
                  >
                    Start Provisioning
                  </button>
                  <button 
                    onClick={() => setIsAddingVpn(false)}
                    className="px-6 border border-[#425563]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#425563]/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #42556320;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #42556340;
        }
      `}</style>
    </div>
  );
}
