const { test, expect } = require("@playwright/test");
test("student can manage schedule, homework, materials and keep data after reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Аты-жөніңіз", { exact: true }).fill("Айдана Қасымова");
  await page.getByLabel("Тобыңыз", { exact: true }).fill("IT-24");
  await page.getByRole("button", { name: "Бастау →" }).click();
  await expect(
    page.getByText("Айдана Қасымова", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Кесте", exact: false }).click();
  await page.getByText("+ Сабақ қосу", { exact: true }).click();
  await page.getByLabel("Пән атауы", { exact: true }).fill("Деректер қоры");
  await page.getByLabel("Аудитория / орын", { exact: true }).fill("305");
  await page.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Деректер қоры", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Тапсырма", exact: false }).click();
  await page.getByText("+ Тапсырма қосу", { exact: true }).click();
  await page.getByLabel("Атауы", { exact: true }).fill("SQL зертханасы");
  await page
    .getByLabel("Дедлайн (ЖЖЖЖ-АА-КК)", { exact: true })
    .fill("2026-12-20");
  await page.getByText("Деректер қоры", { exact: true }).click();
  await page.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("SQL зертханасы", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "SQL зертханасы" }).click();
  await page.getByText("Орындалған", { exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "SQL зертханасы" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("tab", { name: "Материал", exact: false }).click();
  await page.getByText("+ Материал қосу", { exact: true }).click();
  await page.getByLabel("Атауы", { exact: true }).fill("SQL конспект");
  await page
    .getByLabel("Жазба / түсіндірме", { exact: true })
    .fill("SELECT — деректерді таңдау.");
  await page.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Материал", exact: false }).click();
  await expect(page.getByText("SQL конспект", { exact: true })).toBeVisible();
  await page.getByText("Өңдеу", { exact: true }).click();
  await page.getByLabel("Атауы", { exact: true }).fill("SQL жаңа конспект");
  await page.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("SQL жаңа конспект", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Материал іздеу", { exact: true }).fill("жоқ материал");
  await expect(
    page.getByText("Ештеңе табылмады", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Материал іздеу", { exact: true }).fill("");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByText("Өшіру", { exact: true }).click();
  await expect(
    page.getByText("Оқу сөреңіз әзірге бос", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
