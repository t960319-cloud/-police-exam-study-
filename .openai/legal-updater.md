# 警察特考題庫法規查核與更新

本網站為私人讀書站。Site 身分以同目錄 hosting.json 的 project_id 為準；保留現有存取對象。個人作答、收藏、熟悉度及草稿不在本更新範圍。

## 每次查核

1. 用 Sites get_site 取得目前網址、服務存取資訊及原始碼。查閱 lib/past-papers 的原題、初次註記；讀取 `/api/legal-updates`，以最新紀錄為比較基準。不要把核對日期等同所有法令均已查完。
2. 查核考選部原卷／更正答案、全國法規資料庫沿革與施行條款、警政署主管法規及正式函釋、憲法法庭。先查已標 changed/review 及先前註記的未生效條文；優先檢視警職法、刑訴、警械、道路交通、社維、單一窗口、失蹤人口、解送、攔檢追緝及越區程序。
3. 比較考試當時、現行已生效、公布未生效三種版本。新公布修正如尚未生效，標 announced；同次修正分段施行，標 mixed，逐項列施行日期。行政規則原件查不到仍保留 review，不猜文號或生效日。原題、原選項及當年官方給分答案不覆寫。
4. 確認有影響才新增 update 事件：補上 affected targetId、舊新差異、施行日、精確官方 HTTPS 來源、changed/review 狀態與 checkedAt；必要時同步更正逐項解析、修正文字、短背誦及申論擬答。現行作答結論置 currentAnswer，與當年給分分開。核對沒有新變動時只新增 check 紀錄，summary 寫實際查核範圍、待核及未生效事項。

## 持續資料寫入

`app/api/legal-updates/route.ts` 是共享法規更新端點；儲存於 D1 的 legal_content_events，採附加歷史紀錄，不用重新發布網站。它依靠 Sites 已確認的僅擁有者存取邊界。服務呼叫不需要訪客身分。切勿放寬網站存取對象來讓更新通過。

每次從新的 get_site 回應取得 siwc_bypass_bearer_token，僅傳送到該 Site 的 `OAI-Sites-Authorization: Bearer …`，不要保存、輸出或放進排程文字。可用 scripts/legal-updater.mjs，將 {siteUrl,token,event?} 透過非回顯 stdin 傳入。該程式把來源網址限定為 HTTPS Sites，並立即讀回結果。若工具未提供支援的服務存取，停止寫入並告知阻礙，不改權限。

事件格式見 lib/legal-updates.ts。eventId 為一次查核的唯一編號（例如 legal-check-20261110），同編號相同內容重試可安全執行；已存在不同內容應使用新編號，不覆寫歷史。kind=check 不帶 patches；kind=update 附 1～40 筆 patches。所有事件有 checkedAt、summary、官方 sources；每筆 amendment.checkedAt 必須與事件相同且附官方 sources。patch 只能指向既有題目或法條卡。lawContent 會更新現行法條卡，須附完整原文／摘要標籤、核心、常考、易錯、短背誦、版本與正式來源；歷史版本保存在事件中。不要把未生效新法覆蓋為現行原文。模型、選項解釋可更新，題幹、選項原文及官方答案受保護。

寫入後 GET 讀回確認 eventId 和實際影響的題目。分頁時依 nextCursor 讀完全部更新。失敗先安全重試同一事件，再說明原因；未確認寫入不得宣稱已更新。若需要新增題目或修復程式才採 Sites 原始碼及部署流程。

通知只列有意義的變動、影響年度題號、生效日及尚需查核處。沒有變動可不另通知；查核／更新失敗則通知。此為定期查核，不承諾法令公布瞬間即更新。
