// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type AuthUser = {
    username: string;
    firstName: string;
    lastName: string;
};

type AuthContextType = {
    isAuthenticated: boolean;
    user: AuthUser | null;
    currentUsername: string | null;
    displayName: string;
    login: (user: AuthUser) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "digicover_user";

const readStoredUser = (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed.username === "string" &&
            typeof parsed.firstName === "string" &&
            typeof parsed.lastName === "string"
        ) {
            return parsed as AuthUser;
        }
        return null;
    } catch {
        return null;
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (user) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, [user]);

    const login = (nextUser: AuthUser) => {
        setUser(nextUser);
    };

    const logout = () => {
        setUser(null);
    };

    const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim() || user.username
        : "";

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: user !== null,
                user,
                currentUsername: user?.username ?? null,
                displayName,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
}
