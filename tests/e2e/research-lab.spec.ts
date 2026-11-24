import { expect, test } from "@playwright/test";
import { defaultStudioSettings, sanitizeStudioSettings } from "../../src/lib/studio/settings";

test("actual app routes lab selection, running status and task replies through the runtime", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("hermes3d:onboarding:completed", "true"));
  // Test interaction and runtime state without requiring private artwork.
  await page.route("**/api/office/research-lab", route => route.fulfill({ json: { available: true } }));
  const placeholder = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNc8AAAAASUVORK5CYII=", "base64");
  await page.route("**/api/office/research-lab/assets/*", route => route.fulfill({ contentType: "image/png", body: placeholder }));
  await page.route("**/api/studio", async route => route.fulfill({ json: { settings: sanitizeStudioSettings({ ...defaultStudioSettings(), gateway: {url: "http://127.0.0.1:7770", token: "", adapterType: "custom"} }) } }));
  let submitted: unknown = null;
  let savedMessages: Array<{role: string; content: string; timestamp: number}> = [];
  let release: (() => void) | null = null;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/runtime/custom", async route => {
    const call = route.request().postDataJSON();
    const pathname = String(call.pathname).split("?")[0];
    if (pathname === "/health") return route.fulfill({ json: { ok: true, status: "ok" } });
    if (pathname === "/state") return route.fulfill({ json: {identity: {name: "통합 연구원", role: "researcher", lane: "researcher-1", model_id: "test/model"}, runtime: { name: "Lab test" }} });
    if (pathname === "/registry") return route.fulfill({ json: { models: { "test/model": {} } } });
    if (pathname === "/v1/sessions/history") return route.fulfill({ json: { messages: savedMessages } });
    if (pathname === "/v1/chat/completions") {
      submitted = call.body;
      await held;
      savedMessages = [{role: "user", content: "입력 검증 항목을 검토해 주세요.", timestamp: 1700000000000}, {role: "assistant", content: "검토 결과: 입력 검증부터 확인하면 됩니다.", timestamp: 1700000001000}];
      return route.fulfill({ json: { choices: [{ message: { content: "검토 결과: 입력 검증부터 확인하면 됩니다." } }], history_saved: true } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/office?renderer=lab");
  const lab = page.getByTestId("research-lab");
  await expect(lab).toBeVisible({ timeout: 60000 });
  const frame = page.frameLocator('iframe[title="2.5D 연구실"]');
  await expect(frame.locator("canvas#layer-char")).toBeVisible();
  await expect.poll(async () => page.frames().find(f => f.url().includes("/research-lab/index.html"))?.evaluate(() => (window as unknown as { MV: {agentSlots: () => {id: string}[]} }).MV.agentSlots().length)).toBe(1);
  const scene = page.frames().find(f => f.url().includes("/research-lab/index.html"))!;
  const hit = await scene.evaluate(() => { const mv = (window as unknown as { MV: {roiFinn: () => number[], spec: {stage: {W: number,H: number}}} }).MV;const r=mv.roiFinn(),box=document.getElementById("stage")!.getBoundingClientRect();return{x:box.left+(r[0]+r[2])/2/mv.spec.stage.W*box.width,y:box.top+(r[1]+r[3])/2/mv.spec.stage.H*box.height}; });
  await scene.locator("#stage").click({position: {x: hit.x - await scene.locator("#stage").evaluate(el => el.getBoundingClientRect().left), y: hit.y - await scene.locator("#stage").evaluate(el => el.getBoundingClientRect().top)}});
  const composer = page.getByRole("textbox", { name: "작업 지시" });
  await expect(composer).toBeVisible();
  await expect(frame.getByRole("combobox", { name: "공간 보기" })).toHaveValue("selected");
  await frame.getByRole("combobox", { name: "공간 보기" }).selectOption("all");
  await composer.fill("입력 검증 항목을 검토해 주세요.");
  await page.getByRole("button", { name: "작업 요청", exact: true }).click();
  await expect.poll(() => submitted).not.toBeNull();
  await expect(lab.getByRole("button", {name: /통합 연구원 · 작업 중/})).toBeVisible();
  await expect.poll(() => scene.evaluate(() => (window as unknown as {MV: {agentSlots: () => {status: string}[]}}).MV.agentSlots()[0].status)).toBe("working");
  release!();
  await expect(page.getByText("검토 결과: 입력 검증부터 확인하면 됩니다.", {exact: true})).toBeVisible();
  await expect(lab.getByRole("button", {name: /통합 연구원 · 대기/})).toBeVisible();
  await expect.poll(() => scene.evaluate(() => (window as unknown as {MV: {agentSlots: () => {status: string}[]}}).MV.agentSlots()[0].status)).toBe("idle");
  expect(submitted).toMatchObject({session_id: "agent:researcher-1:main", messages: [{role:"user",content:"입력 검증 항목을 검토해 주세요."}]});
  await page.locator(".workspace-header").getByRole("button", { name: "작업 대화 닫기", exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "연구실 메뉴" });
  for (const legacy of ["작업 보드", "일정·절차", "사용 현황", "실행 기록", "연구 도구"]) {
    await expect(navigation.getByRole("button", {name:legacy,exact:true})).toHaveCount(0);
  }
  await navigation.getByRole("button", {name:"연구 작업",exact:true}).click();
  await expect(page.getByRole("heading", {name:"입력 검증 항목을 검토해 주세요.",exact:true})).toBeVisible();
  await expect(page.getByText("응답 받음",{exact:true})).toBeVisible();
  await navigation.getByRole("button", {name:"연구 결과",exact:true}).click();
  await page.getByText("응답 내용 확인",{exact:true}).click();
  await expect(page.getByText("검토 결과: 입력 검증부터 확인하면 됩니다.",{exact:true})).toBeVisible();
  await navigation.getByRole("button", {name:"설정",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"런타임 주소"})).toHaveValue("http://127.0.0.1:7770");
  await expect(page.getByRole("textbox", {name:"연구실 이름"})).toBeVisible();
  await expect(page.getByRole("button", {name:"런타임 도구 관리",exact:true})).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  await navigation.getByRole("button", {name:"연구원",exact:true}).click();
  await page.getByRole("button", {name:/통합 연구원.*작업 요청·대화/}).click();
  await expect(composer).toBeVisible();
  await page.locator(".workspace-header").getByRole("button",{name:"작업 대화 닫기",exact:true}).click();
  await expect(page.getByRole("heading",{name:"연구원",exact:true})).toBeVisible();
  await navigation.getByRole("button",{name:"설정",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"연구실 이름"})).toBeVisible();
  await navigation.getByRole("button",{name:"연구실",exact:true}).click();
  await expect(lab).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();
  await page.getByRole("navigation",{name:"연구실 메뉴"}).getByRole("button",{name:"연구 작업",exact:true}).click();
  await expect(page.getByRole("heading",{name:"입력 검증 항목을 검토해 주세요.",exact:true})).toBeVisible({timeout:15000});
  await page.getByText("응답 내용 확인",{exact:true}).click();
  await expect(page.getByText("검토 결과: 입력 검증부터 확인하면 됩니다.",{exact:true})).toBeVisible();

});

