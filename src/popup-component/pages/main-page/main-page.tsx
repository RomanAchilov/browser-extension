import * as React from 'react';
import { BEM } from '@redneckz/react-bem-helper';
import { withRouter } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';
import axios from 'axios';

import { Badge, Icons } from '../../../components';
import { Panel } from '../../../layouts';
import { CompoundLabel } from './compound-label';
import { useAgentConfig, useAgentInfo } from '../../../hooks';
import { TOKEN_HEADER } from '../../../common/constants';

import styles from './main-page.module.scss';

const mainPage = BEM(styles);

export const MainPage = withRouter(
  mainPage(({ className, history: { push } }) => {
    React.useEffect(() => {
      browser.tabs.query({ active: true, currentWindow: true }).then(([{ url = '' }]) => {
        const hostname = new URL(url).hostname;
        browser.storage.local
          .get(hostname)
          .then(({ [hostname]: { adminUrl: defaultAdminUrl = '' } = {} }) => {
            if (defaultAdminUrl) {
              axios.post('/login').then((response) => {
                const authToken = response.headers[TOKEN_HEADER.toLowerCase()];
                if (authToken) {
                  browser.storage.local.set({ token: authToken });
                }
              });
            } else {
              push('/unavailable-page');
            }
          });
      });
    }, []);
    const { isActive = false, adminUrl = '', agentId = '' } = useAgentConfig() || {};
    const { name = '' } = useAgentInfo(adminUrl, agentId) || {};

    return (
      <div className={className}>
        <Header>
          <Panel>
            <Icons.Planet /> <AgentName>{name}</AgentName>
          </Panel>
          <Badge text="Online" />
        </Header>
        <ActionsList>
          <ActionItem
            onClick={() => push(`/manual-testing/${isActive ? 'in-progress' : 'start-recording'}`)}
          >
            <IconWrapper align="center" active={isActive}>
              <Icons.Mouse />
            </IconWrapper>
            <CompoundLabel firstLabel="Manual testing" secondLabel="For Code Coverage plugin" />
            <RedirectIcon>
              <Icons.Expander />
            </RedirectIcon>
          </ActionItem>
        </ActionsList>
      </div>
    );
  }),
);

const Header = mainPage.header('div');
const AgentName = mainPage.agentName('div');
const ActionsList = mainPage.actionsList('div');
const ActionItem = mainPage.actionItem(Panel);
const IconWrapper: React.ComponentType<any> = mainPage.iconWrapper(Panel);
const RedirectIcon = mainPage.redirectIcon('div');