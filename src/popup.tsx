import React, { ReactNode, useEffect, useState } from "react";
import { createRoot } from 'react-dom/client';
import {
  Box,
  Heading,
  Flex,
  Stack,
  IconButton,
  ButtonGroup,
  Button,
} from "@chakra-ui/react";
import { WarningTwoIcon, LockIcon, CalendarIcon } from "@chakra-ui/icons";
import Clipboard from "clipboard";
import VerificationSummary from "./components/VerificationSummary/index";
import "./assets/scss/styles.scss";

import {
  verifyPage,
  extractPageTitle,
  getUrlObj,
  sanitizeWikiUrl,
  verificationStatusMap,
} from "./verifier";
import { formatter } from "aqua-verifier-js";
import Layout from "./components/Layout";

import * as nameResolver from "./name_resolver";

// This object is actually used! It's used in the output of formatPageInfo2HTML
// HTML string output from "aqua-verifier-js".
const clipboard = new Clipboard(".clipboard-button");

const Popup = () => {
  const [pageTitle, setPageTitle] = useState("");
  const [verificationStatus, setVerificationStatus] = useState({});
  const [currentURL, setCurrentURL] = useState<string>();
  const [verificationLog, setVerificationLog] = useState("");

  function prepareAndSetVerificationStatus(
    sanitizedUrl: string,
    extractedPageTitle: string
  ) {
    chrome.cookies
      .get({ url: sanitizedUrl, name: extractedPageTitle })
      .then((cookie: any) => {
        const badgeStatus = (!!cookie && cookie.value.toString()) || "N/A";
        const somethingBadHappened = {
          title: "Unknown error",
          subtitle: `Unexpected badge status: ${badgeStatus}`,
          keyColor: "black",
        };
        const verificationStatusMessage =
          verificationStatusMap[badgeStatus] || somethingBadHappened;
        setVerificationStatus(verificationStatusMessage);
      });
  }

  useEffect(() => {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        const tab = tabs[0];
        setCurrentURL(tab.url);
        if (!tab.url) {
          return;
        }

        const urlObj = getUrlObj(tab);
        const extractedPageTitle = extractPageTitle(urlObj);
        if (!extractedPageTitle) {
          return;
        }
        const sanitizedUrl = sanitizeWikiUrl(tab.url);

        // TODO The following steps are almost identical to setPopupInfo.
        // Refactor.
        setPageTitle(extractedPageTitle);
        prepareAndSetVerificationStatus(sanitizedUrl, extractedPageTitle);
        const jsonData = await chrome.storage.local.get(sanitizedUrl);
        if (!jsonData[sanitizedUrl]) {
          return;
        }
        formatDetailsAndSetVerificationLog(JSON.parse(jsonData[sanitizedUrl]));
      }
    );
  }, []);

  async function formatDetailsAndSetVerificationLog(data: {
    [key: string]: any;
  }) {
    const verbose = false;
    let out = formatter.formatPageInfo2HTML(
      data.serverUrl,
      data.title,
      data.status,
      data.details,
      verbose
    );
    const nameResolverEnabled = await nameResolver.getEnabledState();
    if (nameResolverEnabled) {
      // Resolve the names
      out = await nameResolver.resolveNamesRawText(out);
    }
    setVerificationLog(out);
  }

  function setPopupInfo(data: { [key: string]: any }) {
    setPageTitle(data.title);
    prepareAndSetVerificationStatus(data.sanitizedUrl, data.title);
    formatDetailsAndSetVerificationLog(data);
  }

  const handleVerifyPageClick = () => {
    verifyPage(pageTitle, setPopupInfo);
  };

  const handleOfflineVerifyClick = () => {
    return chrome.tabs.create({
      url: chrome.runtime.getURL("offline_verification.html"),
    });
  };

  const handleResolveNamesClick = () => {
    return chrome.tabs.create({
      url: chrome.runtime.getURL("name_resolution.html"),
    });
  };

  const popupToolbar: ReactNode = (
    <ButtonGroup>
      <Button onClick={handleResolveNamesClick}>Resolve Names</Button>
      <Button onClick={handleOfflineVerifyClick}>Offline Verify</Button>
      <Button onClick={handleVerifyPageClick}>Verify Page</Button>
    </ButtonGroup>
  );
  return (
    <Layout toolbar={popupToolbar}>
      <Stack direction="column" minW="700px">
        <Flex paddingY={4} paddingRight={5}>
          <Stack direction="column" w="80px" paddingX={4}>
            <CalendarIcon m={3} />
            <IconButton
              isDisabled={true}
              variant="outline"
              aria-label="History"
              icon={<LockIcon />}
            />
            <IconButton
              isDisabled={true}
              variant="outline"
              aria-label="History"
              icon={<WarningTwoIcon />}
            />
          </Stack>

          <Box width="100%">
            {pageTitle && verificationStatus ? (
              <>
                <VerificationSummary
                  pageTitle={pageTitle}
                  verificationStatus={verificationStatus}
                />
                {/* TODO: use VerificationLog */}
                <div
                  dangerouslySetInnerHTML={{ __html: verificationLog }}
                ></div>
              </>
            ) : (
              <Heading as="h2">[Unsupported]</Heading>
            )}
          </Box>
        </Flex>
      </Stack>
    </Layout>
  );
};

const root = createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
