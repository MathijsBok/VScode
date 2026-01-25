import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewRole = 'USER' | 'AGENT' | 'ADMIN';

interface ViewContextType {
  currentView: ViewRole;
  setCurrentView: (view: ViewRole) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<ViewRole>(() => {
    // Initialize from localStorage or default to ADMIN
    const stored = localStorage.getItem('adminViewAs');
    return (stored as ViewRole) || 'ADMIN';
  });

  const setCurrentView = (view: ViewRole) => {
    setCurrentViewState(view);
    localStorage.setItem('adminViewAs', view);
  };

  return (
    <ViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};
