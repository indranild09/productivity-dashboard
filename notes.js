let notesUnsubscribe = null;

function loadNotes() {
  if (!currentUser) return;

  if (notesUnsubscribe) notesUnsubscribe();

  notesUnsubscribe = db.collection("users")
    .doc(currentUser.uid)
    .collection("notes")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      const list = document.getElementById("notes-list");
      if (!list) return;

      list.innerHTML = "";

      snapshot.forEach(doc => {
        const note = doc.data();

        const li = document.createElement("li");
        li.textContent = note.text;

        const del = document.createElement("button");
        del.textContent = "x";
        del.className = "delete";

        del.onclick = () => {
          db.collection("users")
            .doc(currentUser.uid)
            .collection("notes")
            .doc(doc.id)
            .delete();
        };

        li.appendChild(del);
        list.appendChild(li);
      });
    });
}

function addNote() {
  const field = document.getElementById("notes-area");
  const btn = document.getElementById("save-note-btn");

  if (!field.value.trim() || !currentUser) return;

  btn.disabled = true;
  btn.textContent = "Saving...";

  db.collection("users")
    .doc(currentUser.uid)
    .collection("notes")
    .add({
      text: field.value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      field.value = "";
      showToast("Note saved");
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "Save Note";
    });
}
