import { extractPageTitle, setInitialBadge, verifyPage, BadgeTextNA, BadgeTextNORECORD, setBadgeStatus, getUrlObj, setBadgeNA, checkIfCacheIsUpToDate } from "./verifier";

// https://stackoverflow.com/questions/60545285/how-to-use-onupdated-and-onactivated-simultanously
const processingTabId: { [key: number]: boolean } = {};

function doInitialVerification(tab: any, doCheckCache: boolean = true) {
  // processintTabId is necessary to prevent duplicate invocation of
  // doInitialVerification by the chrome listeners.
  if (processingTabId[tab.id]) return;
  processingTabId[tab.id] = true;
  const urlObj = getUrlObj(tab);

  const pageTitle = extractPageTitle(urlObj);
  if (!pageTitle || !tab.url) {
    setBadgeNA();
    delete processingTabId[tab.id];
    return;
  }

  chrome.cookies.get({url: tab.url, name: pageTitle}, (cookie) => {
    console.log("doInitialVerification, cookie", cookie ? cookie.value : cookie, pageTitle);
    function doVerifyFromScratch() {
      setInitialBadge(urlObj)
      .then((badgeText) => {
        if (badgeText === BadgeTextNA) {
          delete processingTabId[tab.id];
          return;
        }

        if (badgeText === BadgeTextNORECORD) {
          if (tab.url) {
            chrome.cookies.set({url: tab.url, name: pageTitle, value: 'NORECORD'});
          }
          delete processingTabId[tab.id];
          return;
        }

        verifyPage(pageTitle);
        delete processingTabId[tab.id];
      });
    }

    if (cookie === null) {
      doVerifyFromScratch()
    } else {
      if (!doCheckCache) {
        setBadgeStatus(cookie.value.toString());
        delete processingTabId[tab.id];
        return
      }
      // Check if our stored verification info is outdated
      const sanitizedUrl = tab.url.split('?')[0];
      checkIfCacheIsUpToDate(pageTitle, sanitizedUrl, (isUpToDate: boolean) => {
        if (isUpToDate) {
          setBadgeStatus(cookie.value.toString());
          delete processingTabId[tab.id];
        } else {
          // TODO checkIfCacheIsUpToDate already makes an API call
          // get_page_last_rev. We can reuse this output for setInitialBadge.
          // No need to delete processingTabId because it will be done in
          // doVerifyFromScratch()
          doVerifyFromScratch()
        }
      })
    }
  });
}

function runIfTabIsActive(tab: any, callback: Function) {
  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    const activeTab = tabs[0];
    if (tab === activeTab) {
      callback();
    }
  });
}

chrome.tabs.onActivated.addListener((info) => {
  chrome.tabs.get(info.tabId, function(tab) {
    doInitialVerification(tab, false);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }
  runIfTabIsActive(tab, () => {
    doInitialVerification(tab);
  });
});

chrome.tabs.onCreated.addListener((tab) => {
  runIfTabIsActive(tab, () => {
    doInitialVerification(tab);
  });
});