test("first visit explains research work and exposes a focused runtime connection form", async ({ page }) => {
  await page.route("**/api/studio", route => route.fulfill({ json: { settings: sanitizeStudioSettings({ ...defaultStudioSettings(), gateway: { url: "http://127.0.0.1:7772", token: "", adapterType: "custom" } }) } }));
  await page.route("**/api/runtime/custom", route => route.fulfill({ status: 503, json: { error: "런타임 오프라인" } }));
  await page.goto("/office?renderer=lab");
  const onboarding = page.getByRole("dialog", { name: "연구실 시작 안내" });
  await expect(onboarding).toBeVisible();
  await expect(onboarding.getByText("작업과 결과 확인", { exact: true })).toBeVisible();
  await onboarding.getByRole("button", { name: "온보딩 닫기" }).click();
  await expect(page.getByRole("heading", { name: "연구실에 연결하기" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "런타임 주소" })).toHaveValue("http://127.0.0.1:7772");
  await expect(page.getByRole("combobox", { name: "런타임 종류" })).toHaveValue("custom");
  await page.getByRole("button", { name: "토큰 표시" }).click();
  await expect(page.getByRole("button", { name: "토큰 숨기기" })).toBeVisible();
  await page.getByText("연구실 화면 선택", { exact: true }).click();
  await expect(page.getByTestId("connect-render-mode-lab")).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "연결", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
