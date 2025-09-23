import { useState, useCallback, useEffect } from 'react';
import type { User } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';
import { db, auth } from '../lib/firebase.ts';

const PRINCIPAL_USER: User = {
    id: 'principal_al_hamza',
    role: 'principal',
    name: 'تحسين هارون مهدي حمد',
    schoolName: 'متوسطة الحمزة للبنين',
    schoolLevel: 'متوسطة',
    code: 'AoAo88cv'
};

export default function useAuth() {
    const [users, setUsers] = useState<User[]>([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = window.localStorage.getItem('current_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // If the stored user is the old admin, log them out.
                if (parsedUser.role === 'admin') {
                    window.localStorage.removeItem('current_user');
                    return null;
                }
                return parsedUser;
            } catch {
                window.localStorage.removeItem('current_user');
                return null;
            }
        }
        return null;
    });

    const logout = useCallback(() => {
        window.localStorage.removeItem('current_user');
        setCurrentUser(null);
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user: any) => {
            if (user) {
                setAuthError(null); 
                setIsAuthReady(true);
            } else {
                auth.signInAnonymously().catch((error: any) => {
                    console.error("Critical: Anonymous sign-in failed.", error);
                    setAuthError("فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى. قد تمنع بعض الشبكات (مثل شبكات المدارس) الوصول إلى خدماتنا.");
                    setIsAuthReady(true); 
                });
            }
        });
    
        return () => unsubscribe(); 
    }, []); 

    useEffect(() => {
        if (!isAuthReady || authError) return;

        const usersRef = db.ref('users');
        const callback = (snapshot: any) => {
            const usersData = snapshot.val();
            if (usersData) {
                const usersList = (Object.values(usersData) as User[]).filter(u => u.role !== 'admin');
                setUsers(usersList);

                if (currentUser && currentUser.role !== 'principal') {
                    const latestUserData = usersList.find(u => u.id === currentUser.id);
                    if (latestUserData?.disabled) {
                        alert('تم تعطيل حسابك. سيتم تسجيل خروجك.');
                        logout();
                    }
                }
            } else {
                setUsers([]);
            }
        };
        usersRef.on('value', callback);

        return () => usersRef.off('value', callback);
    }, [isAuthReady, authError, currentUser, logout]);

    const login = useCallback((identifier: string, secret: string): boolean => {
        // Principal login
        if (identifier === PRINCIPAL_USER.code && secret === '') {
            setCurrentUser(PRINCIPAL_USER);
            window.localStorage.setItem('current_user', JSON.stringify(PRINCIPAL_USER));
            return true;
        }
    
        // Teacher login
        const user = users.find(u => 
            (u.role === 'teacher') && u.code === identifier
        );
    
        if (user) {
            if (user.disabled) {
                alert('تم تعطيل حسابك.');
                return false;
            }
            // All other users must belong to our principal
            if (user.principalId !== PRINCIPAL_USER.id) {
                return false; 
            }
            setCurrentUser(user);
            window.localStorage.setItem('current_user', JSON.stringify(user));
            return true;
        }
    
        return false;
    }, [users]);
    
    const addUser = useCallback((newUser: Omit<User, 'id'>): User => {
        const userWithId = { 
            ...newUser, 
            id: uuidv4(),
            principalId: PRINCIPAL_USER.id 
        };
        db.ref(`users/${userWithId.id}`).set(userWithId);
        return userWithId;
    }, []);
    
    const updateUser = useCallback((userId: string, updater: (user: User) => User) => {
        const userToUpdate = users.find(u => u.id === userId);
        if (userToUpdate) {
            const updatedUser = updater(userToUpdate);
            db.ref(`users/${userId}`).set(updatedUser);
        }
    }, [users]);

    const deleteUser = useCallback((userId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
            db.ref(`users/${userId}`).remove();
        }
    }, []);

    return {
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        isAuthReady,
        authError,
    };
}
