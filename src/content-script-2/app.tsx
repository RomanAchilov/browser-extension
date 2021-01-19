import * as React from 'react';
import { Icons } from '@drill4j/ui-kit';
import { MemoryRouter } from 'react-router-dom';
import { BEM } from '@redneckz/react-bem-helper';

import { browser } from 'webextension-polyfill-ts';
import { AgentContext, withAgentContext } from './context';
import { useBackendConnectionStatus } from '../hooks/use-backend-connection-status';
import {
  reducer, setIsWidgetVisible, setCorner, setInitial,
} from './reducer';
import { useDispatcher } from './hooks';
import { AgentStatus, BackendConnectionStatus } from '../common/enums';
import { ConnectionLost, AgentIsOffline } from './components';
import { Pages } from './pages';

import '../bootstrap-imports.scss';
import styles from './app.module.scss';

const app = BEM(styles);

export const App = withAgentContext((props: any) => {
  const { host } = props;

  const {
    data: backendConnectionStatus,
  } = useBackendConnectionStatus();

  const agent = React.useContext(AgentContext);

  const [state, dispatch] = React.useReducer(reducer(async (newState: any) => {
    await browser.storage.local.set({ [host]: newState });
  }), { });

  useDispatcher(state, dispatch);

  React.useEffect(() => {
    async function loadConfig() {
      const { [host]: data } = await browser.storage.local.get(host);
      dispatch(setInitial(data));
    }
    loadConfig();
  }, []);

  const isConnectionLost = backendConnectionStatus === BackendConnectionStatus.RECONNECTING;
  const isAgentOffline = backendConnectionStatus === BackendConnectionStatus.AVAILABLE
    && agent && agent.status !== AgentStatus.ONLINE;

  return (
    <MemoryRouter>
      <BorderTop />
      <div className="d-flex justify-content-between w-100 px-4">
        <Logo>Logo</Logo>
        { isConnectionLost && <ConnectionLost />}
        { isAgentOffline && <AgentIsOffline />}
        {!isConnectionLost && !isAgentOffline && <Pages />}
        <div className="d-flex align-items-center gx-4">
          <div onClick={() => dispatch(setCorner(state.corner))}>move extension</div>
          <Icons.Close
            onClick={() => dispatch(setIsWidgetVisible(false))}
            height={10}
            width={10}
          />
        </div>
      </div>
    </MemoryRouter>
  );
});

const Logo = app.logo('div');
const BorderTop = app.BorderTop('div');
