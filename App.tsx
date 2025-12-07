import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Pill, 
  FileText, 
  MessageCircle, 
  User, 
  Menu,
  Bell,
  LogOut,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Send,
  Loader2,
  Volume2,
  Mic,
  Play,
  Pause,
  Flame,
  Upload
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { createChatSession, sendMessageToKady, explainRecord, getDentalTip } from './services/geminiService';
import { 
  ViewState, 
  Appointment, 
  Medication, 
  RecordItem, 
  ChatMessage,
  UserProfile
} from './types';
import { Chat } from "@google/genai";

// --- Audio Helper Functions ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Mock Data ---
const MOCK_USER: UserProfile = {
  name: "Sarah Johnson",
  email: "sarah.j@example.com",
  phone: "+1 (555) 123-4567",
  nextCheckup: "2024-06-15"
};

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: '1', doctorName: 'Dr. Faiz', treatmentType: 'Root Canal Follow-up', date: '2024-05-20', time: '10:00 AM', status: 'upcoming' },
  { id: '2', doctorName: 'Dr. Sarah', treatmentType: 'Dental Hygiene', date: '2024-01-15', time: '02:00 PM', status: 'completed' },
];

const INITIAL_MEDICATIONS: Medication[] = [
  { id: '1', name: 'Amoxicillin', dosage: '500mg', frequency: '3x Daily', time: ['08:00', '14:00', '20:00'], instructions: 'Take with food', takenToday: [true, false, false] },
  { id: '2', name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed', time: ['As needed'], instructions: 'For pain', takenToday: [false] },
];

const INITIAL_RECORDS: RecordItem[] = [
  { 
    id: '1', 
    type: 'prescription', 
    title: 'Antibiotics Course', 
    date: '2024-05-10', 
    doctor: 'Dr. Faiz',
    summary: 'Patient prescribed Amoxicillin 500mg to be taken 3 times a day for 5 days. Prescribed due to minor infection observed after root canal procedure. Finish full course.'
  },
  { 
    id: '2', 
    type: 'xray', 
    title: 'Full Mouth OPG', 
    date: '2024-01-15', 
    doctor: 'Dr. Faiz',
    summary: 'Panoramic X-ray scan shows healthy bone structure. Lower left wisdom tooth is slightly impacted but not currently causing issues. Monitor in next checkup.'
  },
  { 
    id: '3', 
    type: 'report', 
    title: 'Annual Checkup Report', 
    date: '2023-11-20', 
    doctor: 'Dr. Sarah',
    summary: 'Routine checkup completed. Gum health is good. Minor plaque buildup on molars. Recommended scaling and polishing. No cavities detected.'
  },
];

const HEALTH_DATA = [
  { name: 'Mon', score: 80 },
  { name: 'Tue', score: 90 },
  { name: 'Wed', score: 100 },
  { name: 'Thu', score: 70 },
  { name: 'Fri', score: 90 },
  { name: 'Sat', score: 100 },
  { name: 'Sun', score: 85 },
];

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Español' },
  { code: 'French', label: 'Français' },
  { code: 'Hindi', label: 'हिन्दी' },
  { code: 'Arabic', label: 'العربية' },
  { code: 'Chinese (Mandarin)', label: '中文' },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "Dr. Faiz suggested a follow-up visit.", time: "2h ago", read: false },
  { id: 2, text: "Don't forget your evening medication.", time: "5h ago", read: false },
  { id: 3, text: "Your cleaning results are available.", time: "1d ago", read: true },
];

// --- Components ---

const NavItem = ({ 
  active, 
  icon: Icon, 
  label, 
  onClick 
}: { 
  active: boolean; 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-2 transition-colors duration-200 ${
      active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

const Header = ({ title, user, setView }: { title: string, user: UserProfile, setView: (v: ViewState) => void }) => {
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm relative">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {title === 'Dashboard' && <p className="text-sm text-slate-500">Welcome back, {user.name.split(' ')[0]}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setShowNotifs(!showNotifs)}
          className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative transition-colors"
        >
          <Bell size={20} />
          {MOCK_NOTIFICATIONS.some(n => !n.read) && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          )}
        </button>
        
        {/* Notifications Dropdown */}
        {showNotifs && (
          <div className="absolute top-14 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-[slideUp_0.2s_ease-out]">
             <div className="flex justify-between items-center px-4 py-2 border-b border-slate-50 mb-2">
               <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
               <button className="text-xs text-teal-600 font-medium">Mark all read</button>
             </div>
             <div className="max-h-64 overflow-y-auto">
               {MOCK_NOTIFICATIONS.map(n => (
                 <div key={n.id} className={`p-3 rounded-xl mb-1 ${n.read ? 'opacity-60' : 'bg-blue-50/50'}`}>
                    <p className="text-sm text-slate-700 leading-tight mb-1">{n.text}</p>
                    <p className="text-[10px] text-slate-400">{n.time}</p>
                 </div>
               ))}
             </div>
          </div>
        )}
        
        {showNotifs && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowNotifs(false)}></div>}

        <button onClick={() => setView(ViewState.PROFILE)} className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
          {user.name.charAt(0)}
        </button>
      </div>
    </div>
  );
};

