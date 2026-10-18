import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  COLORS,
  DAYS,
  dateKey,
  displayDate,
  emptyData,
  upcomingTasks,
  validateLesson,
  validateTask,
  weekDay,
} from "./src/model";

const KEY = "@smart-student/v1";
const tabs = [
  ["home", "⌂", "Басты бет"],
  ["schedule", "▦", "Кесте"],
  ["tasks", "✓", "Тапсырма"],
  ["materials", "▤", "Материал"],
];
export default function App() {
  const [data, setData] = useState(emptyData),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("home"),
    [day, setDay] = useState(weekDay()),
    [filter, setFilter] = useState("active"),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [name, setName] = useState(""),
    [group, setGroup] = useState(""),
    [tick, setTick] = useState(Date.now());
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (
            !Array.isArray(saved.lessons) ||
            !Array.isArray(saved.tasks) ||
            !Array.isArray(saved.materials)
          )
            throw Error("storage");
          setData(saved);
        }
      })
      .catch(() =>
        setError(
          "Сақталған деректер оқылмады. Қайта ашып көріңіз. Деректер үстінен жазылмайды.",
        ),
      )
      .finally(() => setReady(true));
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  async function update(next) {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      return true;
    } catch {
      Alert.alert("Сақталмады", "Құрылғы жадын тексеріп, қайта көріңіз.");
      return false;
    }
  }
  const now = new Date(tick),
    today = weekDay(now),
    todayLessons = data.lessons
      .filter((l) => l.day === today)
      .sort((a, b) => a.start.localeCompare(b.start)),
    next = todayLessons.find(
      (l) =>
        l.end >
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    ),
    pending = upcomingTasks(data.tasks),
    initials = (data.profile?.name || "S")
      .split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  function open(kind, item) {
    setError("");
    setModal({ kind, id: item?.id });
    setForm(
      item
        ? { ...item }
        : kind === "lesson"
          ? {
              title: "",
              day,
              start: "09:00",
              end: "09:50",
              room: "",
              teacher: "",
              type: "Дәріс",
              color: COLORS[0],
            }
          : kind === "task"
            ? {
                title: "",
                lessonId: "",
                due: dateKey(),
                notes: "",
                done: false,
              }
            : kind === "profile"
              ? { ...data.profile }
              : { title: "", lessonId: "", url: "", notes: "" },
    );
  }
  async function save() {
    const kind = modal.kind;
    let message =
      kind === "lesson"
        ? validateLesson(form, data.lessons, modal.id)
        : kind === "task"
          ? validateTask(form)
          : !form.title?.trim() && kind === "material"
            ? "Материал атауын енгізіңіз."
            : kind === "profile" && !form.name?.trim()
              ? "Атыңызды енгізіңіз."
              : null;
    if (
      kind === "material" &&
      form.url &&
      !/^https?:\/\/[^\s]+$/i.test(form.url)
    )
      message = "Сілтеме https:// немесе http:// арқылы басталуы керек.";
    if (message) {
      setError(message);
      return;
    }
    const key =
      kind === "lesson" ? "lessons" : kind === "task" ? "tasks" : "materials";
    const item = {
      ...form,
      id: modal.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    if (
      await update(
        kind === "profile"
          ? {
              ...data,
              profile: { name: form.name.trim(), group: form.group || "" },
            }
          : {
              ...data,
              [key]: modal.id
                ? data[key].map((x) => (x.id === modal.id ? item : x))
                : [...data[key], item],
            },
      )
    )
      setModal(null);
  }
  function remove(kind, id) {
    const perform = () => {
      const key =
        kind === "lesson" ? "lessons" : kind === "task" ? "tasks" : "materials";
      update({
        ...data,
        [key]: data[key].filter((x) => x.id !== id),
        ...(kind === "lesson"
          ? {
              tasks: data.tasks.map((x) =>
                x.lessonId === id ? { ...x, lessonId: "" } : x,
              ),
              materials: data.materials.map((x) =>
                x.lessonId === id ? { ...x, lessonId: "" } : x,
              ),
            }
          : {}),
      });
    };
    if (Platform.OS === "web") {
      if (window.confirm("Жазбаны өшіресіз бе?")) perform();
    } else
      Alert.alert("Өшіру", "Жазбаны өшіресіз бе?", [
        { text: "Бас тарту", style: "cancel" },
        { text: "Өшіру", style: "destructive", onPress: perform },
      ]);
  }
  const subject = (id) =>
    data.lessons.find((x) => x.id === id)?.title || "Жалпы";
  const button = (label, onPress, secondary = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.button, secondary && s.secondary]}
    >
      <Text style={[s.buttonText, secondary && { color: "#2563EB" }]}>
        {label}
      </Text>
    </Pressable>
  );
  const field = (label, key, placeholder = "", multiline = false) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          s.input,
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
        value={form[key] || ""}
        onChangeText={(v) => setForm({ ...form, [key]: v })}
        placeholder={placeholder}
        placeholderTextColor="#8B96A6"
        multiline={multiline}
        autoCapitalize={key === "url" ? "none" : "sentences"}
      />
    </View>
  );
  const empty = (title, desc, action, onPress) => (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>✧</Text>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.muted}>{desc}</Text>
      {action && button(action, onPress, true)}
    </View>
  );
  const actions = (kind, item) => (
    <View style={s.actions}>
      <Pressable accessibilityLabel="Өңдеу" onPress={() => open(kind, item)}>
        <Text style={s.link}>Өңдеу</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Өшіру"
        onPress={() => remove(kind, item.id)}
      >
        <Text style={s.delete}>Өшіру</Text>
      </Pressable>
    </View>
  );
  const taskCard = (t) => (
    <View key={t.id} style={s.card}>
      <View style={s.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: t.done }}
          aria-checked={t.done}
          accessibilityLabel={t.title}
          onPress={() =>
            update({
              ...data,
              tasks: data.tasks.map((x) =>
                x.id === t.id ? { ...x, done: !x.done } : x,
              ),
            })
          }
          style={[s.checkbox, t.done && { backgroundColor: "#2563EB" }]}
        >
          <Text style={{ color: "#fff" }}>{t.done ? "✓" : ""}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              s.cardTitle,
              t.done && {
                textDecorationLine: "line-through",
                color: "#8994A4",
              },
            ]}
          >
            {t.title}
          </Text>
          <Text style={s.muted}>{subject(t.lessonId)}</Text>
          <Text
            style={[
              s.small,
              {
                color: !t.done && t.due < dateKey(now) ? "#D95B45" : "#2563EB",
              },
            ]}
          >
            {t.due}
            {!t.done && t.due < dateKey(now) ? " · Мерзімі өтті" : ""}
          </Text>
        </View>
      </View>
      {!!t.notes && <Text style={s.notes}>{t.notes}</Text>}
      {actions("task", t)}
    </View>
  );
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#2563EB" />
        <Text style={s.muted}>Жүктелуде…</Text>
      </View>
    );
  if (error && !modal && !data.profile)
    return (
      <SafeAreaView style={s.shell}>
        <Text style={s.notes}>{error}</Text>
      </SafeAreaView>
    );
  if (!data.profile)
    return (
      <SafeAreaView style={s.shell}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={[s.content, { paddingTop: 70 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.brand}>
            <Image source={require("./assets/icon.png")} style={s.logo} />
            <Text style={s.cardTitle}>Smart Student</Text>
          </View>
          <Text style={[s.title, { fontSize: 32, marginTop: 42 }]}>
            Студенттің цифрлық көмекшісі
          </Text>
          <Text style={s.muted}>
            Кесте, тапсырмалар мен материалдар бір жерде
          </Text>
          <Text style={[s.label, { marginTop: 36 }]}>Аты-жөніңіз</Text>
          <TextInput
            accessibilityLabel="Аты-жөніңіз"
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Мысалы, Айдана Қасымова"
          />
          <Text style={[s.label, { marginTop: 18 }]}>
            Тобыңыз (міндетті емес)
          </Text>
          <TextInput
            accessibilityLabel="Тобыңыз"
            style={s.input}
            value={group}
            onChangeText={setGroup}
            placeholder="Мысалы, IT-24"
          />
          <View style={{ marginTop: 26 }}>
            {button("Бастау →", () => {
              if (name.trim())
                update({
                  ...data,
                  profile: { name: name.trim(), group: group.trim() },
                });
              else Alert.alert("Атыңызды енгізіңіз");
            })}
          </View>
          <Text style={[s.muted, { textAlign: "center", marginTop: 22 }]}>
            Тіркелу қажет емес. Деректер осы құрылғыда сақталады.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.shell}>
      <StatusBar barStyle="dark-content" />
      <View style={s.app}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              s.row,
              { justifyContent: "space-between", marginBottom: 26 },
            ]}
          >
            <View>
              <Text style={s.muted}>
                {tab === "home" ? "Қайырлы күн!" : "SMART STUDENT"}
              </Text>
              <Text style={s.title}>
                {tab === "home"
                  ? data.profile.name
                  : tab === "schedule"
                    ? "Сабақ кестесі"
                    : tab === "tasks"
                      ? "Тапсырмалар"
                      : "Оқу материалдары"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Профильді өңдеу"
              onPress={() => open("profile")}
              style={s.avatar}
            >
              <Text style={s.avatarText}>{initials}</Text>
            </Pressable>
          </View>
          {tab === "home" && (
            <>
              <Text style={s.eyebrow}>
                {DAYS[today].toUpperCase()},{" "}
                {displayDate(now)}
              </Text>
              <View style={s.hero}>
                <Text style={s.heroSmall}>
                  {next ? "Келесі сабақ" : "Бүгінгі жоспарыңыз"}
                </Text>
                <Text style={s.heroTitle}>
                  {next?.title ||
                    (todayLessons.length
                      ? "Бүгінгі сабақтар аяқталды"
                      : "Бүгін сабақ жоқ")}
                </Text>
                <Text style={s.heroSmall}>
                  {next
                    ? `${next.start} – ${next.end}${next.room ? " · " + next.room + " аудитория" : ""}`
                    : "Уақытты өзіңізге және жаңа білімге арнаңыз"}
                </Text>
              </View>
              <View style={s.stats}>
                <View style={s.stat}>
                  <Text style={s.statNumber}>{todayLessons.length}</Text>
                  <Text style={s.small}>Бүгінгі сабақ</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statNumber}>{pending.length}</Text>
                  <Text style={s.small}>Орындалмаған</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statNumber}>{data.materials.length}</Text>
                  <Text style={s.small}>Материал</Text>
                </View>
              </View>
              <View style={s.section}>
                <Text style={s.sectionTitle}>Бүгінгі сабақтар</Text>
                <Pressable
                  onPress={() => {
                    setDay(today);
                    setTab("schedule");
                  }}
                >
                  <Text style={s.link}>Барлығы →</Text>
                </Pressable>
              </View>
              {todayLessons.length
                ? todayLessons.map((l) => (
                    <Pressable
                      key={l.id}
                      onPress={() => open("lesson", l)}
                      style={[s.card, s.row]}
                    >
                      <Text style={s.time}>{l.start}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{l.title}</Text>
                        <Text style={s.muted}>
                          {l.type}
                          {l.room ? " · " + l.room + " аудитория" : ""}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                : empty(
                    "Кестеңізді қосыңыз",
                    "Платформадағы сабақтарыңызды осында қолмен енгізіңіз.",
                    "+ Сабақ қосу",
                    () => open("lesson"),
                  )}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Жақын дедлайндар</Text>
                <Text style={s.small}>{pending.length} тапсырма</Text>
              </View>
              {pending.length
                ? pending.slice(0, 3).map(taskCard)
                : empty(
                    "Бәрі орындалды!",
                    "Жаңа тапсырмалар қосылғанда осында көрінеді.",
                  )}
              <View style={[s.row, { gap: 12, marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  {button("+ Тапсырма", () => open("task"), true)}
                </View>
                <View style={{ flex: 1 }}>
                  {button("+ Материал", () => open("material"), true)}
                </View>
              </View>
            </>
          )}
          {tab === "schedule" && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {DAYS.map((d, i) => (
                  <Pressable
                    key={d}
                    onPress={() => setDay(i)}
                    style={[s.day, day === i && s.selected]}
                  >
                    <Text style={[s.dayText, day === i && { color: "#fff" }]}>
                      {d.slice(0, 2).toUpperCase()}
                    </Text>
                    <Text style={[s.small, day === i && { color: "#DBEAFE" }]}>
                      {i === today ? "Бүгін" : d.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.section}>
                <Text style={s.sectionTitle}>{DAYS[day]}</Text>
                <Pressable onPress={() => open("lesson")}>
                  <Text style={s.link}>+ Сабақ</Text>
                </Pressable>
              </View>
              {data.lessons
                .filter((l) => l.day === day)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((l) => (
                  <View
                    key={l.id}
                    style={[
                      s.card,
                      { borderLeftWidth: 4, borderLeftColor: l.color },
                    ]}
                  >
                    <View style={s.row}>
                      <View style={{ width: 58 }}>
                        <Text style={s.time}>{l.start}</Text>
                        <Text style={s.small}>{l.end}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{l.title}</Text>
                        <Text style={s.muted}>
                          {l.type}
                          {l.room ? " · " + l.room + " аудитория" : ""}
                        </Text>
                        {!!l.teacher && (
                          <Text style={s.small}>{l.teacher}</Text>
                        )}
                      </View>
                    </View>
                    {actions("lesson", l)}
                  </View>
                ))}
              {!data.lessons.some((l) => l.day === day) &&
                empty(
                  "Бұл күн бос",
                  "Сабақты өз платформаңыздан қарап, қолмен енгізіңіз.",
                  "+ Сабақ қосу",
                  () => open("lesson"),
                )}
            </>
          )}
          {tab === "tasks" && (
            <>
              <View style={s.section}>
                <Text style={s.muted}>Дедлайндарды бақылаңыз</Text>
                <Pressable onPress={() => open("task")}>
                  <Text style={s.link}>+ Қосу</Text>
                </Pressable>
              </View>
              <View style={s.chips}>
                {[
                  ["active", "Белсенді"],
                  ["done", "Орындалған"],
                  ["all", "Барлығы"],
                ].map(([v, l]) => (
                  <Pressable
                    key={v}
                    onPress={() => setFilter(v)}
                    style={[s.chip, filter === v && s.selected]}
                  >
                    <Text style={filter === v ? { color: "#fff" } : s.small}>
                      {l}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {data.tasks
                .filter(
                  (t) =>
                    filter === "all" || (filter === "done" ? t.done : !t.done),
                )
                .sort((a, b) => a.due.localeCompare(b.due))
                .map(taskCard)}
              {!data.tasks.some(
                (t) =>
                  filter === "all" || (filter === "done" ? t.done : !t.done),
              ) &&
                empty(
                  "Тапсырма жоқ",
                  "Үй тапсырмасын, дедлайнын және түсіндірмесін сақтаңыз.",
                  "+ Тапсырма қосу",
                  () => open("task"),
                )}
            </>
          )}
          {tab === "materials" && (
            <>
              <View style={s.section}>
                <Text style={s.muted}>Жазбалар мен сілтемелер</Text>
                <Pressable onPress={() => open("material")}>
                  <Text style={s.link}>+ Қосу</Text>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Материал іздеу"
                style={[s.input, { marginBottom: 18 }]}
                placeholder="Материалды немесе пәнді іздеу…"
                value={search}
                onChangeText={setSearch}
              />
              {data.materials
                .filter((m) =>
                  `${m.title} ${m.notes} ${subject(m.lessonId)}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((m) => (
                  <View key={m.id} style={s.card}>
                    <Text style={s.eyebrow}>{subject(m.lessonId)}</Text>
                    <Text style={s.cardTitle}>{m.title}</Text>
                    {!!m.notes && <Text style={s.notes}>{m.notes}</Text>}
                    {!!m.url && (
                      <Pressable
                        onPress={() =>
                          Linking.openURL(m.url).catch(() =>
                            Alert.alert("Сілтеме ашылмады"),
                          )
                        }
                      >
                        <Text style={s.link}>Сілтемені ашу ↗</Text>
                      </Pressable>
                    )}
                    {actions("material", m)}
                  </View>
                ))}
              {!data.materials.length &&
                empty(
                  "Оқу сөреңіз әзірге бос",
                  "Дәріс жазбаларын және материал сілтемелерін қолмен қосыңыз.",
                  "+ Материал қосу",
                  () => open("material"),
                )}
              {!!data.materials.length &&
                !data.materials.some((m) =>
                  `${m.title} ${m.notes} ${subject(m.lessonId)}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                ) &&
                empty("Ештеңе табылмады", "Басқа сөзбен іздеп көріңіз.")}
            </>
          )}
          <Text style={s.footer}>
            {data.profile.group ? data.profile.group + " · " : ""}Сіздің жеке
            оқу кеңістігіңіз
          </Text>
        </ScrollView>
        <View style={s.nav}>
          {tabs.map(([id, icon, label]) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              aria-selected={tab === id}
              onPress={() => setTab(id)}
              style={[s.navItem, tab === id && { backgroundColor: "#EFF5FF" }]}
            >
              <Text style={[s.navIcon, tab === id && { color: "#2563EB" }]}>
                {icon}
              </Text>
              <Text style={[s.navLabel, tab === id && { color: "#2563EB" }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Modal
        visible={!!modal}
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <SafeAreaView style={s.shell}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={s.content}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.section}>
                <Text style={s.title}>
                  {modal?.kind === "lesson"
                    ? "Сабақ"
                    : modal?.kind === "task"
                      ? "Тапсырма"
                      : modal?.kind === "profile"
                        ? "Профиль"
                        : "Материал"}
                </Text>
                <Pressable onPress={() => setModal(null)}>
                  <Text style={s.link}>Жабу ✕</Text>
                </Pressable>
              </View>
              {modal?.kind === "profile" ? (
                <>
                  {field("Аты-жөніңіз", "name")}
                  {field("Тобыңыз", "group")}
                  <Text style={s.muted}>
                    Бұл жергілікті профиль. Құпия сөз бен серверге тіркелу қажет
                    емес.
                  </Text>
                </>
              ) : (
                <>
                  {field(
                    modal?.kind === "lesson" ? "Пән атауы" : "Атауы",
                    "title",
                  )}
                  {modal?.kind === "lesson" ? (
                    <>
                      <Text style={s.label}>Апта күні</Text>
                      <View style={s.chips}>
                        {DAYS.map((d, i) => (
                          <Pressable
                            key={d}
                            onPress={() => setForm({ ...form, day: i })}
                            style={[s.chip, form.day === i && s.selected]}
                          >
                            <Text
                              style={
                                form.day === i ? { color: "#fff" } : s.small
                              }
                            >
                              {d}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {field("Басталу уақыты", "start", "09:00")}
                      {field("Аяқталу уақыты", "end", "09:50")}
                      {field("Аудитория / орын", "room", "305 немесе онлайн")}
                      {field("Оқытушы", "teacher")}
                      {field("Сабақ түрі", "type", "Дәріс, практика…")}
                      <Text style={s.label}>Түсі</Text>
                      <View style={s.chips}>
                        {COLORS.map((c) => (
                          <Pressable
                            key={c}
                            accessibilityLabel={c}
                            onPress={() => setForm({ ...form, color: c })}
                            style={[
                              s.swatch,
                              {
                                backgroundColor: c,
                                borderWidth: form.color === c ? 3 : 0,
                              },
                            ]}
                          >
                            <Text style={{ color: "#fff" }}>
                              {form.color === c ? "✓" : ""}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={s.label}>Пәнге байланыстыру</Text>
                      <View style={s.chips}>
                        {[{ id: "", title: "Жалпы" }, ...data.lessons].map(
                          (l) => (
                            <Pressable
                              key={l.id}
                              onPress={() =>
                                setForm({ ...form, lessonId: l.id })
                              }
                              style={[
                                s.chip,
                                form.lessonId === l.id && s.selected,
                              ]}
                            >
                              <Text
                                style={
                                  form.lessonId === l.id
                                    ? { color: "#fff" }
                                    : s.small
                                }
                              >
                                {l.title}
                              </Text>
                            </Pressable>
                          ),
                        )}
                      </View>
                      {modal?.kind === "task"
                        ? field("Дедлайн (ЖЖЖЖ-АА-КК)", "due", "2026-10-25")
                        : field(
                            "Материал сілтемесі (міндетті емес)",
                            "url",
                            "https://…",
                          )}
                      {field(
                        "Жазба / түсіндірме",
                        "notes",
                        "Мәтінді осында енгізіңіз",
                        true,
                      )}
                    </>
                  )}
                </>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              <View style={{ marginTop: 20 }}>{button("Сақтау", save)}</View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  app: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center" },
  content: {
    padding: 24,
    paddingTop: 28,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 15 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 49, height: 49, borderRadius: 16 },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    color: "#142032",
    maxWidth: 510,
  },
  muted: { color: "#7E8A99", fontSize: 13, lineHeight: 21 },
  small: { color: "#8190A3", fontSize: 12, lineHeight: 20 },
  label: { color: "#253449", fontSize: 13, fontWeight: "600", marginBottom: 9 },
  input: {
    borderWidth: 1,
    borderColor: "#DCE3ED",
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 16,
    fontSize: 15,
    color: "#172338",
    minHeight: 54,
  },
  field: { marginBottom: 18 },
  button: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#EDF4FF",
    borderWidth: 1,
    borderColor: "#DFEAFC",
  },
  buttonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DFECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#2563EB", fontWeight: "700" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#547BC1",
    marginBottom: 13,
    letterSpacing: 0.5,
  },
  hero: { backgroundColor: "#2563EB", borderRadius: 25, padding: 24, gap: 12 },
  heroTitle: { fontSize: 25, fontWeight: "700", color: "#fff" },
  heroSmall: { fontSize: 13, color: "#E1EBFF", lineHeight: 21 },
  stats: {
    flexDirection: "row",
    backgroundColor: "#F7F9FD",
    borderRadius: 20,
    marginTop: 18,
    paddingVertical: 17,
  },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#2563EB" },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#162235" },
  card: {
    padding: 17,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#172338",
    lineHeight: 23,
  },
  time: { color: "#2563EB", fontSize: 14, fontWeight: "700" },
  link: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 6,
  },
  delete: { color: "#BF5D5D", fontSize: 12, paddingVertical: 6 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginTop: 8,
  },
  notes: { fontSize: 14, color: "#58677B", lineHeight: 23, marginVertical: 12 },
  checkbox: {
    width: 27,
    height: 27,
    borderWidth: 1.5,
    borderColor: "#C7D7EE",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    padding: 23,
    backgroundColor: "#F8FAFE",
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  emptyIcon: { fontSize: 30, color: "#8DACE3" },
  day: {
    padding: 14,
    minWidth: 65,
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#F3F6FA",
    marginRight: 8,
    gap: 5,
  },
  dayText: { fontWeight: "700", fontSize: 13, color: "#8793A4" },
  selected: { backgroundColor: "#2563EB" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    backgroundColor: "#F0F4FA",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
  },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderColor: "#172338",
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#ECF0F5",
    padding: 10,
    backgroundColor: "#fff",
    gap: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 15,
    gap: 4,
  },
  navIcon: { fontSize: 24, color: "#91A0B5" },
  navLabel: { fontSize: 10, color: "#8593A6", fontWeight: "600" },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#9AA7B8",
    marginTop: 30,
  },
  error: {
    color: "#C74343",
    backgroundColor: "#FFF0F0",
    padding: 14,
    borderRadius: 12,
  },
});
