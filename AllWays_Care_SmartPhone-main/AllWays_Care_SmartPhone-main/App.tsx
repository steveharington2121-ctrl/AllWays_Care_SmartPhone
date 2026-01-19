
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import Dashboard from './features/Dashboard';
import Telemedicine from './features/Telemedicine';
import CommunityForum from './features/CommunityForum';
import WearableIntegration from './features/WearableIntegration';
import MedicineFinder from './features/MedicineFinder';
import MentalHealthSupport from './features/MentalHealthSupport';
import PersonalizedHealthPlan from './features/PersonalizedHealthPlan';
import PredictiveAnalytics from './features/PredictiveAnalytics';
import AIInsights from './features/AIInsights';
import GenomicAnalysis from './features/GenomicAnalysis';
import Favorites from './features/Favorites';
import Cart from './features/Cart';
import { VoiceControlProvider, useVoiceControl } from './context/VoiceControlContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { LiveAudioProvider, useLiveAudio } from './context/LiveAudioContext';
import { LiveVoiceInterface } from './components/LiveVoiceInterface';
import { VoiceControlButton } from './components/VoiceControlButton';
import { ChatAssistantButton } from './components/ChatAssistantButton';
import { ChatbotWidget } from './components/ChatbotWidget';
import { CommandToast } from './components/CommandToast';
import { NotificationBell } from './components/NotificationBell';
import { MedicationReminder } from './components/MedicationReminder';
import AIHealthAssistant from './features/AIHealthAssistant';
import ResourceFinder from './features/ResourceFinder';
import SymptomChecker from './features/SymptomChecker';
import AppointmentPrep from './features/AppointmentPrep';
import HealthRecords from './features/HealthRecords';
import QuickCommunicate from './features/QuickCommunicate';
import VitalsView from './features/vitals/VitalsView';
import MedicineIdentifier from './features/MedicineIdentifier';
import InclusiveBridge from './features/InclusiveBridge';
import type { View, FamilyMember } from './types';
import { EmergencyProvider, useEmergency } from './context/EmergencyContext';
import { EmergencySOSButton } from './components/EmergencySOSButton';
import EmergencyMode from './features/EmergencyMode';
import MedicationReminders from './features/MedicationReminders';
import AuthPage from './features/LoginPage';
import ProfilePage from './features/ProfilePage';
import AshaConnect from './features/AshaConnect';
import MedicalCamps from './features/MedicalCamps';
import FamilyHub from './features/FamilyHub';
import HealthSchemes from './features/HealthSchemes';
import { create as createStore } from 'zustand';
import { speak } from './utils/tts';
import { useGlobalVoiceCommands } from './hooks/useGlobalVoiceCommands';
import { useCart } from './hooks/useCart';
import { useMedicationReminders } from './hooks/useMedicationReminders';

const FAMILY_MEMBERS_KEY = 'allwayscare-family-members';
const USER_TOKEN_KEY = 'allwayscare-user-token';

interface FamilyState {
    members: FamilyMember[];
    selectedMemberId: string;
    hydrated: boolean;
    actions: {
        hydrate: () => void;
        addMember: (member: Omit<FamilyMember, 'id'>) => void;
        removeMember: (id: string) => void;
        selectMember: (id: string) => void;
        getSelectedMember: (currentUserProfile: FamilyMember) => FamilyMember;
    };
}
export const useFamilyStore = createStore<FamilyState>((set, get) => ({
    members: [],
    selectedMemberId: 'currentUser',
    hydrated: false,
    actions: {
        hydrate: () => {
            const stored = localStorage.getItem(FAMILY_MEMBERS_KEY);
            if (stored) set({ members: JSON.parse(stored), hydrated: true });
            else set({ hydrated: true });
        },
        addMember: (member) => {
            const newMembers = [...get().members, { ...member, id: new Date().toISOString() }];
            localStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(newMembers));
            set({ members: newMembers });
        },
        removeMember: (id) => {
            const newMembers = get().members.filter(m => m.id !== id);
            localStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(newMembers));
            set({ members: newMembers });
        },
        selectMember: (id) => set({ selectedMemberId: id }),
        getSelectedMember: (currentUser) => {
            const state = get();
            return state.selectedMemberId === 'currentUser' ? currentUser : state.members.find(m => m.id === state.selectedMemberId) || currentUser;
        }
    }
}));

