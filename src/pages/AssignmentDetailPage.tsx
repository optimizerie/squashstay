import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";
import type { Assignment, Message } from "../types";

export function AssignmentDetailPage({ id }: { id: string }) {
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchAssignment = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("*, tournament:tournaments(*), player:player_profiles(*, profile:profiles(*)), host:host_profiles(*, profile:profiles(*))")
      .eq("id", id)
      .single();
    setAssignment(data as Assignment);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .eq("assignment_id", id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignment();
    fetchMessages();

    const channel = supabase
      .channel(`messages-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `assignment_id=eq.${id}`,
      }, async () => {
        await fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    await supabase.from("messages").insert({
      assignment_id: id,
      sender_id: user.id,
      body: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  };

  const handleConfirmContact = async () => {
    if (!user || !assignment || !profile) return;
    const field = profile.role === "host" ? "host_confirmed_at" : "player_confirmed_at";
    await supabase.from("assignments").update({ [field]: new Date().toISOString() }).eq("id", id);
    fetchAssignment();
  };

  const isHost = profile?.role === "host";
  const otherParty = isHost ? (assignment?.player as any) : (assignment?.host as any);
  const otherName = otherParty?.profile?.full_name || "Other party";

  const myConfirmed = isHost ? assignment?.host_confirmed_at : assignment?.player_confirmed_at;
  const theirConfirmed = isHost ? assignment?.player_confirmed_at : assignment?.host_confirmed_at;

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main page-main-narrow">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← Back to dashboard</button>

        {assignment && (
          <>
            {/* Header */}
            <div className="assignment-detail-header">
              <div className="assignment-detail-tournament">
                🏆 {(assignment.tournament as any)?.name}
              </div>
              <h1 className="assignment-detail-title">
                {isHost ? `Hosting ${otherName}` : `Staying with ${otherName}`}
              </h1>
              <div className="assignment-detail-meta">
                {isHost ? (
                  <>
                    <span>🎾 PSA #{(assignment.player as any)?.psa_ranking || "—"}</span>
                    <span>🌍 {(assignment.player as any)?.profile?.nationality}</span>
                    <span>🏠 {(assignment.player as any)?.home_club || "—"}</span>
                  </>
                ) : (
                  <>
                    <span>📍 {(assignment.host as any)?.distance_to_venue_miles}mi from venue</span>
                    {(assignment.host as any)?.offers_food && <span>🍳 Meals included</span>}
                    {(assignment.host as any)?.offers_transport && <span>🚗 Transport offered</span>}
                    {(assignment.host as any)?.has_pets && <span>🐾 Has pets: {(assignment.host as any)?.pet_details}</span>}
                  </>
                )}
              </div>
            </div>

            {/* Contact details */}
            {otherParty?.profile?.phone && (
              <div className="card" style={{ marginBottom: 16, padding: "16px 20px" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📞 Contact {otherName}</div>
                <div style={{ fontSize: 15 }}>{otherParty.profile.phone}</div>
                {(otherParty.profile.contact_via_text || otherParty.profile.contact_via_whatsapp) && (
                  <div style={{ marginTop: 6, color: "var(--gray-600)", fontSize: 13 }}>
                    Prefers:{" "}
                    {[otherParty.profile.contact_via_text && "💬 Direct text", otherParty.profile.contact_via_whatsapp && "📱 WhatsApp"].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            )}

            {/* Contact confirmation */}
            <div className={`contact-confirm-panel ${assignment.status === "fully_confirmed" ? "fully-confirmed" : ""}`}>
              {assignment.status === "fully_confirmed" ? (
                <div className="confirm-row">
                  <span className="confirm-check">✅</span>
                  <span>Both parties have confirmed contact. You're all set!</span>
                </div>
              ) : (
                <>
                  <p className="confirm-instructions">
                    Please reach out to {otherName} and confirm you've made contact.
                  </p>
                  <div className="confirm-status-row">
                    <div className={`confirm-status-item ${myConfirmed ? "done" : ""}`}>
                      {myConfirmed ? "✅" : "⏳"} You {myConfirmed ? "confirmed" : "(pending)"}
                    </div>
                    <div className={`confirm-status-item ${theirConfirmed ? "done" : ""}`}>
                      {theirConfirmed ? "✅" : "⏳"} {otherName} {theirConfirmed ? "confirmed" : "(pending)"}
                    </div>
                  </div>
                  {!myConfirmed && (
                    <button className="btn-confirm-large" onClick={handleConfirmContact}>
                      ✓ I've made contact with {otherName}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Messaging */}
            <div className="chat-section">
              <h3 className="chat-title">Messages</h3>
              <div className="chat-messages">
                {loading ? (
                  <div className="loading-placeholder">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty">
                    No messages yet. Say hello to {otherName}! 👋
                  </div>
                ) : (
                  messages.map(m => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`chat-message ${isMe ? "mine" : "theirs"}`}>
                        {!isMe && (
                          <div className="chat-sender">{(m.sender as any)?.full_name}</div>
                        )}
                        <div className="chat-bubble">{m.body}</div>
                        <div className="chat-time">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder={`Message ${otherName}…`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <button className="btn-primary" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
