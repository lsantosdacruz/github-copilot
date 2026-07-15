document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function renderParticipants(participants) {
    if (!participants.length) {
      return '<p class="participants-empty">No participants yet.</p>';
    }

    const items = participants
      .map(
        (participant) => `
          <li class="participant-item">
            <span class="participant-email">${escapeHtml(participant)}</span>
            <button
              type="button"
              class="delete-participant-btn"
              data-email="${encodeURIComponent(participant)}"
              title="Remove participant"
              aria-label="Remove ${escapeHtml(participant)}"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          </li>
        `
      )
      .join("");

    return `<ul class="participants-list">${items}</ul>`;
  }

  async function deleteParticipant(activity, email) {
    const confirmDelete = window.confirm(
      `Remove ${email} from ${activity}?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
      } else {
        messageDiv.textContent = result.detail || "Failed to remove participant";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      await fetchActivities();

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch(`/activities?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p class="activity-meta"><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-meta"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            ${renderParticipants(details.participants)}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest(".delete-participant-btn");

    if (!deleteBtn) {
      return;
    }

    const activityCard = deleteBtn.closest(".activity-card");

    if (!activityCard) {
      return;
    }

    const activity = activityCard.dataset.activity;
    const encodedEmail = deleteBtn.dataset.email;

    if (!activity || !encodedEmail) {
      return;
    }

    const email = decodeURIComponent(encodedEmail);
    await deleteParticipant(activity, email);
  });

  // Initialize app
  fetchActivities();
});
