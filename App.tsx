
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Upload,
  Eye,
  EyeOff,
  Camera,
  Phone,
  Mail,
  UserCheck,
  ArrowLeft,
  Edit2,
  Save,
  Check,
  ChevronLeft,
  Clock,
  Download,
  CreditCard,
  QrCode,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  StickyNote,
  History,
  ClipboardList,
  XCircle
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
  UserProfile,
  Notification,
  PrescribedMed
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
const INITIAL_USER: UserProfile = {
  name: "Sarah Johnson",
  email: "sarah.j@example.com",
  phone: "+1 (555) 123-4567",
  age: 28,
  nextCheckup: "2024-06-15"
};

const INITIAL_APPOINTMENTS: Appointment[] = [
  { 
    id: '1', 
    doctorName: 'Dr. Faiz', 
    treatmentType: 'Root Canal Follow-up', 
    date: '2024-05-20', 
    time: '10:00 AM', 
    status: 'upcoming',
    historySummary: "Patient reported reduced sensitivity since last visit. Bone healing is progressing as expected. No immediate complications noted.",
    prescribedMedications: [
      { name: "Amoxicillin 500mg", duration: "5 days" },
      { name: "Ibuprofen 400mg", duration: "As needed for 3 days" }
    ],
    visitNotes: "Need to ask about the whitening procedure next time."
  },
  { 
    id: '2', 
    doctorName: 'Dr. Sarah', 
    treatmentType: 'Dental Hygiene', 
    date: '2024-01-15', 
    time: '02:00 PM', 
    status: 'completed',
    historySummary: "Annual routine checkup. Minor plaque buildup on lower molars. Gum tissue is healthy.",
    prescribedMedications: [
      { name: "Chlorhexidine Mouthwash", duration: "14 days" }
    ],
    visitNotes: "Dr. Sarah suggested using a soft-bristled electric toothbrush."
  },
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

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, text: "Dr. Faiz suggested a follow-up visit.", details: "Based on your recent root canal procedure, Dr. Faiz recommends a follow-up check in 2 weeks to ensure proper healing and address any concerns.", time: "2h ago", read: false, type: 'appointment' },
  { id: 2, text: "Don't forget your evening medication.", details: "Your daily Amoxicillin dose is due at 8:00 PM. Please take it with food as prescribed.", time: "5h ago", read: false, type: 'medication' },
  { id: 3, text: "Your cleaning results are available.", details: "Your hygiene report from Jan 15 is now finalized. You can view the full details in the Records section.", time: "1d ago", read: true, type: 'record' },
];

// --- Constants ---
const DOCTOR_AVAILABILITY_SLOTS = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM"
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

