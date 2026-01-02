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
