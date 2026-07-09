"use client";

export default function PrintOrderButton() {
  return (
    <button type="button" className="btn-outline" onClick={() => window.print()}>
      🖨 In phiếu giao hàng
    </button>
  );
}
