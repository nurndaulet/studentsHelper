export const DAYS = [
  "Дүйсенбі",
  "Сейсенбі",
  "Сәрсенбі",
  "Бейсенбі",
  "Жұма",
  "Сенбі",
  "Жексенбі",
];
export const COLORS = ["#2563EB", "#9675E7", "#F29B4B", "#23A58D"];
export const emptyData = {
  profile: null,
  lessons: [],
  tasks: [],
  materials: [],
};
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function weekDay(date = new Date()) {
  return (date.getDay() + 6) % 7;
}
export function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function validDate(value) {
  const d = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(d) && dateKey(d) === value;
}
export function upcomingTasks(tasks) {
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.due.localeCompare(b.due));
}
export function validateLesson(form, lessons, editingId) {
  if (!form.title.trim()) return "Пән атауын енгізіңіз.";
  if (!validTime(form.start) || !validTime(form.end) || form.end <= form.start)
    return "Уақытты HH:MM түрінде енгізіңіз. Аяқталуы басталуынан кейін болуы керек.";
  if (
    lessons.some(
      (l) =>
        l.id !== editingId &&
        l.day === form.day &&
        l.start < form.end &&
        form.start < l.end,
    )
  )
    return "Бұл уақытта басқа сабақ бар.";
  return null;
}
export function validateTask(form) {
  return !form.title.trim()
    ? "Тапсырма атауын енгізіңіз."
    : !validDate(form.due)
      ? "Күнді ЖЖЖЖ-АА-КК түрінде дұрыс енгізіңіз."
      : null;
}

export function displayDate(date = new Date()) {
  const months = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}
