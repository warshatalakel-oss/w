import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, BookUser, Home, Printer, BarChart, ClipboardList, Archive, User, LogOut, Eye, ChevronsRight, ChevronsLeft, BookCopy, LayoutGrid, ClipboardCheck, Info, Presentation, Brush, Mail, BookMarked, BookText, FileText, PlayCircle, X, Users, CalendarClock, Bell, ClipboardPaste } from 'lucide-react';
import type { SchoolSettings, ClassData, User as CurrentUser, Teacher } from './types.ts';
import { DEFAULT_SCHOOL_SETTINGS } from './constants.ts';
import { db } from './lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';

import Settings from './components/Settings.tsx';
import ClassManager from './components/ClassManager.tsx';
// import GradeSheet from './components/GradeSheet.tsx'; // Temporarily disabled due to missing gradeCalculator.ts
// import ExportManager from './components/ExportManager.tsx'; // Temporarily disabled due to missing gradeCalculator.ts
// import StatisticsManager from './components/StatisticsManager.tsx'; // Temporarily disabled
// import TeacherLogExporter from './components/TeacherLogExporter.tsx'; // Temporarily disabled
// import AdminLogExporter from './components/AdminLogExporter.tsx'; // Temporarily disabled due to missing gradeCalculator.ts
import PrincipalDashboard from './components/principal/PrincipalDashboard.tsx';
// import ReceiveTeacherLog from './components/principal/ReceiveTeacherLog.tsx'; // Temporarily disabled
import TeacherGradeSheet from './components/teacher/TeacherGradeSheet.tsx';
// import ElectronicLogbookGenerator from './components/principal/ElectronicLogbookGenerator.tsx'; // Temporarily disabled due to missing LogbookFormPage
// import GradeBoardExporter from './components/principal/GradeBoardExporter.tsx'; // Temporarily disabled due to module loading errors
import OralExamListsExporter from './components/principal/OralExamListsExporter.tsx';
// import PromotionLog from './components/principal/PromotionLog.tsx'; // Temporarily disabled, component missing
import AboutModal from './components/AboutModal.tsx';
import ExamHallsManager from './components/principal/ExamHallsManager.tsx';
import CoverEditor from './components/principal/CoverEditor.tsx';
import ExamCardsExporter from './components/principal/ExamCardsExporter.tsx';
import AdministrativeCorrespondence from './components/principal/AdministrativeCorrespondence.tsx';
// import PrimaryLogExporter from './components/principal/PrimaryLogExporter.tsx'; // Temporarily disabled
// import AbsenceManager from './components/principal/AbsenceManager.tsx'; // Temporarily disabled
import SchoolArchive from './components/principal/SchoolArchive.tsx';
// import ExamControlLog from './components/principal/ExamControlLog.tsx'; // Temporarily disabled
// import ParentInvitationExporter from './components/principal/ParentInvitationExporter.tsx'; // Temporarily disabled


type View = 'home' | 'settings' | 'class_manager' | 'grade_sheet' | 'export_results' | 'statistics' | 'teacher_log_exporter' | 'admin_log_exporter' | 'principal_dashboard' | 'receive_teacher_logs' | 'electronic_logbook' | 'grade_board' | 'oral_exam_lists' | 'promotion_log' | 'exam_halls' | 'cover_editor' | 'exam_cards' | 'exam_control_log' | 'administrative_correspondence' | 'primary_school_log' | 'school_archive' | 'absence_manager' | 'parent_invitations';

interface NavItem {
    view: View;
    icon: React.ElementType;
    label: string;
    classId?: string;
    badgeCount?: number;
}

interface NavButtonProps {
    item: NavItem;
    isCollapsed: boolean;
    onClick: () => void;
    isActive: boolean;
    disabled?: boolean;
}

interface MainAppProps {
    currentUser: CurrentUser;
    onLogout: () => void;
    users: CurrentUser[];
    addUser: (user: Omit<CurrentUser, 'id'>) => CurrentUser;
    updateUser: (userId: string, updater: (user: CurrentUser) => CurrentUser) => void;
    deleteUser: (userId: string) => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isCollapsed, onClick, isActive, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors relative ${isActive ? 'bg-cyan-600 text-white shadow-inner' : 'hover:bg-gray-700'} ${isCollapsed ? 'justify-center' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isCollapsed ? item.label : ''}
    >
        <item.icon size={20} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {item.badgeCount && item.badgeCount > 0 && !isCollapsed ? (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{item.badgeCount}</span>
        ) : null}
    </button>
);

