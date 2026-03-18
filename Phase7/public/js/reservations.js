import { initAuthUI, getTokenPayload, getUserRole, requireAuthOrBlockPage, logout } from "./auth-ui.js";

initAuthUI();
if (!requireAuthOrBlockPage()) {
    throw new Error("Authentication required");
  }

  window.logout = logout;

  const payload = getTokenPayload();
  const currentUserId = payload?.sub ?? null;

  document.addEventListener("DOMContentLoaded", async () => {
    // Auto-fill current user id for reservations
    const userIdInput = document.getElementById("userId");
    if (userIdInput && currentUserId) {
      userIdInput.value = currentUserId;
      userIdInput.disabled = true;
    }

  const form = document.getElementById("reservation-form");
  const message = document.getElementById("message");
  const tableBody = document.getElementById("reservations-body");

  await Promise.all([loadResources(), loadReservations()]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveReservation();
  });

  function authHeader() {
    return {
      "Authorization": "Bearer " + localStorage.getItem("token")
    };
  }

  async function loadResources() {
    const res = await fetch("/api/resources", {
      headers: authHeader()
    });

    const json = await res.json();
    const resources = json.data || [];

    const select = document.getElementById("resourceId");
    select.innerHTML = "<option value=\"\" disabled selected>Select a resource...</option>";

    resources.forEach((resource) => {
      const option = document.createElement("option");
      option.value = resource.id;
      option.textContent = `${resource.name} (ID ${resource.id})`;
      select.appendChild(option);
    });
  }

  async function loadReservations() {
    const res = await fetch("/api/reservations", {
      headers: authHeader()
    });

    const json = await res.json();
    const reservations = json.data || [];
    const userRole = payload.role;

    tableBody.innerHTML = "";

    reservations.forEach(r => {
      const tr = document.createElement("tr");
      const statusClass = r.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900";
      
      // Show edit/delete buttons only for:
      // 1. Managers (all reservations)
      // 2. Reserver (only own reservations)
      const canEdit = userRole === 'manager' || (userRole === 'reserver' && r.user_id === currentUserId);
      const buttonHTML = canEdit ? `
        <td class="px-4 py-3 space-x-2">
          <button class="edit-btn rounded-lg bg-brand-blue px-3 py-1 text-xs font-semibold text-white hover:bg-brand-blue/90 transition-colors" data-id="${r.id}">Edit</button>
          <button class="delete-btn rounded-lg bg-brand-rose px-3 py-1 text-xs font-semibold text-white hover:bg-brand-rose/90 transition-colors" data-id="${r.id}">Delete</button>
        </td>
      ` : `<td class="px-4 py-3 text-xs text-black/40">No actions</td>`;

      tr.innerHTML = `
        <td class="px-4 py-3">${r.id}</td>
        <td class="px-4 py-3">${r.resource_id}</td>
        <td class="px-4 py-3">${r.user_id}</td>
        <td class="px-4 py-3">${new Date(r.start_time).toLocaleString()}</td>
        <td class="px-4 py-3">${new Date(r.end_time).toLocaleString()}</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}">
            ${r.status}
          </span>
        </td>
        <td class="px-4 py-3">${r.note || ""}</td>
        ${buttonHTML}
      `;

      tableBody.appendChild(tr);
    });

    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => loadIntoForm(btn.dataset.id));
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteReservation(btn.dataset.id));
    });
  }

  async function loadIntoForm(id) {
    const res = await fetch(`/api/reservations/${id}`, {
      headers: authHeader()
    });

    const json = await res.json();
    const r = json.data;

    document.getElementById("reservation-id").value = r.id;
    document.getElementById("resourceId").value = r.resource_id;
    document.getElementById("userId").value = r.user_id;
    document.getElementById("startTime").value = r.start_time.slice(0, 16);
    document.getElementById("endTime").value = r.end_time.slice(0, 16);
    document.getElementById("note").value = r.note || "";
    document.getElementById("status").value = r.status;
  }

    async function saveReservation() {
        const id = document.getElementById("reservation-id").value;

const startValue = document.getElementById("startTime").value;
    const endValue = document.getElementById("endTime").value;

    if (!startValue || !endValue || new Date(endValue) <= new Date(startValue)) {
      message.textContent = "End time must be after start time.";
      message.classList.remove("hidden");
      message.classList.add("border-rose-200", "bg-rose-50", "text-rose-900");
      message.classList.remove("border-emerald-200", "bg-emerald-50", "text-emerald-900");
      return;
    }

    const payload = {
        resourceId: Number(document.getElementById("resourceId").value),
        userId: Number(document.getElementById("userId").value),
        startTime: new Date(startValue).toISOString(),
        endTime: new Date(endValue).toISOString(),
            note: document.getElementById("note").value,
            status: document.getElementById("status").value
        };

        const method = id ? "PUT" : "POST";
        const url = id ? `/api/reservations/${id}` : "/api/reservations";

        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (!json.ok) {
            message.textContent = json.error || "Error saving reservation.";
            message.classList.remove("hidden");
            message.classList.add("border-rose-200", "bg-rose-50", "text-rose-900");
            message.classList.remove("border-emerald-200", "bg-emerald-50", "text-emerald-900");
            return;
        }

        message.textContent = id ? "Reservation updated successfully!" : "Reservation created successfully!";
        message.classList.remove("hidden");
        message.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-900");
        message.classList.remove("border-rose-200", "bg-rose-50", "text-rose-900");


        form.reset();
        document.getElementById("reservation-id").value = "";
        loadResources();
        loadReservations();
    }


  async function deleteReservation(id) {
    const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    });

    if (res.status !== 204) {
        const json = await res.json();
        message.textContent = json.error || "Error deleting reservation.";
        message.classList.remove("hidden");
        message.classList.add("border-rose-200", "bg-rose-50", "text-rose-900");
        message.classList.remove("border-emerald-200", "bg-emerald-50", "text-emerald-900");
        return;
    }

    message.textContent = "Reservation deleted successfully!";
    message.classList.remove("hidden");
    message.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-900");
    message.classList.remove("border-rose-200", "bg-rose-50", "text-rose-900");
    loadReservations();
  }

});
