
// ===============================
// Form handling for resources page
// ===============================

// -------------- Helpers --------------
function $(id) {
  return document.getElementById(id);
}

function logSection(title, data) {
  console.group(title);
  console.log(data);
  console.groupEnd();
}

// -------------- Form wiring --------------
document.addEventListener("DOMContentLoaded", () => {
  const form = $("resourceForm");
  if (!form) {
    console.warn("resourceForm not found. Ensure the form has id=\"resourceForm\".");
    return;
  }

  form.addEventListener("submit", onSubmit);
});

async function onSubmit(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const actionValue = submitter && submitter.value ? submitter.value : "create";
  // Prevent sending invalid payloads (ensure frontend validation passed)
  if (typeof window.isResourceFormValid === "function") {
    if (!window.isResourceFormValid()) {
      console.warn("Form invalid — aborting submit.");
      if (typeof window.showResourceFormMessage === "function") {
        window.showResourceFormMessage("error", "Please fix the highlighted fields before submitting.");
      }
      return;
    }
  }

  // Build a cleaned payload
  const name = $("resourceName")?.value?.trim() ?? "";
  const description = $("resourceDescription")?.value?.trim() ?? "";
  const availableEl = $("resourceAvailable");
  const available = !!(availableEl && availableEl.checked);
  const priceRaw = $("resourcePrice")?.value ?? "";
  const price = Number.isFinite(parseFloat(priceRaw)) ? parseFloat(priceRaw) : 0;
  const priceUnit = (document.querySelector('input[name="resourcePriceUnit"]:checked') || {}).value || "hour";

  const payload = {
    action: actionValue,
    resourceName: name,
    resourceDescription: description,
    resourceAvailable: available,
    resourcePrice: price,
    resourcePriceUnit: priceUnit,
  };

  logSection("Sending payload to httpbin.org/post", payload);

  try {
    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const message = `Server error: ${response.status} ${response.statusText}` + (text ? ` — ${text}` : "");
      console.error(message);
      if (typeof window.showResourceFormMessage === "function") {
        window.showResourceFormMessage("error", message);
      }
      return;
    }

    const data = await response.json();

    console.group("Response from httpbin.org");
    console.log("Status:", response.status);
    console.log("URL:", data.url);
    console.log("You sent (echo):", data.json);
    console.log("Headers (echoed):", data.headers);
    console.groupEnd();

    if (typeof window.showResourceFormMessage === "function") {
      window.showResourceFormMessage("success", "Resource saved successfully (response received).");
    }

  } catch (err) {
    console.error("POST error:", err);
    if (typeof window.showResourceFormMessage === "function") {
      window.showResourceFormMessage("error", "Network or server error — please try again.");
    }
  }
}