const UnderMaintenance = ({ featureName }: { featureName: string }) => (
    <div className="text-center p-8 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center h-full">
        <SettingsIcon className="w-16 h-16 text-yellow-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-800">ميزة "{featureName}" قيد الصيانة</h2>
        <p className="mt-2 text-gray-600 max-w-md">نعمل حالياً على إصلاح هذه الميزة وستعود للعمل قريباً. شكراً لتفهمكم وصبركم.</p>
    </div>
);


export default function MainApp({ currentUser, onLogout, users, addUser, updateUser, deleteUser }: MainAppProps): React.ReactNode {
    const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [activeView, setActiveView] = useState<View>('home');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    
    const isPrincipal = currentUser.role === 'principal';
    const isTeacher = currentUser.role === 'teacher';
    const migrationCheckRan = useRef(false);


    const createDefaultSettingsForPrincipal = (principal: CurrentUser): SchoolSettings => {
        return {
            schoolName: principal.schoolName || '',
            principalName: principal.name,
            academicYear: "2025-2026",
            directorate: '',
            supplementarySubjectsCount: 3,
            decisionPoints: 5,
            principalPhone: '',
            schoolType: 'نهاري',
            schoolGender: 'بنين',
            schoolLevel: currentUser.schoolLevel || 'متوسطة',
            governorateCode: '',
            schoolCode: '',
            governorateName: 'بغداد',
            district: '',
            subdistrict: '',
        };
    };

    useEffect(() => {
        let settingsPath: string | null = null;
        const principalId = isTeacher ? (currentUser as Teacher).principalId : currentUser.id;

        if (isPrincipal || (isTeacher && principalId)) {
            settingsPath = `settings/${principalId}`;
        }

        let settingsRef: any; 
        let settingsCallback: any;

        if (settingsPath) {
            settingsRef = db.ref(settingsPath);
            settingsCallback = (snapshot: any) => { 
                const data = snapshot.val();
                if (data) {
                    setSettings(data);
                } else if (isPrincipal) {
                    const defaultSettings = createDefaultSettingsForPrincipal(currentUser);
                    setSettings(defaultSettings);
                    settingsRef.set(defaultSettings);
                } else {
                    setSettings(DEFAULT_SCHOOL_SETTINGS);
                }
            };
            settingsRef.on('value', settingsCallback);
        } else {
            setSettings(DEFAULT_SCHOOL_SETTINGS);
        }

        const classesRef = db.ref('classes');
        const classesCallback = (snapshot: any) => { 
            const data = snapshot.val();
            setClasses(data ? Object.values(data) : []);
        };
        classesRef.on('value', classesCallback);

        return () => {
            if (settingsRef && settingsCallback) {
                settingsRef.off('value', settingsCallback);
            }
            classesRef.off('value', classesCallback);
        };
    }, [currentUser, isPrincipal, isTeacher]);

    useEffect(() => {
        const runMigration = async () => {
            if (!isPrincipal || classes.length === 0 || users.length === 0) return;
    
            const targetStages = ['الاول متوسط', 'الثاني متوسط', 'الثالث متوسط'];
            const classesToMigrate = classes.filter(c => 
                targetStages.includes(c.stage) && !c.subjects_migrated_v1
            );
    
            if (classesToMigrate.length === 0) return;
    
            const principalTeachers = users.filter(u => u.role === 'teacher' && u.principalId === currentUser.id);
            const updates: Record<string, any> = {};
    
            for (const classData of classesToMigrate) {
                let subjects = [...(classData.subjects || [])];
                let classNeedsUpdate = false;
    
                const oldAr1 = subjects.find(s => s.name === 'اللغة العربية الجزء الاول');
                const oldAr2 = subjects.find(s => s.name === 'اللغة العربية الجزء الثاني');
                const oldEn1 = subjects.find(s => s.name === 'اللغة الإنكليزية كتاب الطالب');
                const oldEn2 = subjects.find(s => s.name === 'اللغة الإنكليزية كتاب النشاط');
                
                let newArabicSub = subjects.find(s => s.name === 'اللغة العربية');
                if (!newArabicSub && (oldAr1 || oldAr2)) {
                    newArabicSub = { id: uuidv4(), name: 'اللغة العربية' };
                    subjects.push(newArabicSub);
                    classNeedsUpdate = true;
                }
    
                let newEnglishSub = subjects.find(s => s.name === 'اللغة الإنكليزية');
                if (!newEnglishSub && (oldEn1 || oldEn2)) {
                    newEnglishSub = { id: uuidv4(), name: 'اللغة الإنكليزية' };
                    subjects.push(newEnglishSub);
                    classNeedsUpdate = true;
                }
    
                if (classNeedsUpdate) {
                    updates[`/classes/${classData.id}/subjects_migrated_v1`] = true;
                    updates[`/classes/${classData.id}/subjects`] = subjects.filter(s => ![
                        'اللغة العربية الجزء الاول', 'اللغة العربية الجزء الثاني',
                        'اللغة الإنكليزية كتاب الطالب', 'اللغة الإنكليزية كتاب النشاط'
                    ].includes(s.name));
    
                    for (const teacher of principalTeachers) {
                        let assignmentsChanged = false;
                        let newAssignments = [...(teacher.assignments || [])];
    
                        const hasOldArabic = newAssignments.some(a => a.classId === classData.id && (a.subjectId === oldAr1?.id || a.subjectId === oldAr2?.id));
                        if (newArabicSub && hasOldArabic) {
                            assignmentsChanged = true;
                            newAssignments = newAssignments.filter(a => !(a.classId === classData.id && (a.subjectId === oldAr1?.id || a.subjectId === oldAr2?.id)));
                            if (!newAssignments.some(a => a.classId === classData.id && a.subjectId === newArabicSub!.id)) {
                                 newAssignments.push({ classId: classData.id, subjectId: newArabicSub.id });
                            }
                        }
    
                        const hasOldEnglish = newAssignments.some(a => a.classId === classData.id && (a.subjectId === oldEn1?.id || a.subjectId === oldEn2?.id));
                        if (newEnglishSub && hasOldEnglish) {
                            assignmentsChanged = true;
                            newAssignments = newAssignments.filter(a => !(a.classId === classData.id && (a.subjectId === oldEn1?.id || a.subjectId === oldEn2?.id)));
                             if (!newAssignments.some(a => a.classId === classData.id && a.subjectId === newEnglishSub!.id)) {
                                 newAssignments.push({ classId: classData.id, subjectId: newEnglishSub.id });
                            }
                        }
    
                        if (assignmentsChanged) {
                            updates[`/users/${teacher.id}/assignments`] = newAssignments;
                        }
                    }
                }
            }
            
            if (Object.keys(updates).length > 0) {
                try {
                    await db.ref().update(updates);
                    alert('تم تحديث هيكل المواد الدراسية وتعيينات المدرسين تلقائياً. سيتم تحديث الصفحة.');
                    window.location.reload();
                } catch (e) {
                    console.error("Migration failed:", e);
                    alert('فشل تحديث بيانات المواد الدراسية.');
                }
            }
        };
        
        if (!migrationCheckRan.current && classes.length > 0 && users.length > 0) {
            runMigration();
            migrationCheckRan.current = true;
        }
    }, [classes, users, isPrincipal, currentUser.id]);

    const effectiveSettings = useMemo(() => {
        if (isPrincipal) {
            return {
                ...settings,
                schoolName: currentUser.schoolName || settings.schoolName || 'لم يتم تحديد اسم المدرسة',
                principalName: currentUser.name,
                schoolLevel: currentUser.schoolLevel || settings.schoolLevel,
            };
        }
        if (isTeacher) {
            const principal = users.find(u => u.id === (currentUser as Teacher).principalId);
            return {
                ...settings,
                schoolName: principal?.schoolName || settings.schoolName || 'لم يتم تحديد اسم المدرسة',
                principalName: principal?.name || settings.principalName,
                schoolLevel: principal?.schoolLevel || settings.schoolLevel,
            };
        }
        return settings;
    }, [settings, currentUser, isPrincipal, isTeacher, users]);

    const handleSelectClass = (classId: string) => {
        setSelectedClassId(classId);
        setActiveView('grade_sheet');
    };

    const handleSaveSettings = (newSettings: SchoolSettings) => {
        if (isPrincipal) {
            db.ref(`settings/${currentUser.id}`).set(newSettings);
            alert('تم حفظ الإعدادات بنجاح!');
            setActiveView('home');
        }
    };

    const selectedClass = useMemo(() => {
        if (!selectedClassId) return null;
        return classes.find(c => c.id === selectedClassId) || null;
    }, [classes, selectedClassId]);

    const correspondenceNavItems: NavItem[] = [
        { view: 'administrative_correspondence', icon: FileText, label: 'مخاطبات ادارية' },
        // { view: 'parent_invitations', icon: Mail, label: 'دعوات أولياء الأمور' }, // Temporarily disabled
    ];

    const reportNavItems: NavItem[] = [
        // { view: 'export_results', icon: Printer, label: 'النتائج الامتحانية' }, // Temporarily disabled
        // { view: 'statistics', icon: BarChart, label: 'التقارير والإحصاءات' }, // Temporarily disabled
        // { view: 'teacher_log_exporter', icon: ClipboardList, label: 'سجل المدرس' }, // Temporarily disabled
        // { view: 'admin_log_exporter', icon: Archive, label: 'السجل العام' }, // Temporarily disabled
        { view: 'primary_school_log', icon: BookText, label: 'درجات الابتدائية' },
    ];
    
    const examRecordsNavItems: NavItem[] = [
        { view: 'grade_board', icon: LayoutGrid, label: 'بورد الدرجات' },
        { view: 'oral_exam_lists', icon: ClipboardCheck, label: 'قوائم الشفوي' },
        { view: 'exam_cards', icon: BookMarked, label: 'بطاقات امتحانية' },
        { view: 'exam_halls', icon: Presentation, label: 'قاعات امتحانية' },
        { view: 'cover_editor', icon: Brush, label: 'محرر الأغلفة' },
    ];

    const teacherNavItems: NavItem[] = useMemo(() => {
        if (!isTeacher) return [];
        const assignments = (currentUser as Teacher).assignments || [];
        return assignments.map((assignment): NavItem | null => {
            const assignedClass = classes.find(c => c.id === assignment.classId);
            if (!assignedClass) return null;

            const assignedSubject = assignedClass.subjects.find(s => s.id === assignment.subjectId);
            if (!assignedSubject) return null;

            return {
                view: 'grade_sheet',
                icon: Eye,
                label: `${assignedClass.stage} / ${assignedClass.section} - ${assignedSubject.name}`,
                classId: assignedClass.id,
            };
        }).filter((item): item is NavItem => item !== null);
    }, [classes, currentUser, isTeacher]);


    const renderView = () => {
        // Teacher Views
        if (isTeacher) {
            switch(activeView) {
                case 'settings':
                    return <Settings currentSettings={effectiveSettings} onSave={handleSaveSettings} currentUser={currentUser} updateUser={updateUser} />;
                case 'home':
                case 'grade_sheet':
                    const classForSheet = selectedClassId 
                        ? classes.find(c => c.id === selectedClassId)
                        : classes.find(c => c.id === teacherNavItems[0]?.classId);
                    
                    if (classForSheet) {
                        return <TeacherGradeSheet classData={classForSheet} teacher={currentUser as Teacher} settings={effectiveSettings} />;
                    }
                    return (
                        <div className="text-center p-8 bg-white rounded-lg shadow">
                            <h2 className="text-2xl font-bold">أهلاً بك، {currentUser.name}</h2>
                            <p className="mt-2 text-gray-600">اختر أحد صفوفك من القائمة الجانبية للبدء في إدخال الدرجات. لم يتم تعيين أي صفوف لك بعد.</p>
                        </div>
                    );
                default:
                     return <div>Teacher view not found</div>
            }
        }

        // Principal Views
        if (isPrincipal) {
            const principalClasses = classes.filter(c => c.principalId === currentUser.id);
            switch (activeView) {
                case 'home':
                case 'class_manager':
                    return <ClassManager classes={principalClasses} onSelectClass={handleSelectClass} currentUser={currentUser} />;
                case 'settings':
                    return <Settings currentSettings={effectiveSettings} onSave={handleSaveSettings} currentUser={currentUser} updateUser={updateUser} />;
                case 'grade_sheet':
                    return <UnderMaintenance featureName="سجل الدرجات" />;
                case 'administrative_correspondence':
                    return <AdministrativeCorrespondence />;
                // case 'parent_invitations': // Temporarily disabled
                //     return <ParentInvitationExporter classes={principalClasses} settings={effectiveSettings} />;
                case 'export_results':
                     return <UnderMaintenance featureName="تصدير النتائج" />;
                // case 'statistics': // Temporarily disabled
                //     return <StatisticsManager classes={principalClasses} settings={effectiveSettings} />;
                // case 'teacher_log_exporter': // Temporarily disabled
                //     return <TeacherLogExporter classes={principalClasses} settings={effectiveSettings} />;
                case 'admin_log_exporter':
                    return <UnderMaintenance featureName="السجل العام" />;
                case 'primary_school_log':
                    return <UnderMaintenance featureName="درجات الابتدائية" />;
                case 'principal_dashboard':
                    return <PrincipalDashboard principal={currentUser} classes={principalClasses} users={users} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} />;
                case 'absence_manager':
                    return <UnderMaintenance featureName="إدارة الغيابات" />;
                // case 'receive_teacher_logs': // Temporarily disabled
                //     return <ReceiveTeacherLog principal={currentUser} classes={principalClasses} settings={effectiveSettings} />;
                case 'electronic_logbook':
                    return <UnderMaintenance featureName="الدفتر الالكتروني" />;
                case 'promotion_log':
                    return <UnderMaintenance featureName="سجل الترحيل" />;
                case 'grade_board':
                    return <UnderMaintenance featureName="بورد الدرجات" />;
                case 'oral_exam_lists':
                    return <OralExamListsExporter classes={principalClasses} settings={effectiveSettings} />;
                case 'exam_cards':
                    return <ExamCardsExporter settings={effectiveSettings} />;
                case 'exam_halls':
                    return <ExamHallsManager />;
                case 'cover_editor':
                    return <CoverEditor />;
                case 'exam_control_log':
                    return <UnderMaintenance featureName="سجل السيطرة الامتحانية" />;
                case 'school_archive':
                    return <SchoolArchive />;
                default:
                    return <ClassManager classes={principalClasses} onSelectClass={handleSelectClass} currentUser={currentUser} />;
            }
        }
        
        return <div>Unexpected user role.</div>;
    };

    const navForPrincipal: NavItem[] = [
        { view: 'home', icon: Home, label: 'الرئيسية / الشعب' },
        { view: 'principal_dashboard', icon: User, label: 'إدارة المدرسين' },
        { view: 'absence_manager', icon: CalendarClock, label: 'إدارة الغيابات' },
        // { view: 'electronic_logbook', icon: BookCopy, label: 'الدفتر الالكتروني' }, // Temporarily disabled
        { view: 'school_archive', icon: Archive, label: 'ارشيف المدرسة' },
        { view: 'exam_control_log', icon: BookText, label: 'سجل السيطرة الامتحانية' },
        // { view: 'promotion_log', icon: ClipboardList, label: 'سجل الترحيل' }, // Temporarily disabled
        // { view: 'receive_teacher_logs', icon: ClipboardPaste, label: 'السجلات المستلمة' }, // Temporarily disabled
    ];
    
    const showAboutButton = (isPrincipal && (activeView === 'home' || activeView === 'class_manager')) || 
                           (isTeacher && (activeView === 'home' || activeView === 'grade_sheet'));

    const handleNavClick = (view: View, classId?: string) => {
        setActiveView(view);
        if (classId) {
            handleSelectClass(classId);
        } else {
             setSelectedClassId(null);
        }
    };

    const getRoleName = (role: string) => {
        if (role === 'principal') return 'مدير';
        if (role === 'teacher') return 'مدرس';
        return role;
    };


    return (
        <div className="flex h-screen bg-gray-200" dir="rtl">
            <div className={`bg-gray-800 text-white flex flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className="flex items-center justify-center p-4 border-b border-gray-700 h-16 flex-shrink-0">
                    {!isSidebarCollapsed && <span className="font-bold text-xl whitespace-nowrap">لوحة التحكم</span>}
                </div>

                <div className="flex-1 flex flex-col overflow-y-auto">
                    <nav className="px-2 py-4 space-y-1">
                        {isPrincipal && (
                            <>
                                {navForPrincipal.map(item => <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view}/>)}
                                
                                 <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>دعوات ومراسلات</h3>
                                    {correspondenceNavItems.map(item => <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view}/>)}
                                </div>

                                <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>سجلات امتحانية</h3>
                                    {examRecordsNavItems.map(item => <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view}/>)}
                                </div>

                                <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>التقارير</h3>
                                    {reportNavItems.map(item => {
                                        let isDisabled = false;
                                        if (item.view === 'admin_log_exporter') {
                                            isDisabled = effectiveSettings.schoolLevel === 'ابتدائية';
                                        }
                                        if (item.view === 'primary_school_log') {
                                            isDisabled = effectiveSettings.schoolLevel !== 'ابتدائية';
                                        }
                                        return <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view} disabled={isDisabled} />
                                    })}
                                </div>
                            </>
                        )}
                        
                        {isTeacher && (
                             <div className="space-y-1">
                                <NavButton item={{view: 'home', icon: Home, label: 'الرئيسية'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('home')} isActive={activeView === 'home' && !selectedClassId}/>
                                <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>صفوفي</h3>
                                    {teacherNavItems.map(item => <NavButton key={item.label} item={item} isCollapsed={isSidebarCollapsed} onClick={() => item.classId && handleNavClick(item.view, item.classId)} isActive={selectedClassId === item.classId} />)}
                                </div>
                             </div>
                        )}

                        <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                             <NavButton item={{view: 'settings', icon: SettingsIcon, label: 'الإعدادات'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('settings')} isActive={activeView === 'settings'}/>
                        </div>

                    </nav>

                    <div className="mt-auto"></div>

                    <div className="p-4 border-t border-gray-700">
                        <button onClick={onLogout} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg hover:bg-red-700 bg-red-600/80 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? "تسجيل الخروج" : ''}>
                            <LogOut size={20} />
                            {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                        </button>
                    </div>
                </div>

                 <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute top-16 -left-5 transform bg-green-600 text-white p-2 rounded-full z-10 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white shadow-lg">
                    {isSidebarCollapsed ? <ChevronsLeft size={24} /> : <ChevronsRight size={24} />}
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm p-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">{currentUser.name} ({getRoleName(currentUser.role)})</h1>
                            <p className="text-sm text-gray-500">{effectiveSettings.schoolName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a href="https://www.instagram.com/trbawetk/?utm_source=qr&igsh=MXNoNTNmdDRncnNjag%3D%3D#" target="_blank" rel="noopener noreferrer" title="تابعنا على انستغرام" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <img src="https://i.imgur.com/J6SeeNQ.png" alt="Instagram logo" className="w-8 h-8" />
                        </a>
                        <a href="https://www.facebook.com/profile.php?id=61578356680977" target="_blank" rel="noopener noreferrer" title="تابعنا على فيسبوك" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <img src="https://i.imgur.com/zC26Bw6.png" alt="Facebook logo" className="w-8 h-8" />
                        </a>
                        {isPrincipal && (
                            <a href="https://t.me/trbwetk" target="_blank" rel="noopener noreferrer" title="انضم الى كروب المناقشات" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <img src="https://i.imgur.com/YsOAIfV.png" alt="Telegram logo" className="w-8 h-8" />
                            </a>
                        )}
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 sm:p-6 lg:p-8">
                    {showAboutButton && (
                         <div className="mb-6 space-y-4">
                             <button 
                                onClick={() => setIsVideoModalOpen(true)}
                                className="w-full flex items-center gap-4 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-300 hover:shadow-md text-red-700"
                            >
                                <PlayCircle className="w-12 h-12" />
                                <div>
                                    <h4 className="font-bold text-red-800">شاهد العرض التوضيحي</h4>
                                    <p className="text-sm text-red-600">تعرف على إمكانيات الحقيبة الرقمية في دقيقتين.</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => setIsAboutModalOpen(true)}
                                className="w-full text-center p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                <Info size={28} />
                                <span>تعرف من نحن</span>
                            </button>
                        </div>
                    )}
                    {renderView()}
                </main>
            </div>
             {isVideoModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsVideoModalOpen(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsVideoModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> 
                            <iframe 
                                className="absolute top-0 left-0 w-full h-full"
                                src="https://www.youtube.com/embed/Pi35fNJIx08?autoplay=1"
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </div>
    );
}