const Button = ({ children, variant = 'primary', className = '', onClick, disabled }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-teal-500 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-600 disabled:opacity-50",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </button>
  );
};

// --- Views ---

const DashboardView = ({ 
  user, 
  appointments, 
  medications, 
  setView,
  tip
}: { 
  user: UserProfile; 
  appointments: Appointment[]; 
  medications: Medication[]; 
  setView: (v: ViewState) => void;
  tip: string;
}) => {
  const nextAppt = appointments.find(a => a.status === 'upcoming');
  const missedMeds = medications.filter(m => m.takenToday.includes(false) && m.frequency !== 'As needed').length;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-teal-500/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-teal-100 text-sm mb-1">Upcoming Appointment</p>
            <h3 className="text-2xl font-bold">{nextAppt ? nextAppt.treatmentType : 'No Upcoming Visits'}</h3>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Calendar className="text-white" size={24} />
          </div>
        </div>
        
        {nextAppt ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-50">
              <CheckCircle2 size={16} />
              <span>{nextAppt.date} at {nextAppt.time}</span>
            </div>
            <div className="flex items-center gap-2 text-teal-50">
              <User size={16} />
              <span>{nextAppt.doctorName}</span>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="w-full !py-2 text-sm" onClick={() => setView(ViewState.APPOINTMENTS)}>
            Book Now
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => setView(ViewState.MEDICATIONS)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform"
        >
          <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center text-blue-600 mb-3">
            <Pill size={20} />
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Medications</p>
          <p className="text-lg font-bold text-slate-800">{medications.length} Active</p>
          {missedMeds > 0 && <p className="text-xs text-red-500 mt-1">{missedMeds} dose(s) remaining</p>}
        </div>

        <div 
          onClick={() => setView(ViewState.RECORDS)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform"
        >
          <div className="bg-purple-50 w-10 h-10 rounded-full flex items-center justify-center text-purple-600 mb-3">
            <FileText size={20} />
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Records</p>
          <p className="text-lg font-bold text-slate-800">View History</p>
          <p className="text-xs text-slate-400 mt-1">Last update: 2 days ago</p>
        </div>
      </div>

      {/* Health Progress */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800">Oral Hygiene Score</h3>
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">+12% vs last week</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={HEALTH_DATA}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {HEALTH_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#14b8a6' : '#cbd5e1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fire Tip of the Day */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden">
         <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-white rounded-lg shadow-sm text-orange-500">
               <Flame size={18} fill="currentColor" />
            </div>
            <h4 className="font-bold text-orange-800 text-sm uppercase tracking-wide">
               Fire Tips of the Day
            </h4>
         </div>
         <p className="text-slate-700 text-sm font-medium leading-relaxed italic pl-1">
            "{tip || "Loading your daily tip..."}"
         </p>
      </div>
    </div>
  );
};

const AppointmentsView = ({ appointments, setAppointments }: { appointments: Appointment[], setAppointments: any }) => {
  const [showBookModal, setShowBookModal] = useState(false);
  const [newAppt, setNewAppt] = useState({ type: '', date: '', time: '', reason: '' });

  const handleBook = () => {
    if (!newAppt.type || !newAppt.date) return;
    const appt: Appointment = {
      id: Math.random().toString(),
      doctorName: 'Dr. Faiz',
      treatmentType: newAppt.type,
      date: newAppt.date,
      time: newAppt.time || '09:00 AM',
      status: 'upcoming'
    };
    setAppointments([...appointments, appt]);
    setShowBookModal(false);
    setNewAppt({ type: '', date: '', time: '', reason: '' });
  };

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Your Visits</h2>
        <button onClick={() => setShowBookModal(true)} className="bg-teal-50 text-teal-600 p-2 rounded-lg hover:bg-teal-100">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto no-scrollbar flex-1">
        {appointments.length === 0 && (
            <div className="text-center py-10 text-slate-400">
                <p>No appointments found.</p>
            </div>
        )}
        {appointments.map(appt => (
          <div key={appt.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
             <div className={`w-1 rounded-full ${appt.status === 'upcoming' ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
             <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800">{appt.treatmentType}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${
                    appt.status === 'upcoming' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {appt.status}
                  </span>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2 mb-1">
                  <Calendar size={14} /> {appt.date} at {appt.time}
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <User size={14} /> {appt.doctorName}
                </div>
             </div>
          </div>
        ))}
      </div>

      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">New Appointment</h3>
              <button onClick={() => setShowBookModal(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Type</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-teal-500"
                  value={newAppt.type}
                  onChange={e => setNewAppt({...newAppt, type: e.target.value})}
                >
                  <option value="">Select Service</option>
                  <option value="General Checkup">General Checkup</option>
                  <option value="Cleaning">Cleaning & Hygiene</option>
                  <option value="Whitening">Teeth Whitening</option>
                  <option value="Root Canal">Root Canal</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                   <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-teal-500" 
                      value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                   <input type="time" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-teal-500"
                      value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} />
                </div>
              </div>

              <Button className="w-full mt-4" onClick={handleBook} disabled={!newAppt.type || !newAppt.date}>
                Confirm Booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MedicationsView = ({ medications, toggleMed }: { medications: Medication[], toggleMed: (id: string, idx: number) => void }) => (
  <div className="p-4 pb-24">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-lg font-bold text-slate-800">Medication Tracker</h2>
    </div>

    <div className="space-y-6">
      {medications.map(med => (
        <div key={med.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{med.name}</h3>
              <p className="text-slate-500 text-sm">{med.dosage} • {med.frequency}</p>
            </div>
            <div className="bg-teal-50 text-teal-600 p-2 rounded-lg">
              <Pill size={20} />
            </div>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-xl mb-4">
             <p className="text-xs text-slate-600 font-medium">Instruction:</p>
             <p className="text-sm text-slate-800">{med.instructions}</p>
          </div>

          <div>
             <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Today's Schedule</p>
             <div className="flex flex-wrap gap-3">
               {med.time.map((time, idx) => (
                 <button 
                    key={idx}
                    onClick={() => toggleMed(med.id, idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                      med.takenToday[idx] 
                        ? 'bg-teal-500 border-teal-500 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                    }`}
                 >
                   {med.takenToday[idx] ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                   <span className="text-sm font-medium">{time}</span>
                 </button>
               ))}
             </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RecordsView = ({ records, addRecord }: { records: RecordItem[], addRecord: (r: RecordItem) => void }) => {
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<{ text: string, audioData?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExplainClick = (record: RecordItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRecord(record);
    setExplanation(null);
    setLoading(false);
    setIsPlaying(false);
    setShowExplanationModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate upload
      const newRecord: RecordItem = {
        id: Math.random().toString(),
        type: 'report',
        title: file.name,
        date: new Date().toISOString().split('T')[0],
        doctor: 'Dr. Upload',
        summary: 'Uploaded patient record. Pending detailed analysis.'
      };
      addRecord(newRecord);
    }
  };

  const handleGenerateExplanation = async () => {
    if (!selectedRecord) return;
    setLoading(true);
    setExplanation(null);
    
    // Stop any current audio
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
    }
    
    try {
      const result = await explainRecord(selectedRecord.summary, language);
      setExplanation(result);
      if (result.audioData) {
        // Auto play
        playAudio(result.audioData);
      }
    } catch (error) {
      console.error("Failed to explain:", error);
      setExplanation({ text: "Sorry, I couldn't generate an explanation at this time." });
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (base64Data: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
      }

      const audioBuffer = await decodeAudioData(
        decode(base64Data),
        audioContextRef.current,
        24000,
        1
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      
      audioSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (error) {
      console.error("Audio Playback Error:", error);
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        setIsPlaying(false);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleClose = () => {
    stopAudio();
    setShowExplanationModal(false);
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Medical Records</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {records.map(rec => (
          <div 
            key={rec.id} 
            onClick={() => handleExplainClick(rec)}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center relative group active:scale-95 transition-transform cursor-pointer"
          >
             <button 
               onClick={(e) => handleExplainClick(rec, e)}
               className="absolute top-2 right-2 p-1.5 bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 transition-colors z-10"
             >
               <Volume2 size={16} />
             </button>
             <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
               rec.type === 'xray' ? 'bg-slate-800 text-white' : 
               rec.type === 'prescription' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
             }`}>
               {rec.type === 'xray' ? <FileImage size={20} /> : <FileText size={20} />}
             </div>
             <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{rec.title}</h4>
             <p className="text-xs text-slate-500 mt-1">{rec.date}</p>
             <p className="text-[10px] text-teal-600 font-medium mt-2">Dr. {rec.doctor.split(' ')[1]}</p>
          </div>
        ))}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[140px] cursor-pointer hover:bg-slate-100 transition-colors"
        >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
              accept="image/*,.pdf"
            />
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-slate-400">
               <Upload size={20} />
            </div>
            <p className="text-xs text-slate-500">Upload Record</p>
        </div>
      </div>

      {/* Explanation Modal */}
      {showExplanationModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                 <div className="bg-teal-100 p-2 rounded-full text-teal-600">
                    <Mic size={20} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800">Voice Explanation</h3>
              </div>
              <button onClick={handleClose}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg">
              <span className="font-bold">Record:</span> {selectedRecord.title}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Language</label>
                <div className="grid grid-cols-2 gap-2">
                   {LANGUAGES.map(lang => (
                     <button 
                       key={lang.code}
                       onClick={() => setLanguage(lang.code)}
                       className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                         language === lang.code 
                           ? 'bg-teal-500 text-white border-teal-500' 
                           : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                       }`}
                     >
                       {lang.label}
                     </button>
                   ))}
                </div>
              </div>

              {!explanation && !loading && (
                 <Button className="w-full mt-4" onClick={handleGenerateExplanation}>
                    Generate Explanation
                 </Button>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-6 text-teal-600">
                  <Loader2 size={32} className="animate-spin mb-2" />
                  <p className="text-sm font-medium">Dr. AI is analyzing...</p>
                </div>
              )}

              {explanation && (
                <div className="mt-2 animate-fadeIn">
                   <div className="bg-slate-50 p-4 rounded-xl text-sm leading-relaxed text-slate-700 mb-4 max-h-40 overflow-y-auto border border-slate-100">
                     {explanation.text}
                   </div>
                   
                   {explanation.audioData && (
                     <button 
                       onClick={() => isPlaying ? stopAudio() : playAudio(explanation.audioData!)}
                       className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                         isPlaying 
                           ? 'bg-red-50 text-red-500 border border-red-100' 
                           : 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                       }`}
                     >
                       {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                       {isPlaying ? 'Stop Audio' : 'Play Voice'}
                     </button>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChatView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: 'Hello! I am Kady, your Luminous Dental Care assistant. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Gemini Chat session
    if (!chatRef.current) {
      chatRef.current = createChatSession();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await sendMessageToKady(chatRef.current, userMsg.text);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      // Error handling is inside service, but double check here
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, connection error.", timestamp: new Date(), isError: true };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    // Optional: Auto send immediately
    // handleSend(); 
  };

  return (
    <div className="flex flex-col h-full bg-white">
       <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
             <MessageCircle size={20} className="text-teal-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Chat with Kady</h3>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs text-slate-500">Online</p>
            </div>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                 msg.role === 'user' 
                   ? 'bg-teal-600 text-white rounded-tr-none' 
                   : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
               }`}>
                 {msg.text}
               </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
               <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-2">
                 <Loader2 size={16} className="animate-spin text-teal-500" />
                 <span className="text-xs text-slate-400">Kady is typing...</span>
               </div>
             </div>
          )}
       </div>

       {/* Quick Actions */}
       {messages.length < 3 && (
         <div className="px-4 pt-2 flex gap-2 overflow-x-auto no-scrollbar">
           <button onClick={() => handleQuickAction("Book Appointment")} className="whitespace-nowrap px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-full text-xs font-medium">Book Appointment</button>
           <button onClick={() => handleQuickAction("Clinic Address")} className="whitespace-nowrap px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-full text-xs font-medium">Clinic Address</button>
           <button onClick={() => handleQuickAction("Emergency")} className="whitespace-nowrap px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-full text-xs font-medium">Emergency</button>
         </div>
       )}

       <div className="p-4 bg-white border-t border-slate-100 pb-24">
         <div className="flex gap-2">
           <input 
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="Type your message..."
             className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
           />
           <button onClick={handleSend} disabled={!input.trim() || loading} className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:scale-95 transition-all">
             <Send size={20} />
           </button>
         </div>
       </div>
    </div>
  );
};

// --- Main App Controller ---

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [records, setRecords] = useState<RecordItem[]>(INITIAL_RECORDS);
  const [dentalTip, setDentalTip] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Fetch tip only once when app loads
    const fetchTip = async () => {
      const tip = await getDentalTip();
      setDentalTip(tip);
    };
    fetchTip();
  }, []);

  // Fake auth
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-teal-500 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-teal-500/20">
          <Pill size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Luminous</h1>
        <p className="text-slate-500 mb-8">Dental Care Patient Portal</p>
        
        <div className="w-full max-w-sm space-y-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <input type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
          <Button onClick={() => setIsLoggedIn(true)} className="w-full mt-4">Sign In</Button>
          <p className="text-center text-xs text-slate-400 mt-4">Demo Access: Just click Sign In</p>
        </div>
      </div>
    );
  }

  const toggleMed = (id: string, idx: number) => {
    setMedications(medications.map(m => {
      if (m.id === id) {
        const newTaken = [...m.takenToday];
        newTaken[idx] = !newTaken[idx];
        return { ...m, takenToday: newTaken };
      }
      return m;
    }));
  };

  const addRecord = (record: RecordItem) => {
    setRecords([record, ...records]);
  };

  const renderView = () => {
    switch(view) {
      case ViewState.DASHBOARD: 
        return <DashboardView user={MOCK_USER} appointments={appointments} medications={medications} setView={setView} tip={dentalTip} />;
      case ViewState.APPOINTMENTS: 
        return <AppointmentsView appointments={appointments} setAppointments={setAppointments} />;
      case ViewState.MEDICATIONS: 
        return <MedicationsView medications={medications} toggleMed={toggleMed} />;
      case ViewState.RECORDS: 
        return <RecordsView records={records} addRecord={addRecord} />;
      case ViewState.CHAT: 
        return <ChatView />;
      case ViewState.PROFILE: return (
        <div className="p-4">
           <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 mb-6">
             <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-3xl font-bold mx-auto mb-4">
               {MOCK_USER.name.charAt(0)}
             </div>
             <h2 className="text-xl font-bold">{MOCK_USER.name}</h2>
             <p className="text-slate-500 text-sm">{MOCK_USER.email}</p>
             <Button variant="secondary" className="mx-auto mt-4 !py-2 !px-6 text-sm" onClick={() => setIsLoggedIn(false)}>
               <LogOut size={16} /> Sign Out
             </Button>
           </div>
           
           <h3 className="font-bold text-slate-800 mb-3 px-1">Settings</h3>
           <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
             <div className="p-4 flex justify-between items-center border-b border-slate-50">
               <span>Notifications</span>
               <div className="w-10 h-6 bg-teal-500 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div></div>
             </div>
             <div className="p-4 flex justify-between items-center border-b border-slate-50">
               <span>Dark Mode</span>
               <div className="w-10 h-6 bg-slate-200 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div></div>
             </div>
             <div className="p-4 flex justify-between items-center text-red-500">
               <span>Delete Account</span>
             </div>
           </div>
        </div>
      );
      default: return <div>Not Found</div>;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 flex flex-col relative shadow-2xl overflow-hidden">
      {view !== ViewState.CHAT && <Header title={view.charAt(0) + view.slice(1).toLowerCase()} user={MOCK_USER} setView={setView} />}
      
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
         {renderView()}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 flex justify-between items-center px-6 pb-6 pt-3 absolute bottom-0 w-full z-20 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <NavItem active={view === ViewState.DASHBOARD} icon={LayoutDashboard} label="Home" onClick={() => setView(ViewState.DASHBOARD)} />
        <NavItem active={view === ViewState.APPOINTMENTS} icon={Calendar} label="Visits" onClick={() => setView(ViewState.APPOINTMENTS)} />
        
        {/* Floating Chat Button */}
        <div className="relative -top-8">
           <button 
             onClick={() => setView(ViewState.CHAT)}
             className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/40 transition-transform hover:scale-105 active:scale-95 ${
               view === ViewState.CHAT ? 'bg-slate-800 text-white' : 'bg-teal-500 text-white'
             }`}
           >
             <MessageCircle size={24} fill="currentColor" className="opacity-100" />
           </button>
        </div>

        <NavItem active={view === ViewState.MEDICATIONS} icon={Pill} label="Meds" onClick={() => setView(ViewState.MEDICATIONS)} />
        <NavItem active={view === ViewState.RECORDS} icon={FileText} label="Records" onClick={() => setView(ViewState.RECORDS)} />
      </nav>
    </div>
  );
}