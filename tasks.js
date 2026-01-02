let tasksUnsubscribe = null;

function loadTasks() {
  if (!currentUser) return;

  if (tasksUnsubscribe) tasksUnsubscribe();

  tasksUnsubscribe = db.collection("users")
    .doc(currentUser.uid)
    .collection("tasks")
    .orderBy("priorityValue", "desc")
    .orderBy("createdAt", "desc")
    .onSnapshot(renderTasks);
}

function renderTasks(snapshot) {
  const list = document.getElementById("task-list");
  if (!list) return;

  list.innerHTML = "";

  let categories = new Set();

  snapshot.forEach(doc => {
    const task = doc.data();
    categories.add(task.category);

    const li = buildTaskItem(doc.id, task);
    list.appendChild(li);
  });

  renderFilters([...categories]);
  updateProgress();
}

function buildTaskItem(id, task) {

  const li = document.createElement("li");
  li.classList.add("fade-in");

  // icon
  const icon = document.createElement("span");
  icon.textContent = getIcon(task.category);
  icon.className = "task-icon";
  li.appendChild(icon);

  // editable task text
  const text = document.createElement("span");
  text.textContent = task.text;

  if (task.done) text.classList.add("done");

  text.onclick = () => editTaskText(id, text, task.text);

  // category tag
  const categoryTag = document.createElement("span");
  categoryTag.className = "tag";
  categoryTag.textContent = task.category;
  categoryTag.onclick = () => editCategory(id, categoryTag);

  // priority badge
  const priority = document.createElement("span");
  setPriorityStyle(priority, task.priority);

  priority.onclick = () => changePriority(id, priority);

  // complete button
  const complete = document.createElement("button");
  complete.textContent = "Task Completed";
  complete.className = "complete";

  if (task.done) complete.classList.add("done");

  complete.onclick = () =>
    toggleComplete(id, text, complete, task.done);

  // delete button
  const del = document.createElement("button");
  del.textContent = "x";
  del.className = "delete";

  del.onclick = () => deleteTask(id, li);

  li.appendChild(text);
  li.appendChild(categoryTag);
  li.appendChild(priority);
  li.appendChild(complete);
  li.appendChild(del);

  return li;
}

function getIcon(cat) {
  cat = (cat || "").toLowerCase();
  if (cat.includes("work")) return "💼";
  if (cat.includes("study")) return "📚";
  if (cat.includes("personal")) return "🏠";
  if (cat.includes("money")) return "💰";
  if (cat.includes("health") || cat.includes("gym")) return "⚕";
  return "🎯";
}

function setPriorityStyle(el, value) {
  if (value === "High") el.className = "priority-high";
  else if (value === "Medium") el.className = "priority-medium";
  else el.className = "priority-low";

  el.textContent = value;
}

function editTaskText(id, span, oldValue) {
  const input = document.createElement("input");
  input.value = span.textContent;

  span.replaceWith(input);
  input.focus();

  function save() {
    const value = input.value.trim() || oldValue;

    db.collection("users")
      .doc(currentUser.uid)
      .collection("tasks")
      .doc(id)
      .update({ text: value });

    span.textContent = value;
    input.replaceWith(span);
  }

  input.onblur = save;
  input.onkeydown = e => e.key === "Enter" && save();
}

function editCategory(id, tag) {
  const input = document.createElement("input");
  input.value = tag.textContent;

  tag.replaceWith(input);
  input.focus();

  function save() {
    const value = input.value.trim() || "Uncategorized";

    db.collection("users")
      .doc(currentUser.uid)
      .collection("tasks")
      .doc(id)
      .update({ category: value });

    tag.textContent = value;
    input.replaceWith(tag);
  }

  input.onblur = save;
  input.onkeydown = e => e.key === "Enter" && save();
}

function changePriority(id, priorityEl) {
  const select = document.createElement("select");

  select.innerHTML = `
    <option value="Low">Low</option>
    <option value="Medium">Medium</option>
    <option value="High">High</option>
  `;

  select.value = priorityEl.textContent;

  priorityEl.replaceWith(select);
  select.focus();

  function save() {
    const val = select.value;

    const priorityMap = { High: 3, Medium: 2, Low: 1 };

    db.collection("users")
      .doc(currentUser.uid)
      .collection("tasks")
      .doc(id)
      .update({
        priority: val,
        priorityValue: priorityMap[val]
      });

    setPriorityStyle(priorityEl, val);
    select.replaceWith(priorityEl);
  }

  select.onblur = save;
  select.onchange = save;
}

function toggleComplete(id, textEl, btn, done) {
  db.collection("users")
    .doc(currentUser.uid)
    .collection("tasks")
    .doc(id)
    .update({ done: !done });

  textEl.classList.toggle("done");
  btn.classList.toggle("done");
}

function deleteTask(id, li) {
  if (!confirm("Delete task?")) return;

  li.classList.add("fade-out");

  setTimeout(() => {
    db.collection("users")
      .doc(currentUser.uid)
      .collection("tasks")
      .doc(id)
      .delete();
  }, 250);
}

function addTask() {
  const input = document.getElementById("task-input");
  const category = document.getElementById("category-input");
  const priority = document.getElementById("priority-input");

  if (!input.value.trim()) return;

  const map = { High: 3, Medium: 2, Low: 1 };

  db.collection("users")
    .doc(currentUser.uid)
    .collection("tasks")
    .add({
      text: input.value,
      category: category.value || "Uncategorized",
      priority: priority.value,
      priorityValue: map[priority.value],
      done: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = "";
  category.value = "";
  priority.value = "Low";
}
