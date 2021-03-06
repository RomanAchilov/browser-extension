/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable max-len */
import * as React from 'react';
import { BEM, tag } from '@redneckz/react-bem-helper';
import { browser } from 'webextension-polyfill-ts';
import {
  Panel, PanelSpread, Button, OverflowText,
} from '@drill4j/ui-kit';
import { DomainConfig } from 'types/domain-config';
import { useHostLocalStorage } from '../../../hooks/use-host-local-storage';
import { useAgentOnActiveTab } from '../../../hooks/use-agent-on-active-tab';
import { useBackendConnectionStatus } from '../../../hooks/use-backend-connection-status';
import { useActiveTab } from '../../../hooks/use-active-tab';
import { AgentStatus } from './agent-status';

import styles from './main-page.module.scss';

interface Props {
  className?: string;
  configs: DomainConfig;
}

const mainPage = BEM(styles);

export const MainPage = mainPage(({ className }: Props) => {

  const activeTab = useActiveTab();
  const { data: agent, isLoading, isError }: any = useAgentOnActiveTab();

  const {
    data: backendConnectionStatus,
    isLoading: backendConnectionStatusIsLoading,
    isError: backendConnectionStatusIsError,
  }: any = useBackendConnectionStatus();

  const localStorage = useHostLocalStorage(agent?.host) || {};
  const { [agent?.host]: hostStorage } = localStorage;

  return (
    <div className={className}>
      <>
        <Header>
          <Logo>
            <svg width="16px" height="16px" viewBox="0 0 16 16">
              <g id="logo" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <path d="M13.9656361,5.74500393 L13.9771236,5.75615808 L15.8437903,7.62282474 C16.048283,7.82731746 16.0520011,8.15655557 15.8549444,8.36558449 L15.8437903,8.37707198 L13.9771236,10.2437386 L13.9656361,10.2548928 C13.7566072,10.4519494 13.4273691,10.4482314 13.2228764,10.2437386 C13.0183837,10.0392459 13.0146656,9.71000782 13.2117222,9.5009789 L13.2228764,9.48949141 L14.7123733,7.99994836 L13.2228764,6.51040531 C13.0145968,6.30212569 13.0145968,5.9644377 13.2228764,5.75615808 C13.4273691,5.55166536 13.7566072,5.54794731 13.9656361,5.74500393 Z" id="Path" fill="#0070FF" fillRule="nonzero" />
                <path d="M2.03436387,5.74500393 C2.24339279,5.54794731 2.5726309,5.55166536 2.77712362,5.75615808 C2.98161634,5.9606508 2.98533439,6.2898889 2.78827776,6.49891782 L2.77712362,6.51040531 L1.28762667,7.99994836 L2.77712362,9.48949141 C2.98540324,9.69777103 2.98540324,10.035459 2.77712362,10.2437386 C2.5726309,10.4482314 2.24339279,10.4519494 2.03436387,10.2548928 L2.02287638,10.2437386 L0.156209717,8.37707198 C-0.0520699056,8.16879235 -0.0520699056,7.83110437 0.156209717,7.62282474 L2.02287638,5.75615808 L2.03436387,5.74500393 Z" id="Path" fill="#0070FF" fillRule="nonzero" />
                <path d="M5.75620972,9.48949141 C5.96070244,9.28499869 6.28994054,9.28128064 6.49896946,9.47833726 L6.51045695,9.48949141 L10.2437903,13.2228247 C10.448283,13.4273175 10.4520011,13.7565556 10.2549444,13.9655845 L10.2437903,13.977072 L8.37712362,15.8437386 C8.27866416,15.9421981 8.15128567,15.9941131 8.02232979,15.9994836 L8.00744482,15.9998967 L7.99255518,15.9998967 C7.86438153,15.9981185 7.73672666,15.9504164 7.63638721,15.8567905 L7.62287638,15.8437386 L5.75620972,13.977072 L5.74505557,13.9655845 C5.54799895,13.7565556 5.551717,13.4273175 5.75620972,13.2228247 C5.96070244,13.018332 6.28994054,13.014614 6.49896946,13.2116706 L6.51045695,13.2228247 L8,14.71232 L9.11237333,13.5999467 L5.75620972,10.2437386 L5.74505557,10.2322512 C5.54799895,10.0232222 5.551717,9.69398413 5.75620972,9.48949141 Z M5.75620972,5.75615808 C5.96070244,5.55166536 6.28994054,5.54794731 6.49896946,5.74500393 L6.51045695,5.75615808 L10.2437903,9.48949141 L10.2549444,9.5009789 C10.4520011,9.71000782 10.448283,10.0392459 10.2437903,10.2437386 C10.0392976,10.4482314 9.71005946,10.4519494 9.50103054,10.2548928 L9.48954305,10.2437386 L5.75620972,6.51040531 L5.74505557,6.49891782 C5.54799895,6.2898889 5.551717,5.9606508 5.75620972,5.75615808 Z M8.00744482,0 C8.13561847,0.00177819757 8.26327334,0.0494802801 8.36361279,0.143106248 L8.37712362,0.156158077 L10.2437903,2.02282474 L10.2549444,2.03431223 C10.4520011,2.24334115 10.448283,2.57257926 10.2437903,2.77707198 C10.0392976,2.9815647 9.71005946,2.98528275 9.50103054,2.78822613 L9.48954305,2.77707198 L8,1.28757333 L6.88762667,2.39994667 L10.2437903,5.75615808 L10.2549444,5.76764557 C10.4520011,5.97667448 10.448283,6.30591259 10.2437903,6.51040531 C10.0392976,6.71489803 9.71005946,6.71861608 9.50103054,6.52155946 L9.48954305,6.51040531 L5.75620972,2.77707198 L5.74505557,2.76558449 C5.55164814,2.56042648 5.55164814,2.23947024 5.74505557,2.03431223 L5.75620972,2.02282474 L7.62287638,0.156158077 C7.72512274,0.0539117171 7.85855545,0.00185902473 7.99255518,0 L8.00744482,0 Z" id="Shape" fill="#1B191B" fillRule="nonzero" />
              </g>
            </svg>
          </Logo>
          { isLoading && (<div> Loading... </div>)}
          { !isLoading && !isError && agent && (
            <>
              <AgentName>{agent?.id}</AgentName>
              <AgentStatus status={agent?.status} />
            </>
          )}
        </Header>
        <Content>
          { backendConnectionStatusIsLoading && (<div> Loading backend connection status... </div>)}
          { backendConnectionStatusIsError && !backendConnectionStatusIsLoading && (
            <div>
              Backend connection error:
              { backendConnectionStatusIsError }
            </div>
          )}
          <div>
            Backend connection:
            { backendConnectionStatus }
          </div>
          { backendConnectionStatus !== 'available' && (
            <>
              <div style={{ margin: '15px 0' }}> Check extension settings </div>
              <Button type="secondary" size="large" onClick={() => browser.runtime.openOptionsPage()}>
                Open settings page
              </Button>
            </>
          )}
          { isError && !isLoading && (
            <div>
              Error:
              <br />
              {isError}
            </div>)}
          { !isLoading && !isError && agent === undefined && (
            <div style={{ marginTop: '15px' }}>
              Host has no associated agent
            </div>
          )}
          { !isLoading && !isError && agent && (
            <ActionsPanel>
              { !hostStorage?.isWidgetVisible ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={
                    () => {
                      browser.storage.local.set({ [agent.host]: { ...hostStorage, isWidgetVisible: true } });
                      injectContentScript(activeTab);
                    }
                  }
                >
                  Run widget
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  onClick={
                    () => {
                      browser.storage.local.set({ [agent.host]: { ...hostStorage, isWidgetVisible: false } });
                    }
                  }
                >
                  Close widget
                </Button>
              )}
            </ActionsPanel>
          )}
        </Content>
        <PanelSpread />
        <Footer>
          {' '}
        </Footer>
      </>
    </div>
  );
});

const Header = mainPage.header('div');
const Logo = mainPage.logo('div');
const AgentName = mainPage.agentName(OverflowText);
const Content = mainPage.content('div');
const Footer = mainPage.footer(Panel);
const ActionsPanel = mainPage.actionsPanel(Panel);
const Link = mainPage.link(
  tag('a')({ href: '', rel: '', target: '' } as { href: string; rel: string; target: string; children: React.ReactNode}),
);

function injectContentScript(activeTab: chrome.tabs.Tab | undefined) {
  if (!activeTab?.id) return;
  const activeTabId = activeTab?.id;
  chrome.tabs.insertCSS(activeTabId, { file: 'content.css' }, () => {
    chrome.tabs.executeScript(activeTabId, { file: 'content.bundle.js' }, () => {
    });
  });
}
