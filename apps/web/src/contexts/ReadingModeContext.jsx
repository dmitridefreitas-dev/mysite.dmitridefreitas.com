import React, { createContext, useContext, useState, useEffect } from 'react';

const ReadingModeContext = createContext();

export const ReadingModeProvider = ({ children }) => {
  const [isTechnicalMode, setIsTechnicalMode] = useState(() => {
    const saved = localStorage.getItem('readingMode');
    return saved === 'technical';
  });

  useEffect(() => {
    localStorage.setItem('readingMode', isTechnicalMode ? 'technical' : 'simple');
  }, [isTechnicalMode]);

  const toggleReadingMode = () => setIsTechnicalMode((prev) => !prev);

  return (
    <ReadingModeContext.Provider value={{ isTechnicalMode, toggleReadingMode }}>
      {children}
    </ReadingModeContext.Provider>
  );
};

export const useReadingMode = () => useContext(ReadingModeContext);