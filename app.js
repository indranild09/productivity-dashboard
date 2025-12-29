/* ================= GLOBAL ================= */

let currentUser = null;
let currentFilter = "All";
let currentSearch = "";

auth.onAuthStateChanged(user => {
  console.log("AUTH USER:", user?.uid);

  currentUser = user;

  if (user) {
    const userRef = db.collection("users").doc(user.uid);

    userRef.get().then(doc => {
      if (!doc.exists) {

        // fallback details if older users did not save names
        userRef.set({
          firstName: "User",
          lastName: "",
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    loadTasksFromDB();
    loadRemindersFromDB();

    const deleteBtn = document.getElementById("delete-account-btn");

if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) return;

    const confirmDelete = confirm(
      "Are you sure? This will permanently delete your account and all data!"
    );

    if (!confirmDelete) return;

    try {
      // 1️⃣ Re-authenticate (Firebase requires recent login)
      const email = prompt("Please confirm your email to continue:");
      const password = prompt("Enter your password:");

      const credential = firebase.auth.EmailAuthProvider.credential(
        email,
        password
      );

      await user.reauthenticateWithCredential(credential);

      // 2️⃣ Delete Firestore data
      await db.collection("users").doc(user.uid).delete();

      // (optional) delete subcollections if you want later

      // 3️⃣ Delete from Firebase Auth
      await user.delete();

      alert("Account deleted successfully.");
      window.location.href = "signup.html";
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
  });
}

    // NOTES
    db.collection("users")
      .doc(user.uid)
      .collection("data")
      .doc("notes")
      .get()
      .then(doc => {
        if (doc.exists) notesArea.value = doc.data().text;
      });

    // GOAL
    db.collection("users")
      .doc(user.uid)
      .collection("data")
      .doc("goal")
      .get()
      .then(doc => {
        if (doc.exists) goalInput.value = doc.data().text;
      });

    // LOAD FIRST NAME FOR GREETING
    db.collection("users")
      .doc(user.uid)
      .get()
      .then(doc => {
        let name = "there";

        if (doc.exists && doc.data().firstName) {
          name = doc.data().firstName;
        }

        setHeader(name);
      });
  }
});


/* ================= FILTER BAR ================= */

function renderFilters(categories) {
  const bar = document.getElementById("filter-bar");
  if (!bar) return;

  bar.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.className = currentFilter === "All" ? "active" : "";
  allBtn.onclick = () => {
    currentFilter = "All";
    loadTasksFromDB();
  };

  bar.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.className = currentFilter === cat ? "active" : "";
    btn.onclick = () => {
      currentFilter = cat;
      loadTasksFromDB();
    };

    bar.appendChild(btn);
  });
}


/* ================= TASKS ================= */

function loadTasksFromDB() {
  db.collection("users")
    .doc(currentUser.uid)
    .collection("tasks")
    .orderBy("priorityValue", "desc")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {

      const list = document.getElementById("task-list");
      list.innerHTML = "";

      let categories = new Set();

      snapshot.forEach(doc => {
        const task = doc.data();
        categories.add(task.category);

        const textMatch =
          task.text?.toLowerCase().includes(currentSearch) ||
          task.category?.toLowerCase().includes(currentSearch) ||
          task.priority?.toLowerCase().includes(currentSearch);

        const filterMatch =
          currentFilter === "All" || task.category === currentFilter;

        if (filterMatch && textMatch) {
          const li = createTask(
            task.text,
            task.done,
            doc.id,
            task.category,
            task.priority
          );
          list.appendChild(li);
        }
      });

      renderFilters([...categories]);
      updateProgress();
    });
}


