"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Star } from "lucide-react";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId?: string;
  bookingId?: string;
  assetName: string;
  onSuccess?: () => void;
}

const CONDITIONS = [
  { value: "BAIK", label: "✅ Aset dalam kondisi baik", color: "#10b981" },
  { value: "PERLU_PERBAIKAN", label: "⚠️ Perlu sedikit perbaikan", color: "#f59e0b" },
  { value: "RUSAK", label: "❌ Ditemukan kerusakan", color: "#ef4444" },
];

export function RatingModal({ isOpen, onClose, loanId, bookingId, assetName, onSuccess }: RatingModalProps) {
  const { showToast } = useToast();
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [condition, setCondition] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) { showToast("Pilih bintang terlebih dahulu", "error"); return; }
    try {
      setSubmitting(true);
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, bookingId, score, condition: condition || null, comment: comment || null }),
      });
      if (res.ok) {
        showToast("Rating berhasil dikirim! Terima kasih atas feedback Anda 🙏", "success");
        onSuccess?.();
        onClose();
        setScore(0); setCondition(""); setComment("");
      } else {
        const err = await res.json();
        showToast(err.error || "Gagal mengirim rating", "error");
      }
    } catch { showToast("Koneksi gagal", "error"); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Beri Rating — ${assetName}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <p style={{ fontSize: "0.88rem", color: "var(--color-muted)" }}>
          Bagaimana pengalaman Anda menggunakan aset ini? Feedback Anda membantu kami meningkatkan layanan.
        </p>

        {/* Star Selector */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "0.75rem" }}>
            Beri Penilaian *
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", transition: "transform 0.1s" }}
              >
                <Star
                  size={36}
                  fill={(hovered || score) >= s ? "#f59e0b" : "transparent"}
                  color={(hovered || score) >= s ? "#f59e0b" : "var(--color-border)"}
                  style={{ transition: "all 0.15s", transform: hovered === s ? "scale(1.2)" : "scale(1)" }}
                />
              </button>
            ))}
          </div>
          {score > 0 && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>
              {["", "Sangat Buruk", "Buruk", "Cukup", "Baik", "Sangat Baik"][score]}
            </div>
          )}
        </div>

        {/* Condition */}
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.6rem" }}>Kondisi Aset Saat Dikembalikan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(condition === c.value ? "" : c.value)}
                style={{
                  padding: "0.65rem 1rem", borderRadius: "var(--radius-md)", border: "1.5px solid",
                  borderColor: condition === c.value ? c.color : "var(--color-border)",
                  background: condition === c.value ? `${c.color}15` : "transparent",
                  color: condition === c.value ? c.color : "var(--color-text)",
                  fontWeight: condition === c.value ? 700 : 400,
                  cursor: "pointer", textAlign: "left", fontSize: "0.85rem", transition: "all 0.15s",
                }}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
            Komentar / Saran (opsional)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ceritakan pengalaman Anda, kondisi aset, atau saran perbaikan..."
            rows={3}
            className="input-field"
            style={{ width: "100%", resize: "vertical", fontSize: "0.85rem" }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} isLoading={submitting} disabled={score === 0}>
            ⭐ Kirim Rating
          </Button>
        </div>
      </div>
    </Modal>
  );
}
