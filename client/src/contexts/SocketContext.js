/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import PRODUCTION_CONFIG from '../config/production.config';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketEnabled, setSocketEnabled] = useState(true);
  const [realtimeData, setRealtimeData] = useState({
    attendance: null,
    leaves: null,
    dashboard: null
  });
  const { user, isAuthenticated } = useAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated && user && socketEnabled) {
      // Initialize socket connection with error handling
      try {
        // Use production config for Electron app, otherwise use environment variables
        const apiUrl = window.electron 
          ? PRODUCTION_CONFIG.SOCKET_URL 
          : (process.env.REACT_APP_SOCKET_URL || 
            (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 
            (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')));
        const newSocket = io(apiUrl, {
          auth: {
            token: localStorage.getItem('token')
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        
        // Join dashboard room for real-time updates
        newSocket.emit('join-dashboard', user.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        // Don't show namespace errors to users as they're usually not critical
        if (error.message && error.message.includes('Invalid namespace')) {
          console.warn('Socket namespace error - this is usually not critical for functionality');
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setIsConnected(false);
      });

      // Listen for real-time updates
      newSocket.on('attendance-update', (data) => {
        console.log('Attendance update received:', data);
        setRealtimeData(prev => ({
          ...prev,
          attendance: data
        }));
      });

      newSocket.on('leave-update', (data) => {
        console.log('Leave update received:', data);
        setRealtimeData(prev => ({
          ...prev,
          leaves: data
        }));
      });

      newSocket.on('widget-update', (data) => {
        console.log('Widget update received:', data);
        setRealtimeData(prev => ({
          ...prev,
          dashboard: data
        }));
      });

        setSocket(newSocket);

        return () => {
          newSocket.close();
        };
      } catch (error) {
        console.error('Failed to initialize socket connection:', error);
        setIsConnected(false);
        setSocket(null);
        // Disable socket functionality if it fails to initialize
        if (error.message && error.message.includes('Invalid namespace')) {
          console.warn('Socket namespace error - disabling socket functionality');
          setSocketEnabled(false);
        }
      }
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user, socketEnabled]);

  const emitEvent = (event, data) => {
    if (socket && isConnected) {
      try {
        socket.emit(event, data);
      } catch (error) {
        console.warn('Socket emit failed:', error.message);
      }
    }
  };

  const subscribeToEvent = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      
      return () => {
        socket.off(event, callback);
      };
    }
  };

  const joinRoom = (roomName) => {
    if (socket && isConnected) {
      try {
        socket.emit('join-room', roomName);
      } catch (error) {
        console.warn('Socket join room failed:', error.message);
      }
    }
  };

  const leaveRoom = (roomName) => {
    if (socket && isConnected) {
      try {
        socket.emit('leave-room', roomName);
      } catch (error) {
        console.warn('Socket leave room failed:', error.message);
      }
    }
  };

  const value = {
    socket,
    isConnected,
    socketEnabled,
    realtimeData,
    emitEvent,
    subscribeToEvent,
    joinRoom,
    leaveRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
