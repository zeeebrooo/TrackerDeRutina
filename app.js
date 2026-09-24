const STORAGE = {
  routines: "routine-tracker:routines",
  history: "routine-tracker:history"
};

const starterRoutine = {
  id: "starter",
  name: "Fuerza + core",
  description: "Una rutina sencilla para empezar.",
  steps: [
    { name: "Entrada en calor", note: "Movilidad suave y movimiento de cadera.", reps: 0, time: 180, rest: 30 },
    { name: "Sentadillas", note: "Talones apoyados y bajada controlada.", reps: 10, time: 0, rest: 60 },
    { name: "Crunches cortos", note: "No tires del cuello.", reps: 10, time: 0, rest: 60 },
    { name: "Plancha frontal", note: "Espalda recta y abdomen firme.", reps: 0, time: 20, rest: 60 },
    { name: "Sentadillas", note: "Última serie.", reps: 10, time: 0, rest: 60 },
    { name: "Crunches cortos", note: "Ritmo tranquilo y controlado.", reps: 10, time: 0, rest: 60 },
    { name: "Plancha frontal", note: "Último esfuerzo.", reps: 0, time: 20, rest: 90 },
    { name: "Vuelta a la calma", note: "Respirá profundo y aflojá.", reps: 0, time: 120, rest: 0 }
  ]
};

const $ = id => document.getElementById(id);

const state = {
  routines: load(STORAGE.routines, null),
  history: load(STORAGE.history, []),
  routineIndex: 0,
  stepIndex: 0,
  currentReps: 0,
  timer: null,
  builderSteps: [],
  builderMode: "reps",
  editingIndex: null
};

if (!Array.isArray(state.routines) || !state.routines.length) {
  state.routines = [starterRoutine];
  save(STORAGE.routines, state.routines);
}

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function currentRoutine() {
  return state.routines[state.routineIndex];
}

function formatTime(total) {
  total = Math.max(0, Math.floor(total));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function stepText(step) {
  return step.reps ? `${step.reps} reps` : `${step.time}s`;
}

function show(id) {
  $(id).classList.remove("hidden");
}

function hide(id) {
  $(id).classList.add("hidden");
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 1800);
}

function renderRoutineSelect() {
  const select = $("routineSelect");
  select.replaceChildren();

  state.routines.forEach((routine, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = routine.name;
    select.append(option);
  });

  select.value = state.routineIndex;
  renderHome();
}

function renderHome() {
  const routine = currentRoutine();
  $("routineDescription").textContent = routine.description || "Sin descripción.";
  $("homeStepCount").textContent = `${routine.steps.length} ${routine.steps.length === 1 ? "ejercicio" : "ejercicios"}`;
  $("homeTitle").textContent = routine.name;
  $("homeSummary").textContent = routine.steps.length
    ? `Duración y descansos configurados para cada ejercicio.`
    : "Esta rutina todavía no tiene ejercicios.";

  $("jsonData").value = JSON.stringify(routine, null, 2);
}

function beginWorkout() {
  clearTimer();
  state.stepIndex = 0;
  hide("home");
  hide("finished");
  show("workout");
  showStep();
}

function showStep() {
  clearTimer();

  const routine = currentRoutine();
  const step = routine.steps[state.stepIndex];

  if (!step) {
    finishWorkout();
    return;
  }

  const total = routine.steps.length;
  const next = routine.steps[state.stepIndex + 1];

  $("stepLabel").textContent = `Ejercicio ${state.stepIndex + 1} de ${total}`;
  $("progressBar").style.width = `${((state.stepIndex + 1) / total) * 100}%`;
  $("exerciseName").textContent = step.name;
  $("exerciseNote").textContent = step.note || "";
  $("nextExercise").textContent = next ? `${next.name} · ${stepText(next)}` : "Terminar";

  if (step.reps > 0) {
    state.currentReps = step.reps;
    $("stepType").textContent = "REPETICIONES";
    $("repsValue").textContent = state.currentReps;
    show("repsView");
    hide("timedView");
  } else {
    $("stepType").textContent = "TIEMPO";
    $("exerciseClock").textContent = formatTime(step.time);
    $("timerHint").textContent = "Preparado";
    $("startExerciseTimer").classList.remove("hidden");
    $("finishTimed").classList.add("hidden");
    show("timedView");
    hide("repsView");
  }
}