const VisualNotificationsOverlay: React.FC = () => {
    const { notifications } = useNotifications();
    const { settings } = useAccessibility();
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const unreadUrgent = notifications.some(n => !n.read && (n.type === 'alert' || n.type === 'medication'));
        if (unreadUrgent && settings.visualCuesMode) {
            setIsUrgent(true);
            const timer = setTimeout(() => setIsUrgent(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [notifications, settings.visualCuesMode]);

    if (!isUrgent) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-[110] border-[24px] border-red-500 animate-pulse bg-red-500/10" />
    );
};

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem(USER_TOKEN_KEY));
    
    const handleLogin = () => setIsLoggedIn(true);
    const handleLogout = () => {
        localStorage.removeItem(USER_TOKEN_KEY);
        setIsLoggedIn(false);
    };

    return (
        <LanguageProvider>
            <AccessibilityProvider>
                <NotificationProvider>
                    <EmergencyProvider>
                        <VoiceControlProvider>
                            {!isLoggedIn ? (
                                <AuthPage onLoginSuccess={handleLogin} />
                            ) : (
                                <AppContentWrapper onLogout={handleLogout} />
                            )}
                        </VoiceControlProvider>
                    </EmergencyProvider>
                </NotificationProvider>
            </AccessibilityProvider>
        </LanguageProvider>
    );
};

const AppContentWrapper: React.FC<{onLogout: () => void}> = ({ onLogout }) => {
    const [activeView, setActiveView] = useState<View>('dashboard');
    const { addToCart } = useCart();
    const { addReminder } = useMedicationReminders();
    const { startEmergency } = useEmergency();
    const { t } = useLanguage();
    const { actions: familyActions } = useFamilyStore();
    
    const voiceActions = useMemo(() => ({
        onNavigate: (view: View) => setActiveView(view),
        onAddToCart: (name: string, qty: number) => {
            const currentUserProfile: FamilyMember = { id: 'currentUser', name: 'Me', relationship: 'Me', age: '', avatar: '👤' };
            const selected = familyActions.getSelectedMember(currentUserProfile);
            addToCart({ name, price: 15.00, description: 'Added via Voice Assistant', requiresPrescription: false }, qty, { id: selected.id, name: selected.name });
        },
        onAddReminder: (medicineName: string, time: string, dosage: string) => {
            const currentUserProfile: FamilyMember = { id: 'currentUser', name: 'Me', relationship: 'Me', age: '', avatar: '👤' };
            const selected = familyActions.getSelectedMember(currentUserProfile);
            addReminder({ patientName: selected.name, medicineName, dosage, time });
        },
        onTriggerEmergency: () => {
            startEmergency();
            setActiveView('emergency-mode');
        }
    }), [addToCart, addReminder, startEmergency, familyActions]);

    return (
        <LiveAudioProvider actions={voiceActions}>
            <AppInner 
                activeView={activeView} 
                setActiveView={setActiveView} 
                onLogout={onLogout} 
            />
        </LiveAudioProvider>
    );
};

