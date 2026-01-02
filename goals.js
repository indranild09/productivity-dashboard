let goalsUnsubscribe = null;

function loadGoals() {
  if (!currentUser) return;

  if (goalsUnsubscribe) goalsUnsubscribe();

  goalsUnsubscribe = db.collection("users")
    .doc(currentUser.uid)
    .collection("goals")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      const list = document.getElementById("goal-list");
      if (!list) return;

      list.innerHTML = "";

      snapshot.forEach(doc => {
        const goal = doc.data();

        const li = document.createElement("li");
        li.textContent = goal.text;

        const del = document.createElement("button");
        del.textContent = "x";
        del.className = "delete";

        del.onclick = () => {
          db.collection("users")
            .doc(currentUser.uid)
            .collection("goals")
            .doc(doc.id)
            .delete();
        };

        li.appendChild(del);
        list.appendChild(li);
      });
    });
}

function saveGoal() {
  const field = document.getElementById("goal-input");
  if (!field || !field.value.trim() || !currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("goals")
    .add({
      text: field.value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  field.value = "";
}
