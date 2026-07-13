export default function Loading() {
  return (
    <main style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--ink-soft)" }}>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            margin: "0 auto 14px",
            borderRadius: "50%",
            border: "3px solid var(--teal-soft)",
            borderTopColor: "var(--teal)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 13.5 }}>Đang tải...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
