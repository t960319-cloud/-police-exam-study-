# 雲端設定交接

目前唯一正式入口：https://police-exam-study.middlelapwing4.chatgpt.site

每個對話先讀根目錄AGENTS.md及[跨對話協作](../project-coordination.md)，從GitHub `origin/main` fetch並正常整合最新來源。環境快照提供依賴，不保證程式已是最新；保留既有修改，不重套舊交接包。

`network-reference.json` 是目前工作網域參考，只保留現行正式網域與法律來源；原16筆清單保存在[歷史副本](../history/source-network-reference-2026-11-12.json)，包含過期站點，不可再整份當作目前設定套用。套件管理器預設群組維持 `package_managers`。

Git只保存參考與工作規則，不會套用各工作階段的網路權限。先讀取自己綁定的環境設定，保留既有網域並合併缺項；已使用unrestricted則維持，不改回受限。實測應使用目前正式網址與該環境的代理／TLS設定。

安裝／啟動以平台目前保存的install_script及start_skill為準；2026-11-12兩者為null的紀錄只屬早期狀態。此次讀到的草稿已保存安裝與啟動指示，Node24、pnpm11.25.0、本機D1與瀏覽器依賴均有對應設定；不重跑安裝來覆蓋程式。

- 使用既有 `/workspace/-police-exam-study-`，不另建worktree；缺依賴時使用frozen lockfile，保留鎖定檔。
- 本機D1使用 `.sites-runtime/cloud-d1.json` 與 `.sites-runtime/cloud-dev-state`，不搬動／清空資料。正式DB由既有Sites管理，不使用本機占位ID操作正式資料。
- 開發啟動沿用平台start_skill；不要假設快照恢復後服務程序仍在。
- 先GET `/api/session` 取得實際登入身分；正式匿名紀錄請求應拒絕，不用開發身分或假標頭繞過。
- 功能修改後執行README中適用驗證；瀏覽器回歸使用隔離本機D1，不把測試資料寫入正式進度。

正式站沿用既有project_id `appgprj_6af12822277881919dd2fcce0d109104`、D1及存取設定。來源推送、網站部署、環境發布分別處理；本次不發布任何內容。