const AppInner: React.FC<{activeView: View, setActiveView: (v: View) => void, onLogout: () => void}> = ({ activeView, setActiveView, onLogout }) => {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isChatWidgetOpen, setChatWidgetOpen] = useState(false);
    const { speechCode, t } = useLanguage();
    const { settings, updateSettings } = useAccessibility();
    const { actions: familyActions } = useFamilyStore();
    const { isLiveActive, startLiveSession, stopLiveSession } = useLiveAudio();
    const { setToastMessage, isListening, setIsListening, setProcessingCommand } = useVoiceControl();

    const { toggleListening } = useGlobalVoiceCommands({
        setActiveView,
        setToastMessage,
        isListening,
        setIsListening,
        setProcessingCommand,
    });
    
    useEffect(() => { familyActions.hydrate(); }, [familyActions]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'v' || e.key === 'V') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                if (isLiveActive) stopLiveSession();
                else startLiveSession();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLiveActive, startLiveSession, stopLiveSession]);

    useEffect(() => {
        if (!isLiveActive && settings.persona === 'blind') {
            const pageName = t(`sidebar.${activeView.replace(/-/g, '')}`) || activeView;
            speak(`Opening ${pageName}`, speechCode);
        }
    }, [activeView, speechCode, isLiveActive, settings.persona, t]);

    const renderView = () => {
        const lowData = settings.lowBandwidthMode;
        switch (activeView) {
          case 'dashboard': return <Dashboard setActiveView={setActiveView} />;
          case 'ai-assistant': return <AIHealthAssistant setActiveView={setActiveView} isLowConnectivity={lowData} />;
          case 'telemedicine': return <Telemedicine onClose={() => setActiveView('dashboard')} />;
          case 'price-comparison': return <MedicineFinder setActiveView={setActiveView} isLowConnectivity={lowData} />;
          case 'inclusive-bridge': return <InclusiveBridge />;
          case 'resource-finder': return <ResourceFinder />;
          case 'symptom-checker': return <SymptomChecker />;
          case 'medication-reminders': return <MedicationReminders />;
          case 'profile': return <ProfilePage />;
          case 'asha-connect': return <AshaConnect />;
          case 'medical-camps': return <MedicalCamps />;
          case 'health-schemes': return <HealthSchemes />;
          case 'health-records': return <HealthRecords />;
          case 'health-plan': return <PersonalizedHealthPlan isLowConnectivity={lowData} />;
          case 'predictive-analytics': return <PredictiveAnalytics isLowConnectivity={lowData} />;
          case 'vitals': return <VitalsView />;
          case 'medicine-identifier': return <MedicineIdentifier />;
          case 'forum': return <CommunityForum />;
          case 'genomic-analysis': return <GenomicAnalysis />;
          case 'ai-insights': return <AIInsights />;
          case 'family-hub': return <FamilyHub setActiveView={setActiveView} />;
          case 'favorites': return <Favorites isLowConnectivity={lowData} />;
          case 'cart': return <Cart />;
          default: return <Dashboard setActiveView={setActiveView} />;
        }
    };

    return (
        <div className={`flex h-screen font-sans overflow-hidden ${settings.largeTextMode ? 'text-lg' : ''}`}>
            <VisualNotificationsOverlay />
            <LiveVoiceInterface />
            <ChatbotWidget isOpen={isChatWidgetOpen} onClose={() => setChatWidgetOpen(false)} />
            <Sidebar activeView={activeView} setActiveView={setActiveView} isMobileOpen={isMobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} onLogout={onLogout} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
                
                {settings.lowBandwidthMode && (
                    <div className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 px-4 shadow-inner">
                        Rural Mode: Assets hidden to save data
                    </div>
                )}

                <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto bg-slate-50">
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex gap-4">
                        <button 
                            onClick={() => updateSettings({ lowBandwidthMode: !settings.lowBandwidthMode })}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${
                                settings.lowBandwidthMode ? 'bg-orange-500 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'
                            }`}
                        >
                            {settings.lowBandwidthMode ? '📶 Data Saver ON' : '📶 High Data'}
                        </button>
                        <NotificationBell />
                    </div>
                    {renderView()}
                </main>
            </div>
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-4">
                <EmergencySOSButton setActiveView={setActiveView} />
                <VoiceControlButton toggleListening={() => isLiveActive ? stopLiveSession() : startLiveSession()} />
                <ChatAssistantButton isOpen={isChatWidgetOpen} onClick={() => setChatWidgetOpen(!isChatWidgetOpen)} />
            </div>
            <CommandToast />
            <MedicationReminder />
        </div>
    );
};

export default App;