function createTask(
  text,
  completed = false,
  id = null,
  category = "Uncategorized",
  priority = "Low"
) {
  const li = document.createElement("li");
  li.classList.add("fade-in");

  function getIcon(cat) {
    cat = (cat || "").toLowerCase();
    if (cat.includes("work")) return "💼";
    if (cat.includes("study") || cat.includes("college")) return "📚";
    if (cat.includes("personal")) return "🏠";
    if (cat.includes("finance") || cat.includes("money")) return "💰";
    if (cat.includes("health") || cat.includes("gym")) return "⚕";
    if (cat.includes("travel")) return "✈️";
    return "🎯";
  }

  const icon = document.createElement("span");
  icon.textContent = getIcon(category);
  icon.className = "task-icon";
  li.appendChild(icon);

  const span = document.createElement("span");
  span.textContent = text;

  span.onclick = () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = span.textContent;

    span.replaceWith(input);
    input.focus();

    input.onblur = saveEdit;
    input.onkeydown = e => e.key === "Enter" && saveEdit();

    function saveEdit() {
      const newText = input.value.trim() || text;

      db.collection("users")
        .doc(currentUser.uid)
        .collection("tasks")
        .doc(id)
        .update({ text: newText });

      span.textContent = newText;
      input.replaceWith(span);
    }
  };


  const categoryTag = document.createElement("span");
  categoryTag.className = "tag";
  categoryTag.textContent = category;

  categoryTag.onclick = () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = categoryTag.textContent;

    categoryTag.replaceWith(input);
    input.focus();

    input.onblur = saveCategory;
    input.onkeydown = e => e.key === "Enter" && saveCategory();

    function saveCategory() {
      const newCategory = input.value.trim() || "Uncategorized";

      db.collection("users")
        .doc(currentUser.uid)
        .collection("tasks")
        .doc(id)
        .update({ category: newCategory });

      categoryTag.textContent = newCategory;
      input.replaceWith(categoryTag);

      currentFilter = "All";
      loadTasksFromDB();
    }
  };


  const priorityLabel = document.createElement("span");

  function setPriorityStyle(val) {
    if (val === "High") priorityLabel.className = "priority-high";
    else if (val === "Medium") priorityLabel.className = "priority-medium";
    else priorityLabel.className = "priority-low";

    priorityLabel.textContent = val;
  }

  setPriorityStyle(priority);

  priorityLabel.onclick = () => {
    const select = document.createElement("select");

    select.innerHTML = `
      <option value="Low">Low</option>
      <option value="Medium">Medium</option>
      <option value="High">High</option>
    `;

    select.value = priority;

    priorityLabel.replaceWith(select);
    select.focus();

    select.onblur = savePriority;
    select.onchange = savePriority;

    function savePriority() {
      const newPriority = select.value;
      const priorityMap = { High: 3, Medium: 2, Low: 1 };

      db.collection("users")
        .doc(currentUser.uid)
        .collection("tasks")
        .doc(id)
        .update({
          priority: newPriority,
          priorityValue: priorityMap[newPriority]
        });

      setPriorityStyle(newPriority);
      select.replaceWith(priorityLabel);
    }
  };

  if (completed) span.classList.add("done");

  const completeBtn = document.createElement("button");
  completeBtn.textContent = "Task Completed";
  completeBtn.className = "complete";
  if (completed) completeBtn.classList.add("done");

  completeBtn.onclick = () => {
    const newState = !span.classList.contains("done");

    span.classList.toggle("done");
    completeBtn.classList.toggle("done");

    db.collection("users")
      .doc(currentUser.uid)
      .collection("tasks")
      .doc(id)
      .update({ done: newState });

    updateProgress();
  };

  const del = document.createElement("button");
  del.textContent = "x";
  del.className = "delete";

  del.onclick = () => {
    li.classList.add("fade-out");

    setTimeout(() => {
      db.collection("users")
        .doc(currentUser.uid)
        .collection("tasks")
        .doc(id)
        .delete();
    }, 250);
  };

  li.appendChild(span);
  li.appendChild(completeBtn);
  li.appendChild(del);

  li.insertBefore(categoryTag, li.children[1]);
  li.insertBefore(priorityLabel, li.children[2]);

  return li;
}


/* ================= ADD TASK ================= */

