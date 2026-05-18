function BottomNav({ page, setPage }) {
  return (
    <nav className="bottom-nav">
      <button
        className={page === "feed" ? "active" : ""}
        onClick={() => setPage("feed")}
      >
        Feed
      </button>

      <button
        className={page === "profile" ? "active" : ""}
        onClick={() => setPage("profile")}
      >
        Profile
      </button>
    </nav>
  )
}

export default BottomNav