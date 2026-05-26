'use client'

import { createContext, useContext, useState } from 'react'

interface MobileNavContextValue {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

const MobileNavContext = createContext<MobileNavContextValue>({
  drawerOpen: false,
  setDrawerOpen: () => {},
})

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <MobileNavContext.Provider value={{ drawerOpen, setDrawerOpen }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  return useContext(MobileNavContext)
}