function addTask() {
  const input = document.getElementById("task-input");
  const category = document.getElementById("category-input");
  const priority = document.getElementById("priority-input");

  if (!input.value.trim()) return;

  const priorityMap = { High: 3, Medium: 2, Low: 1 };

  db.collection("users")
    .doc(currentUser.uid)
    .collection("tasks")
    .add({
      text: input.value,
      category: category.value || "Uncategorized",
      priority: priority.value,
      priorityValue: priorityMap[priority.value],
      done: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = "";
  category.value = "";
  priority.value = "Low";
}

function focusAddTask() {
  document.getElementById("task-input").focus();
}


/* ================= PROGRESS ================= */

function updateProgress() {
  const tasks = document.querySelectorAll("#task-list li");
  const done = document.querySelectorAll("#task-list li span.done");

  const percent =
    tasks.length === 0
      ? 0
      : Math.round((done.length / tasks.length) * 100);

  const circle = document.querySelector(".progress");
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset =
    circumference - (percent / 100 * circumference);

  document.getElementById("progress-percent").textContent = percent + "%";
}


/* ================= REMINDERS ================= */

function loadRemindersFromDB() {
  db.collection("users")
    .doc(currentUser.uid)
    .collection("reminders")
    .orderBy("createdAt")
    .onSnapshot(snapshot => {
      const list = document.getElementById("reminder-list");
      list.innerHTML = "";

      snapshot.forEach(doc => {
        const r = doc.data();
        const li = createReminder(r.text, doc.id);
        list.appendChild(li);
      });
    });
}

function createReminder(text, id) {
  const li = document.createElement("li");
  li.classList.add("fade-in");

  const span = document.createElement("span");
  span.textContent = text;

  const del = document.createElement("button");
  del.textContent = "x";
  del.className = "delete";

  del.onclick = () => {
    li.classList.add("fade-out");

    setTimeout(() => {
      db.collection("users")
        .doc(currentUser.uid)
        .collection("reminders")
        .doc(id)
        .delete();
    }, 250);
  };

  li.appendChild(span);
  li.appendChild(del);

  return li;
}

function addReminder() {
  const input = document.getElementById("reminder-input");
  if (!input.value.trim()) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("reminders")
    .add({
      text: input.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = "";
}


/* ================= HEADER ================= */

function setHeader() {
  const greetingEl = document.getElementById("greeting-text");
  const dateEl = document.getElementById("date-text");

  const now = new Date();
  const hour = now.getHours();

  let greeting = "Hello";

  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  // load name from Firestore
  db.collection("users")
    .doc(currentUser.uid)
    .get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        greetingEl.textContent = `${greeting}, ${data.firstName} 👋`;
      } else {
        greetingEl.textContent = `${greeting} 👋`;
      }
    });

  dateEl.textContent = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}



/* ================= NOTES ================= */

const notesArea = document.getElementById("notes-area");

notesArea.addEventListener("input", () => {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("data")
    .doc("notes")
    .set({ text: notesArea.value });
});


/* ================= GOAL ================= */

const goalInput = document.getElementById("goal-input");

goalInput.addEventListener("input", () => {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("data")
    .doc("goal")
    .set({ text: goalInput.value });
});


/* ================= QUOTE ================= */

fetch("https://api.quotable.io/random")
  .then(res => res.json())
  .then(data => {
    document.getElementById("quote-text").textContent = data.content;
  })
  .catch(() => {
    document.getElementById("quote-text").textContent =
      "Be consistent. Small progress beats perfection.";
  });


/* ================= INIT ================= */
function logout() {
  auth.signOut()
    .then(() => {
      console.log("Logged out");
      window.location.href = "login.html";   // redirect
    })
    .catch(err => {
      alert("Logout failed: " + err.message);
    });
}



const taskSearch = document.getElementById("task-search");

if (taskSearch) {
  taskSearch.addEventListener("input", e => {
    currentSearch = e.target.value.toLowerCase();
    loadTasksFromDB();
  });
}

const chipButtons = document.querySelectorAll(".p-chip");
const priorityInput = document.getElementById("priority-input");

chipButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    chipButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    priorityInput.value = btn.dataset.value;
  });
});




window.onload = () => {
  updateProgress();
};
