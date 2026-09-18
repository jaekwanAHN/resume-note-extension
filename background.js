// Chrome hosts the memo alongside the current page, including restricted pages.
chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
  .catch(error => console.error('메모 저장소 접근 설정 실패', error));
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('메모 사이드 패널 설정 실패', error));
