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
    loadNotes();
    loadGoals();


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
