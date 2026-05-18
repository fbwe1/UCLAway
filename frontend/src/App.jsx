import { useState } from 'react'
import Profile from "./Profile"
import Feed from "./Feed"
import BottomNav from "./components/BottomNav"
import "./App.css"

function App() {
  const [page, setPage] = useState("feed")
  return (
    <div className="app-shell">
      {page === "feed" && <Feed />}
      {page === "profile" && <Profile />}
      <BottomNav page={page} setPage={setPage} />
    </div>
  )
}

export default App
