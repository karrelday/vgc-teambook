import { useEffect, useState } from 'react'
import TeamList from './components/TeamList'
import TeamView from './components/TeamView'

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  const match = hash.match(/^#\/team\/([\w-]+)/)

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">Teambook</a>
      </header>
      <main className="page">
        {match ? <TeamView id={match[1]} key={match[1]} /> : <TeamList />}
      </main>
    </div>
  )
}
