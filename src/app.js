const state = {
  events: [],
  filteredEvents: [],
  activeTags: new Set(),
  query: "",
  today: new Date("2026-06-08T12:00:00+02:00")
};

const nodes = {
  lastRefreshed: document.querySelector("#last-refreshed"),
  searchInput: document.querySelector("#search-input"),
  filters: document.querySelector(".filters"),
  calendarTitle: document.querySelector("#calendar-title"),
  calendarGrid: document.querySelector("#calendar-grid"),
  eventsList: document.querySelector("#events-list"),
  eventCount: document.querySelector("#event-count"),
  detailPanel: document.querySelector("#detail-panel"),
  closeDetail: document.querySelector("#close-detail"),
  detailStatus: document.querySelector("#detail-status"),
  detailTitle: document.querySelector("#detail-title"),
  detailSummary: document.querySelector("#detail-summary"),
  detailDate: document.querySelector("#detail-date"),
  detailVenue: document.querySelector("#detail-venue"),
  detailOriginal: document.querySelector("#detail-original"),
  detailSource: document.querySelector("#detail-source")
};

function loadEvents() {
  try {
    if (!window.WALDMOHR_EVENTS) {
      throw new Error("Unable to load data/events.js.");
    }

    const payload = window.WALDMOHR_EVENTS;
    state.events = payload.events.map(normalizeEvent);
    state.filteredEvents = state.events;
    nodes.lastRefreshed.textContent = formatDateTime(payload.generatedAt);
    render();
  } catch (error) {
    nodes.eventCount.textContent = "Event data failed to load.";
    nodes.eventsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function normalizeEvent(event) {
  return {
    ...event,
    parsedDate: new Date(`${event.date}T12:00:00+02:00`)
  };
}

function render() {
  applyFilters();
  renderCalendar();
  renderEventList();
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  state.filteredEvents = state.events.filter((event) => {
    const matchesTags =
      state.activeTags.size === 0 ||
      event.tags.some((tag) => state.activeTags.has(tag));
    const haystack = [
      event.title,
      event.originalTitle,
      event.summary,
      event.venue,
      event.familyRelevance,
      event.tags.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    return matchesTags && (!query || haystack.includes(query));
  });
}

function renderCalendar() {
  const displayDate = getDisplayMonth();
  const month = displayDate.getMonth();
  const year = displayDate.getFullYear();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  nodes.calendarTitle.textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(first);

  weekdays.forEach((day) => {
    cells.push(`<div class="weekday">${day}</div>`);
  });

  for (let blank = 0; blank < startOffset; blank += 1) {
    cells.push('<div class="day muted" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = state.filteredEvents.filter((event) => event.date === dateKey);
    const isToday =
      state.today.getFullYear() === year &&
      state.today.getMonth() === month &&
      state.today.getDate() === day;
    cells.push(`
      <button class="day ${isToday ? "today" : ""}" type="button" data-date="${dateKey}">
        <span>${day}</span>
        ${dayEvents.map((event) => `<i title="${escapeHtml(event.title)}"></i>`).join("")}
      </button>
    `);
  }

  nodes.calendarGrid.innerHTML = cells.join("");
}

function getDisplayMonth() {
  if (state.filteredEvents.length === 0) {
    return state.today;
  }

  const upcomingEvent = state.filteredEvents
    .filter((event) => event.status !== "past")
    .sort((left, right) => left.parsedDate.getTime() - right.parsedDate.getTime())[0];

  if (upcomingEvent) {
    return upcomingEvent.parsedDate;
  }

  return [...state.filteredEvents].sort(
    (left, right) => right.parsedDate.getTime() - left.parsedDate.getTime()
  )[0].parsedDate;
}

function renderEventList() {
  const sorted = [...state.filteredEvents].sort((left, right) => {
    const statusOrder = statusRank(left.status) - statusRank(right.status);
    if (statusOrder !== 0) return statusOrder;
    return right.parsedDate.getTime() - left.parsedDate.getTime();
  });

  const upcomingCount = sorted.filter((event) => event.status !== "past").length;
  nodes.eventCount.textContent =
    upcomingCount > 0
      ? `${upcomingCount} upcoming, ${sorted.length} total`
      : `No upcoming events found; ${sorted.length} recent past events retained`;

  if (sorted.length === 0) {
    nodes.eventsList.innerHTML = '<p class="empty-state">No events match the current filters.</p>';
    return;
  }

  nodes.eventsList.innerHTML = sorted.map(renderEventCard).join("");
  nodes.eventsList.querySelectorAll("button[data-event-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const event = state.events.find((item) => item.id === button.dataset.eventId);
      if (event) showDetail(event);
    });
  });
}

function renderEventCard(event) {
  const tagList = event.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  return `
    <article class="event-card ${event.status}">
      <div class="date-block">
        <strong>${formatDay(event.parsedDate)}</strong>
        <span>${formatMonth(event.parsedDate)}</span>
      </div>
      <div class="event-main">
        <p class="status-line">${escapeHtml(event.status)} · ${escapeHtml(event.dateConfidence)} date</p>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.summary)}</p>
        <div class="tag-list">${tagList}</div>
      </div>
      <button type="button" data-event-id="${escapeHtml(event.id)}">Details</button>
    </article>
  `;
}

function showDetail(event) {
  nodes.detailStatus.textContent = `${event.status} · checked ${event.lastChecked}`;
  nodes.detailTitle.textContent = event.title;
  nodes.detailSummary.textContent = event.familyRelevance;
  nodes.detailDate.textContent = `${formatLongDate(event.parsedDate)}${event.time ? `, ${event.time}` : ""}`;
  nodes.detailVenue.textContent = event.venue || "Venue not confirmed";
  nodes.detailOriginal.textContent = event.originalTitle;
  nodes.detailSource.href = event.sourceUrl;
  nodes.detailPanel.setAttribute("aria-hidden", "false");
}

function statusRank(status) {
  if (status === "upcoming") return 0;
  if (status === "current") return 1;
  return 2;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDay(date) {
  return new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

nodes.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

nodes.filters.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.checked) {
    state.activeTags.add(event.target.value);
  } else {
    state.activeTags.delete(event.target.value);
  }
  render();
});

nodes.closeDetail.addEventListener("click", () => {
  nodes.detailPanel.setAttribute("aria-hidden", "true");
});

loadEvents();
