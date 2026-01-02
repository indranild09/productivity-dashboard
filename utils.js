function showToast(message) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");

  el.className = "toast";
  el.textContent = message;

  container.appendChild(el);

  setTimeout(() => el.remove(), 2500);
}
