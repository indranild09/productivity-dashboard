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

  if (!currentUser) {
    alert("Login required");
    return;
  }

  if (!input.value.trim()) {
    alert("Please enter a task name");
    return;
  }

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
    })
    .then(() => {
      input.value = "";
      category.value = "";
      priority.value = "Low";
    })
    .catch(err => alert(err.message));
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