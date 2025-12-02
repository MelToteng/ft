import React, { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationRead } from '../../services/supabaseService';
import { UserNotification } from '../../types';
import { Icons } from '../ui';
import { supabase } from '../../services/supabaseClient';

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await getUserNotifications();
            setNotifications(data);
        } catch (err) {
            console.error('Error loading notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();

        // Subscribe to new notifications
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'user_notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        loadNotifications();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupSubscription();
    }, []);

    const handleMarkAsRead = async (id: number) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-surface-light transition-colors"
            >
                <Icons.Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-2xl shadow-custom-lg z-50 max-h-96 overflow-y-auto">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-lg">Notifications</h3>
                        </div>
                        {loading ? (
                            <div className="p-4 text-center text-text-secondary">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-text-secondary">No notifications</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-surface-light transition-colors cursor-pointer ${!notification.is_read ? 'bg-primary/5' : ''
                                            }`}
                                        onClick={() => {
                                            if (!notification.is_read) {
                                                handleMarkAsRead(notification.id);
                                            }
                                            if (notification.link) {
                                                // Navigate to link if needed
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.is_read ? 'bg-primary' : 'bg-transparent'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm">{notification.title}</p>
                                                <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                                                <p className="text-xs text-text-muted mt-2">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
