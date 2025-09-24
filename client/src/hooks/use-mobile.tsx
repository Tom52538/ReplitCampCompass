import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('mobile')

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setScreenSize('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    const mql1 = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mql2 = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    
    mql1.addEventListener("change", updateScreenSize)
    mql2.addEventListener("change", updateScreenSize)
    updateScreenSize()
    
    return () => {
      mql1.removeEventListener("change", updateScreenSize)
      mql2.removeEventListener("change", updateScreenSize)
    }
  }, [])

  return screenSize
}
