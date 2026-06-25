import { createContext, useContext, useState, useCallback } from 'react'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [search, setSearch] = useState('')
  const [filterTerbaru, setFilterTerbaru] = useState(false)
  const [filterTanpaFoto, setFilterTanpaFoto] = useState(false)
  const [filterStok, setFilterStok] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [savedScrollY, setSavedScrollY] = useState(null)

  const saveState = useCallback(() => {
    setSavedScrollY(window.scrollY)
  }, [])

  const clearSavedState = useCallback(() => {
    setSavedScrollY(null)
  }, [])

  return (
    <CatalogContext.Provider value={{
      search, setSearch,
      filterTerbaru, setFilterTerbaru,
      filterTanpaFoto, setFilterTanpaFoto,
      filterStok, setFilterStok,
      filterCategory, setFilterCategory,
      savedScrollY, saveState, clearSavedState,
    }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