const Header = ({ 
  title, 
  user, 
  setView, 
  notifications, 
  onMarkAllRead,
  onNotificationClick
}: { 
  title: string, 
  user: UserProfile, 
  setView: (v: ViewState) => void,
  notifications: Notification[],
  onMarkAllRead: () => void,
  onNotificationClick: (n: Notification) => void
}) => {
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
          className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative transition-colors cursor-pointer"
        >
          <Bell size={20} />
          {notifications.some(n => !n.read) && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          )}
        </button>
        
        {/* Notifications Dropdown */}
        {showNotifs && (
          <div className="absolute top-14 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-[slideUp_0.2s_ease-out]">
             <div className="flex justify-between items-center px-4 py-3 border-b border-slate-50 mb-2">
               <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAllRead();
                }}
                className="text-xs text-teal-600 font-bold hover:text-teal-700 transition-colors cursor-pointer"
               >
                 Mark all read
               </button>
             </div>
             <div className="max-h-80 overflow-y-auto no-scrollbar">
               {notifications.length === 0 ? (
                 <div className="py-8 text-center text-slate-400 text-xs">No notifications yet.</div>
               ) : (
                 notifications.map(n => (
                   <div 
                    key={n.id} 
                    onClick={() => {
                      setShowNotifs(false);
                      onNotificationClick(n);
                    }}
                    className={`p-4 rounded-xl mb-1 cursor-pointer transition-all border border-transparent hover:bg-slate-50 ${n.read ? 'opacity-60' : 'bg-teal-50/40 border-teal-50 shadow-sm'}`}
                   >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className={`text-sm leading-tight ${n.read ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                          {n.text}
                        </p>
                        {!n.read && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0"></span>}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{n.time}</p>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}
        
        {showNotifs && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowNotifs(false)}></div>}

        <button onClick={() => setView(ViewState.PROFILE)} className="w-8 h-8 overflow-hidden bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm cursor-pointer">
          {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" /> : user.name.charAt(0)}
        </button>
      </div>
    </div>
  );
};

const Button = ({ children, variant = 'primary', className = '', onClick, disabled }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer";
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
  const nextAppt = useMemo(() => appointments.find(a => a.status === 'upcoming'), [appointments]);
  const missedMeds = medications.filter(m => m.takenToday.includes(false) && m.frequency !== 'As needed').length;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Hero Card */}
      <div 
        onClick={() => setView(ViewState.BOOKING_CALENDAR)}
        className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-teal-500/20 active:scale-[0.98] transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-teal-100 text-sm mb-1">Upcoming Appointment</p>
            <h3 className="text-2xl font-bold">{nextAppt ? nextAppt.treatmentType : 'No Upcoming Visits'}</h3>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors">
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
          <div className="text-teal-50 text-sm opacity-80">
            Click to open calendar and book a slot.
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => setView(ViewState.MEDICATIONS)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer"
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
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer"
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

const BookingCalendarView = ({ 
  appointments, 
  onBook 
}: { 
  appointments: Appointment[], 
  onBook: (date: string, time: string, service: string) => void 
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [service, setService] = useState<string>("General Checkup");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const daysInMonth = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return date.getDate();
  }, [currentMonth]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  }, [currentMonth]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const isSlotBooked = (date: string, time: string) => {
    return appointments.some(appt => appt.date === date && appt.time === time && appt.status === 'upcoming');
  };

  const handleDayClick = (day: number) => {
    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (dateObj < today) return; // Prevent clicking past dates

    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setSelectedTime(null);
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const handleBookingConfirm = () => {
    if (selectedDate && selectedTime && service) {
      onBook(selectedDate, selectedTime, service);
    }
  };

  return (
    <div className="p-4 pb-32 animate-fadeIn bg-slate-50 min-h-full">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map(i => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isPast = dateObj < today;
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = today.toISOString().split('T')[0] === dateStr;
            
            return (
              <button 
                key={day} 
                disabled={isPast}
                onClick={() => handleDayClick(day)}
                className={`h-10 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                  isPast ? 'text-slate-200 cursor-not-allowed' :
                  isSelected ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 
                  isToday ? 'text-teal-600 bg-teal-50 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-teal-500" />
          Available Slots for {new Date(selectedDate.replace(/-/g, '\/')).toLocaleDateString()}
        </h3>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          {DOCTOR_AVAILABILITY_SLOTS.map(time => {
            const booked = isSlotBooked(selectedDate, time);
            const isSelected = selectedTime === time;
            
            return (
              <button
                key={time}
                disabled={booked}
                onClick={() => setSelectedTime(time)}
                className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${
                  booked ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' :
                  isSelected ? 'bg-teal-500 border-teal-500 text-white shadow-lg' :
                  'bg-white border-slate-200 text-slate-600 hover:border-teal-500'
                }`}
              >
                {booked ? 'Booked' : time}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Select Service</label>
            <select 
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option>General Checkup</option>
              <option>Teeth Whitening</option>
              <option>Root Canal Therapy</option>
              <option>Dental Hygiene</option>
              <option>Orthodontic Consult</option>
            </select>
          </div>

          <Button 
            className="w-full py-4 text-base" 
            disabled={!selectedTime}
            onClick={handleBookingConfirm}
          >
            Confirm Booking
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- List component: React.FC for AppointmentCard ---
const AppointmentCard: React.FC<{ 
  appt: Appointment, 
  onSaveNotes: (id: string, notes: string) => void,
  onCancel: (id: string) => void
}> = ({ appt, onSaveNotes, onCancel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(appt.visitNotes || '');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className={`w-1 rounded-full shrink-0 ${
          appt.status === 'upcoming' ? 'bg-teal-500' : 
          appt.status === 'cancelled' ? 'bg-red-500' : 'bg-slate-300'
        }`}></div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-slate-800">{appt.treatmentType}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${
                appt.status === 'upcoming' ? 'bg-teal-50 text-teal-600' : 
                appt.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {appt.status}
              </span>
              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2 mb-1">
            <Calendar size={14} /> {appt.date} at {appt.time}
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <User size={14} /> {appt.doctorName}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-6 animate-fadeIn border-t border-slate-50 bg-slate-50/50">
          {/* Visit Summary Section */}
          <div className="mt-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-teal-600">
                <History size={16} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Consultation History</h4>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {appt.historySummary || "Patient summary will be updated after consultation."}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <ClipboardList size={16} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Prescribed Medications</h4>
              </div>
              {appt.prescribedMedications && appt.prescribedMedications.length > 0 ? (
                <div className="space-y-2">
                  {appt.prescribedMedications.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-sm font-semibold text-slate-800">{med.name}</span>
                      <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-full shadow-sm">{med.duration}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No medications prescribed for this visit.</p>
              )}
            </div>

            {/* Personal Notes Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2 text-purple-600">
                <div className="flex items-center gap-2">
                  <StickyNote size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Patient Notes</h4>
                </div>
                <button 
                  onClick={() => onSaveNotes(appt.id, localNotes)}
                  className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  Save Notes
                </button>
              </div>
              <textarea 
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Add your own notes here (e.g., questions for the doctor, side effects)..."
                className="w-full min-h-[80px] text-sm text-slate-600 bg-slate-50/50 border-none rounded-lg p-2 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
              />
            </div>

            {/* Cancel Button - Only for upcoming appointments */}
            {appt.status === 'upcoming' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Are you sure you want to cancel this appointment?")) {
                      onCancel(appt.id);
                    }
                  }}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all active:scale-95"
                >
                  <XCircle size={18} />
                  Cancel Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentsView = ({ appointments, setAppointments }: { appointments: Appointment[], setAppointments: any }) => {
  const handleSaveNotes = (id: string, notes: string) => {
    setAppointments(appointments.map(a => a.id === id ? { ...a, visitNotes: notes } : a));
    alert("Visit notes saved.");
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-lg font-bold text-slate-800">Your Visits</h2>
        <span className="text-xs font-medium text-slate-400">{appointments.length} Appointments</span>
      </div>

      <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pb-10">
        {appointments.length === 0 && (
            <div className="text-center py-20 text-slate-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>No appointments scheduled.</p>
            </div>
        )}
        {appointments.map(appt => (
          <AppointmentCard key={appt.id} appt={appt} onSaveNotes={handleSaveNotes} onCancel={handleCancelAppointment} />
        ))}
      </div>
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
             className="flex-1 bg-slate-100 text-slate-900 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
           />
           <button onClick={handleSend} disabled={!input.trim() || loading} className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:scale-95 transition-all">
             <Send size={20} />
           </button>
         </div>
       </div>
    </div>
  );
};

// --- Profile Components ---

const ProfileField = ({ 
  icon: Icon, 
  label, 
  value, 
  isEditing, 
  onChange 
}: { 
  icon: any, 
  label: string, 
  value: string | number, 
  isEditing: boolean, 
  onChange?: (val: string) => void 
}) => (
  <div className="flex items-center justify-between p-4 bg-white border-b border-slate-50 last:border-none">
    <div className="flex items-center gap-3 w-full">
      <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        {isEditing && onChange ? (
          <input 
            className="text-sm font-semibold text-teal-600 bg-slate-50 px-2 py-1 rounded w-full outline-none focus:ring-1 focus:ring-teal-500 mt-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus={label === "Full Name"}
          />
        ) : (
          <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
        )}
      </div>
    </div>
    {!isEditing && <ChevronRight size={16} className="text-slate-300 shrink-0" />}
  </div>
);

// --- Notification Detail View ---

const NotificationDetailView = ({ notification, onBack }: { notification: Notification, onBack: () => void }) => {
  const Icon = notification.type === 'appointment' ? Calendar : 
               notification.type === 'medication' ? Pill : 
               notification.type === 'record' ? FileText : Bell;
  
  const iconColor = notification.type === 'appointment' ? 'text-blue-500 bg-blue-50' : 
                    notification.type === 'medication' ? 'text-teal-500 bg-teal-50' : 
                    notification.type === 'record' ? 'text-purple-500 bg-purple-50' : 'text-slate-500 bg-slate-50';

  return (
    <div className="p-4 animate-fadeIn">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-6 hover:text-teal-600 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
        <div className={`w-20 h-20 ${iconColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{notification.text}</h2>
        <p className="text-xs text-slate-400 font-medium mb-8 uppercase tracking-widest">{notification.time}</p>
        
        <div className="bg-slate-50 p-6 rounded-2xl text-slate-700 text-sm leading-relaxed text-left">
          <p className="mb-4 font-semibold text-slate-800">Details:</p>
          {notification.details}
        </div>

        <Button className="w-full mt-8" onClick={onBack}>
          Done
        </Button>
      </div>
    </div>
  );
};

// --- Payment Modal Component ---
const PaymentModal = ({ onClose, onPaymentSuccess }: { onClose: () => void, onPaymentSuccess: () => void }) => {
  const [step, setStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [method, setMethod] = useState<'card' | 'qr' | null>(null);

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {step === 'selection' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Premium Upgrade</h3>
              <button onClick={onClose}><X className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-8">Unlock AI Deep-Cleaning Analysis and priority 24/7 support with Kady.</p>
            
            <div className="space-y-4 mb-8">
              <button 
                onClick={() => setMethod('card')}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${method === 'card' ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-teal-200'}`}
              >
                <div className={`p-2 rounded-xl ${method === 'card' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Credit/Debit Card</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Visa • Mastercard</p>
                </div>
              </button>

              <button 
                onClick={() => setMethod('qr')}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${method === 'qr' ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-teal-200'}`}
              >
                <div className={`p-2 rounded-xl ${method === 'qr' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <QrCode size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">QR Code / UPI</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Fast & Secure</p>
                </div>
              </button>
            </div>

            {method === 'qr' && (
              <div className="mb-6 flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-fadeIn">
                <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-inner mb-2 border border-slate-100">
                  <QrCode size={112} className="text-slate-800" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold">SCAN TO PAY $29.99</p>
              </div>
            )}

            {method === 'card' && (
              <div className="mb-6 space-y-3 animate-fadeIn">
                <input type="text" placeholder="Card Number" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm" />
                <div className="flex gap-3">
                  <input type="text" placeholder="MM/YY" className="w-1/2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm" />
                  <input type="text" placeholder="CVC" className="w-1/2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm" />
                </div>
              </div>
            )}

            <Button className="w-full py-4 shadow-xl" disabled={!method} onClick={handlePay}>
              Complete Payment
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center animate-fadeIn text-center">
            <Loader2 size={48} className="animate-spin text-teal-500 mb-6" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Processing...</h3>
            <p className="text-sm text-slate-500">Contacting bank secure servers</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center animate-[bounce_0.5s_ease-in-out] text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100/50">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Success!</h3>
            <p className="text-sm text-slate-500">Premium Care is now active on your account.</p>
          </div>
        )}
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
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [dentalTip, setDentalTip] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  
  // App-specific features state
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile>(INITIAL_USER);

  // Auth states
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchTip = async () => {
      const tip = await getDentalTip();
      setDentalTip(tip);
    };
    fetchTip();
  }, []);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = reader.result as string;
        setUser({ ...user, profileImage: newImage });
        setEditUser(prev => ({ ...prev, profileImage: newImage }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: Notification) => {
    setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setSelectedNotification(notif);
    setView(ViewState.NOTIFICATION_DETAIL);
  };

  const handleBookSlot = (date: string, time: string, service: string) => {
    const newAppt: Appointment = {
      id: Math.random().toString(),
      doctorName: 'Dr. Faiz',
      treatmentType: service,
      date,
      time,
      status: 'upcoming',
      historySummary: "Pre-consultation intake completed. Waiting for doctor evaluation.",
      prescribedMedications: [],
      visitNotes: ""
    };
    setAppointments([...appointments, newAppt]);
    setView(ViewState.APPOINTMENTS);
    alert(`Appointment confirmed for ${date} at ${time}. See you then!`);
  };

  const handleDownloadNotifications = () => {
    const blob = new Blob([JSON.stringify(notifications, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notification-history.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Notification logs downloaded successfully.");
  };

  const startEditing = () => {
    setEditUser({ ...user });
    setIsEditingProfile(true);
  };

  const cancelEditing = () => {
    setIsEditingProfile(false);
  };

  const saveProfile = () => {
    setUser({ ...editUser });
    setIsEditingProfile(false);
    alert("Profile saved successfully!");
  };

  // Fake auth
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Hospital/Dental Visuals (Desktop Only) */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center p-12">
           <img 
            src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200" 
            className="absolute inset-0 w-full h-full object-cover opacity-50" 
            alt="Dental Office"
           />
           <div className="relative z-10 text-white max-w-md">
             <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-8 shadow-xl">
               <Pill size={32} />
             </div>
             <h1 className="text-5xl font-bold mb-6 leading-tight">Better Dental Care for a Brighter Smile.</h1>
             <p className="text-xl text-teal-100/80 mb-8">Manage appointments, medications, and medical records seamlessly with AI-powered support.</p>
             <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                   <h4 className="text-2xl font-bold">12k+</h4>
                   <p className="text-xs text-teal-200">Patients Trusted</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                   <h4 className="text-2xl font-bold">24/7</h4>
                   <p className="text-xs text-teal-200">AI Kady Support</p>
                </div>
             </div>
           </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-slate-50">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center mb-10 md:hidden">
              <div className="w-16 h-16 bg-teal-500 rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl shadow-teal-500/20">
                <Pill size={32} />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">Luminous</h1>
              <p className="text-slate-500">Dental Care Patient Portal</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 animate-[fadeIn_0.3s_ease-out]">
              <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              
              <div className="space-y-4">
                {isSignUp && (
                  <input type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 text-slate-900 rounded-xl outline-none border border-transparent focus:border-teal-500 focus:bg-white transition-all" />
                )}
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full p-4 bg-slate-50 text-slate-900 rounded-xl outline-none border border-transparent focus:border-teal-500 focus:bg-white transition-all" 
                />
                
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    className="w-full p-4 bg-slate-50 text-slate-900 rounded-xl outline-none border border-transparent focus:border-teal-500 focus:bg-white transition-all pr-12" 
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                    type="button"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {!isSignUp && (
                  <div className="flex justify-end">
                    <button className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <Button onClick={() => setIsLoggedIn(true)} className="w-full mt-8">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>

              <p className="text-center text-sm text-slate-500 mt-8">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowPassword(false);
                  }} 
                  className="text-teal-600 font-bold hover:underline transition-all"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-12">
              &copy; 2024 Luminous Dental Care. All rights reserved.
            </p>
          </div>
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
        return <DashboardView user={user} appointments={appointments} medications={medications} setView={setView} tip={dentalTip} />;
      case ViewState.BOOKING_CALENDAR:
        return <BookingCalendarView appointments={appointments} onBook={handleBookSlot} />;
      case ViewState.APPOINTMENTS: 
        return <AppointmentsView appointments={appointments} setAppointments={setAppointments} />;
      case ViewState.MEDICATIONS: 
        return <MedicationsView medications={medications} toggleMed={toggleMed} />;
      case ViewState.RECORDS: 
        return <RecordsView records={records} addRecord={addRecord} />;
      case ViewState.CHAT: 
        return <ChatView />;
      case ViewState.NOTIFICATION_DETAIL:
        return selectedNotification ? <NotificationDetailView notification={selectedNotification} onBack={() => setView(ViewState.DASHBOARD)} /> : null;
      case ViewState.TERMS:
        return (
          <div className="p-4 animate-fadeIn">
            <button onClick={() => setView(ViewState.PROFILE)} className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-6 hover:text-teal-600 transition-colors">
              <ArrowLeft size={18} /> Back
            </button>
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Terms of Service</h2>
              <div className="space-y-4 text-slate-600 text-sm leading-relaxed max-h-[60vh] overflow-y-auto no-scrollbar">
                <p className="font-bold">1. Acceptance of Terms</p>
                <p>By using Luminous Dental Care, you agree to comply with our terms of use. This app is designed for patient engagement and basic clinical tracking.</p>
                <p className="font-bold">2. Medical Disclaimer</p>
                <p>Kady AI is not a doctor. Information provided by the AI is for educational purposes only and should not replace professional medical advice.</p>
                <p className="font-bold">3. Data Privacy</p>
                <p>Your records and information are securely stored. We do not sell your personal health information to third parties.</p>
                <p className="font-bold">4. User Responsibility</p>
                <p>You are responsible for the accuracy of information entered for medication tracking and appointment scheduling.</p>
              </div>
              <Button className="w-full mt-8" onClick={() => setView(ViewState.PROFILE)}>I Understand</Button>
            </div>
          </div>
        );
      case ViewState.PROFILE: return (
        <div className="p-4 animate-fadeIn pb-32">
           <div className="bg-white rounded-[2rem] p-8 text-center border border-slate-100 mb-6 shadow-sm">
             <div className="relative inline-block group">
                <div 
                  onClick={() => profileImageInputRef.current?.click()}
                  className="w-28 h-28 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 text-4xl font-bold mx-auto mb-4 border-4 border-white shadow-lg cursor-pointer overflow-hidden transition-transform group-hover:scale-105"
                >
                  {(isEditingProfile ? editUser : user).profileImage ? (
                    <img src={(isEditingProfile ? editUser : user).profileImage} className="w-full h-full object-cover" alt="Profile" />
                  ) : (isEditingProfile ? editUser : user).name.charAt(0)}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={profileImageInputRef} 
                  className="hidden" 
                  onChange={handleProfileImageUpload} 
                  accept="image/*" 
                />
             </div>
             
             <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
             <button 
              onClick={() => {
                navigator.clipboard.writeText("#LC-9901");
                alert("Patient ID copied to clipboard!");
              }}
              className="text-teal-600 text-sm font-bold hover:bg-teal-50 px-3 py-1 rounded-full transition-colors active:scale-95 cursor-pointer"
             >
              Patient ID: #LC-9901
             </button>
             
             <div className="flex justify-center gap-3 mt-6">
               <Button variant="secondary" className="!py-2 !px-4 text-xs" onClick={() => setIsLoggedIn(false)}>
                 <LogOut size={14} /> Log Out
               </Button>
               <Button 
                variant={isPremium ? "secondary" : "primary"} 
                className={`!py-2 !px-4 text-xs ${isPremium ? 'border-teal-500 text-teal-600' : ''}`}
                onClick={() => setShowPaymentModal(true)}
               >
                 <UserCheck size={14} /> {isPremium ? 'Premium Active' : 'Premium Care'}
               </Button>
             </div>
           </div>
           
           <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Personal Information</h3>
             {!isEditingProfile ? (
               <button 
                onClick={startEditing}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 active:scale-95 transition-all"
               >
                 <Edit2 size={14} /> Edit
               </button>
             ) : (
               <div className="flex items-center gap-3">
                 <button 
                  onClick={cancelEditing}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                  onClick={saveProfile}
                  className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 active:scale-95 transition-all"
                 >
                   <Save size={14} /> Save
                 </button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <ProfileField 
               icon={User} 
               label="Full Name" 
               value={isEditingProfile ? editUser.name : user.name} 
               isEditing={isEditingProfile}
               onChange={(val) => setEditUser({...editUser, name: val})} 
             />
             <ProfileField 
               icon={Calendar} 
               label="Age" 
               value={isEditingProfile ? editUser.age : user.age} 
               isEditing={isEditingProfile}
               onChange={(val) => setEditUser({...editUser, age: val})} 
             />
             <ProfileField 
               icon={Phone} 
               label="Phone Number" 
               value={isEditingProfile ? editUser.phone : user.phone} 
               isEditing={isEditingProfile}
               onChange={(val) => setEditUser({...editUser, phone: val})} 
             />
             <ProfileField 
               icon={Mail} 
               label="Email Address" 
               value={isEditingProfile ? editUser.email : user.email} 
               isEditing={isEditingProfile}
               onChange={(val) => setEditUser({...editUser, email: val})} 
             />
           </div>

           <h3 className="font-bold text-slate-800 mt-6 mb-3 px-1 text-sm uppercase tracking-wider text-slate-400">Preferences</h3>
           <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <div className="p-4 flex justify-between items-center border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400"><Bell size={18} /></div>
                 <span className="text-sm font-semibold text-slate-900">Push Notifications</span>
               </div>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={handleDownloadNotifications}
                    className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-teal-50 hover:text-teal-600 transition-all active:scale-90"
                    title="Download Notification History"
                  >
                    <Download size={16} />
                  </button>
                  <div 
                    onClick={() => setIsPushEnabled(!isPushEnabled)}
                    className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${isPushEnabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 ${isPushEnabled ? 'right-1' : 'left-1'}`}></div>
                  </div>
               </div>
             </div>
             
             <button 
              onClick={() => setView(ViewState.TERMS)}
              className="w-full p-4 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors"
             >
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400"><FileText size={18} /></div>
                 <span className="text-sm font-semibold text-slate-900">Terms of Service</span>
               </div>
               <ChevronRight size={16} className="text-slate-300" />
             </button>

             <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
                  alert("Account deletion request submitted. Our team will contact you shortly.");
                }
              }}
              className="w-full p-4 flex justify-between items-center text-red-500 font-bold text-sm cursor-pointer hover:bg-red-50 transition-colors"
             >
               <span>Permanently Delete Account</span>
             </button>
           </div>
        </div>
      );
      default: return <div>Not Found</div>;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 flex flex-col relative shadow-2xl overflow-hidden md:border-x md:border-slate-200">
      {view !== ViewState.CHAT && (
        <Header 
          title={
            view === ViewState.NOTIFICATION_DETAIL ? "Notification" : 
            view === ViewState.TERMS ? "Policy" :
            view === ViewState.BOOKING_CALENDAR ? "Book Visit" :
            (view.charAt(0) + view.slice(1).toLowerCase())
          } 
          user={user} 
          setView={setView} 
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onNotificationClick={handleNotificationClick}
        />
      )}
      
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
         {renderView()}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-between items-center px-6 pb-6 pt-3 absolute bottom-0 w-full z-20 rounded-t-[2.5rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <NavItem active={view === ViewState.DASHBOARD || view === ViewState.BOOKING_CALENDAR} icon={LayoutDashboard} label="Home" onClick={() => setView(ViewState.DASHBOARD)} />
        <NavItem active={view === ViewState.APPOINTMENTS} icon={Calendar} label="Visits" onClick={() => setView(ViewState.APPOINTMENTS)} />
        
        {/* Floating Chat Button */}
        <div className="relative -top-10">
           <button 
             onClick={() => setView(ViewState.CHAT)}
             className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-teal-500/40 transition-all hover:scale-105 active:scale-95 ${
               view === ViewState.CHAT ? 'bg-slate-800 text-white' : 'bg-teal-500 text-white'
             }`}
           >
             <MessageCircle size={28} fill="currentColor" className="opacity-100" />
           </button>
        </div>

        <NavItem active={view === ViewState.MEDICATIONS} icon={Pill} label="Meds" onClick={() => setView(ViewState.MEDICATIONS)} />
        <NavItem active={view === ViewState.RECORDS} icon={FileText} label="Records" onClick={() => setView(ViewState.RECORDS)} />
      </nav>

      {showPaymentModal && (
        <PaymentModal 
          onClose={() => setShowPaymentModal(false)} 
          onPaymentSuccess={() => {
            setIsPremium(true);
            setShowPaymentModal(false);
          }} 
        />
      )}
    </div>
  );
}