function startExerciseTimer() {
  const seconds = currentRoutine().steps[state.stepIndex].time;
  runTimer(seconds, value => {
    $("exerciseClock").textContent = formatTime(value);
  }, () => {
    $("timerHint").textContent = "Completado";
    $("startExerciseTimer").classList.add("hidden");
    $("finishTimed").classList.remove("hidden");
  });

  $("timerHint").textContent = "En marcha";
  $("startExerciseTimer").classList.add("hidden");
}

function completeStep() {
  const step = currentRoutine().steps[state.stepIndex];
  clearTimer();

  if (step.rest > 0) {
    startRest(step.rest);
    return;
  }

  state.stepIndex++;
  showStep();
}

function startRest(seconds) {
  hide("workout");
  show("rest");

  const next = currentRoutine().steps[state.stepIndex + 1];
  $("restNext").textContent = next ? `${next.name} · ${stepText(next)}` : "Terminar";
  $("restClock").textContent = formatTime(seconds);

  runTimer(seconds, value => {
    $("restClock").textContent = formatTime(value);
  }, () => {
    state.stepIndex++;
    hide("rest");
    show("workout");
    showStep();
  });
}

function runTimer(seconds, onTick, done) {
  clearTimer();
  let remaining = seconds;
  onTick(remaining);

  state.timer = setInterval(() => {
    remaining--;
    onTick(remaining);

    if (remaining <= 0) {
      clearTimer();
      done();
    }
  }, 1000);
}

function clearTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function finishWorkout() {
  clearTimer();
  hide("workout");
  hide("rest");
  show("finished");

  state.history.unshift({
    routine: currentRoutine().name,
    date: new Date().toISOString(),
    steps: currentRoutine().steps.length
  });

  state.history = state.history.slice(0, 50);
  save(STORAGE.history, state.history);
  renderHistory();
}

function renderHistory() {
  const list = $("historyList");
  list.replaceChildren();

  if (!state.history.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Todavía no hay entrenamientos.";
    list.append(empty);
    return;
  }

  state.history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const title = document.createElement("strong");
    title.textContent = item.routine;

    const details = document.createElement("span");
    const date = new Date(item.date);
    details.textContent = `${date.toLocaleDateString("es-AR")} · ${date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit"
    })} · ${item.steps} ejercicios`;

    row.append(title, details);
    list.append(row);
  });
}

function openBuilder(index = null) {
  state.editingIndex = index;
  state.builderSteps = index === null
    ? []
    : structuredClone(state.routines[index].steps);

  if (index === null) {
    $("builderHeading").textContent = "Nueva rutina";
    $("routineName").value = "";
    $("routineDescription").value = "";
  } else {
    const routine = state.routines[index];
    $("builderHeading").textContent = "Editar rutina";
    $("routineName").value = routine.name;
    $("routineDescription").value = routine.description || "";
  }

  renderBuilder();
  show("builder");
  $("builder").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderBuilder() {
  const list = $("builderList");
  list.replaceChildren();

  if (!state.builderSteps.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Agregá el primer ejercicio.";
    list.append(empty);
    return;
  }

  state.builderSteps.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = "builder-item";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${step.name}`;

    const details = document.createElement("small");
    details.textContent = `${stepText(step)}${step.rest ? ` · ${step.rest}s descanso` : ""}`;

    info.append(title, details);

    const remove = document.createElement("button");
    remove.className = "remove-step";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Eliminar ${step.name}`);
    remove.addEventListener("click", () => {
      state.builderSteps.splice(index, 1);
      renderBuilder();
    });

    item.append(info, remove);
    list.append(item);
  });
}

function addExercise() {
  const name = $("exerciseNameInput").value.trim();
  if (!name) {
    toast("Poné un nombre para el ejercicio.");
    return;
  }

  const reps = state.builderMode === "reps" ? Number($("exerciseReps").value) : 0;
  const time = state.builderMode === "time" ? Number($("exerciseTime").value) : 0;

  if (!reps && !time) {
    toast("Indicá repeticiones o tiempo.");
    return;
  }

  state.builderSteps.push({
    name,
    note: $("exerciseNoteInput").value.trim(),
    reps,
    time,
    rest: Math.max(0, Number($("exerciseRest").value) || 0)
  });

  $("exerciseNameInput").value = "";
  $("exerciseNoteInput").value = "";
  $("exerciseReps").value = "";
  $("exerciseTime").value = "";
  $("exerciseRest").value = "";

  renderBuilder();
}

