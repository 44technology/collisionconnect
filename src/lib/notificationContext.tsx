import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type CustomerNotification = {
  id: string;
  requestId: number;
  vehicleName: string;
  message: string;
  read: boolean;
  createdAt: number;
};

type NotificationContextValue = {
  notifications: CustomerNotification[];
  addNotification: (requestId: number, vehicleName: string, bidCount: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const addNotification = useCallback((requestId: number, vehicleName: string, bidCount: number) => {
    const id = `notif-${requestId}-${Date.now()}`;
    const message =
      bidCount === 1
        ? "1 new offer is available to view."
        : `${bidCount} new offers are available to view.`;
    setNotifications((prev) => [
      { id, requestId, vehicleName, message, read: false, createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
