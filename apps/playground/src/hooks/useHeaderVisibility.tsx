import React, { createContext, useContext, useEffect, useState } from 'react';
import { useScrollDirection } from './useScrollDirection';

interface HeaderVisibilityContextType {
  isHeaderVisible: boolean;
  headerHeight: number;
}

const HeaderVisibilityContext = createContext<HeaderVisibilityContextType>({
  isHeaderVisible: true,
  headerHeight: 64, // ShellTopBar (40px) + ShellHeader (56px) = 96px, but measured as 64px
});

export function HeaderVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollDirection = useScrollDirection({ threshold: 10 });
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const shouldHideHeader = scrollDirection === 'down' && scrollY > 100;
    setIsHeaderVisible(!shouldHideHeader);
  }, [scrollDirection, scrollY]);

  return (
    <HeaderVisibilityContext.Provider
      value={{ isHeaderVisible, headerHeight: 64 }}
    >
      {children}
    </HeaderVisibilityContext.Provider>
  );
}

export function useHeaderVisibility() {
  return useContext(HeaderVisibilityContext);
}