function saveRoutine() {
  const name = $("routineName").value.trim();

  if (!name || !state.builderSteps.length) {
    toast("Necesitás un nombre y al menos un ejercicio.");
    return;
  }

  const routine = {
    id: state.editingIndex === null
      ? `routine-${Date.now()}`
      : state.routines[state.editingIndex].id,
    name,
    description: $("routineDescription").value.trim(),
    steps: structuredClone(state.builderSteps)
  };

  if (state.editingIndex === null) {
    state.routines.push(routine);
    state.routineIndex = state.routines.length - 1;
  } else {
    state.routines[state.editingIndex] = routine;
    state.routineIndex = state.editingIndex;
  }

  save(STORAGE.routines, state.routines);
  renderRoutineSelect();
  hide("builder");
  toast("Rutina guardada.");
}

function deleteRoutine() {
  if (state.editingIndex === null) return;
  if (state.routines.length === 1) {
    toast("Tiene que quedar al menos una rutina.");
    return;
  }

  if (!confirm("¿Eliminar esta rutina?")) return;

  state.routines.splice(state.editingIndex, 1);
  state.routineIndex = Math.min(state.routineIndex, state.routines.length - 1);
  save(STORAGE.routines, state.routines);
  renderRoutineSelect();
  hide("builder");
  toast("Rutina eliminada.");
}

function importRoutine() {
  try {
    const data = JSON.parse($("jsonData").value);

    if (!data.name || !Array.isArray(data.steps)) throw new Error();

    data.id = `routine-${Date.now()}`;
    state.routines.push(data);
    state.routineIndex = state.routines.length - 1;

    save(STORAGE.routines, state.routines);
    renderRoutineSelect();
    toast("Rutina importada.");
  } catch {
    toast("El JSON no parece una rutina válida.");
  }
}

$("routineSelect").addEventListener("change", event => {
  state.routineIndex = Number(event.target.value);
  renderHome();
});

$("startWorkout").addEventListener("click", beginWorkout);
$("finishReps").addEventListener("click", completeStep);
$("startExerciseTimer").addEventListener("click", startExerciseTimer);
$("finishTimed").addEventListener("click", completeStep);

$("plusRep").addEventListener("click", () => {
  state.currentReps++;
  $("repsValue").textContent = state.currentReps;
});

$("minusRep").addEventListener("click", () => {
  state.currentReps = Math.max(0, state.currentReps - 1);
  $("repsValue").textContent = state.currentReps;
});

$("skipRest").addEventListener("click", () => {
  clearTimer();
  state.stepIndex++;
  hide("rest");
  show("workout");
  showStep();
});

$("backHome").addEventListener("click", () => {
  hide("finished");
  show("home");
});

$("toggleHistory").addEventListener("click", () => {
  const list = $("historyList");
  list.classList.toggle("hidden");
  $("toggleHistory").textContent = list.classList.contains("hidden") ? "Mostrar" : "Ocultar";
});

$("openBuilder").addEventListener("click", () => openBuilder());
$("closeBuilder").addEventListener("click", () => hide("builder"));
$("addExercise").addEventListener("click", addExercise);
$("saveRoutine").addEventListener("click", saveRoutine);
$("deleteRoutine").addEventListener("click", deleteRoutine);

document.querySelectorAll(".choice-button").forEach(button => {
  button.addEventListener("click", () => {
    state.builderMode = button.dataset.mode;

    document.querySelectorAll(".choice-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    if (state.builderMode === "reps") {
      show("repsField");
      hide("timeField");
    } else {
      hide("repsField");
      show("timeField");
    }
  });
});

$("routineSelect").addEventListener("dblclick", () => openBuilder(state.routineIndex));

$("routineDescription").addEventListener("dblclick", () => {
  openBuilder(state.routineIndex);
});

$("copyJson").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("jsonData").value);
    toast("JSON copiado.");
  } catch {
    toast("No se pudo copiar.");
  }
});

$("importJson").addEventListener("click", importRoutine);

renderRoutineSelect();
renderHistory();
