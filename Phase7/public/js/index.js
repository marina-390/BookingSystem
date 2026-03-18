import { initAuthUI, updateHomePageUI, logout, getTokenPayload } from "./auth-ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initAuthUI();
  updateHomePageUI();
  
  // Only load and show bookings if user is authenticated
  const payload = getTokenPayload();
  if (payload && payload.sub) {
    document.getElementById("bookings-section").classList.remove("hidden");
    loadPublicReservations();
  }
});

window.logout = logout;

async function loadPublicReservations() {
  try {
    const res = await fetch("/api/reservations/public/list");
    const json = await res.json();

    if (!res.ok || !json.ok) {
      console.error("Failed to load reservations");
      return;
    }

    const reservations = json.data || [];
    const tableBody = document.getElementById("reservationTable");

    if (!tableBody) return;

    tableBody.innerHTML = reservations
      .map(r => `
        <tr>
          <td class="py-3">${r.resource_name || ""}</td>
          <td class="py-3">${new Date(r.start_time).toLocaleString()}</td>
          <td class="py-3">${new Date(r.end_time).toLocaleString()}</td>
        </tr>
      `)
      .join("");

    // If no reservations, show a friendly message
    if (reservations.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="py-6 text-center text-black/50">
            No current bookings. All resources are available!
          </td>
        </tr>
      `;
    }
  } catch (err) {
    console.error("Failed to load public reservations:", err);
  }
}