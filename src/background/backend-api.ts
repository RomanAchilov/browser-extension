import axios from 'axios';
import { browser } from 'webextension-polyfill-ts';
import { DrillSocket } from '../common/connection/drill-socket';

const AUTH_TOKEN_HEADER_NAME = 'Authorization';

export default async (backendUrl: string) => {
  const token = await setupAxios(backendUrl);
  const adminSocket = createAdminSocket(backendUrl, token);
  const test2CodeSocket = createTest2CodeSocket(backendUrl, token);
  const test2CodeSubs: Record<string, any> = {};

  return {
    subscribeAdmin(route: string, handler: any) {
      // TODO check for duplicate subscriptions
      const unsubscribe = adminSocket.subscribe(
        route,
        handler,
      );
      return unsubscribe;
    },
    subscribeTest2Code(route: string, handler: any, agentId: string, buildVersion?: string) {
      // TODO I don't like that hairy ball of a subscription management
      if (!test2CodeSubs[`${agentId}${buildVersion}`]) {
        test2CodeSubs[`${agentId}${buildVersion}`] = {};
      }

      const subscriptionAlreadyExists = test2CodeSubs[`${agentId}${buildVersion}`][route];
      if (subscriptionAlreadyExists) {
        console.log('DUPLICATE SUBSCRIPTION',
          'agentId', agentId, 'buildVersion', buildVersion, 'route', route);
        throw new Error('DUPLICATE_SUBSCRIPTION');
      }

      // TODO either move agentId + buildversion check inside test2CodeSocket
      //      OR suggest to change backend API to /ws/plugins/test2code/agents/:agentId/build/:buildVersion
      test2CodeSubs[`${agentId}${buildVersion}`][route] = handler;

      const unsubscribe = test2CodeSocket.subscribe(
        route,
        (data: any, to?: any) => {
          console.log('TEST2CODESOCKET HANDLER', route, agentId, buildVersion);

          // TODO comment that out and check if that still works as intended (most likely it will not)
          if (to.agentId !== agentId || to.buildVersion !== buildVersion) return;

          const toHandler = test2CodeSubs[`${to.agentId}${to.buildVersion}`][route];
          if (!toHandler) {
            console.log('WARNING: missing handler for test2code update',
              '\n\t', 'route', route, 'agentId', agentId, 'buildVersion', buildVersion,
              '\n\t', 'unsubscribing');
            unsubscribe();
          }
          toHandler(data);
        },
        { agentId, buildVersion, type: 'AGENT' },
      );
      return () => {
        unsubscribe();
        delete test2CodeSubs[`${agentId}${buildVersion}`][route]; // will break other subs for the same agent+buildVersion
      };
    },

    getMethods(baseUrl: string) {
      return {
        async startTest(testName: string) { // TODO add isRealTime param
          const { data } = await axios.post(baseUrl, {
            type: 'START',
            payload: { testType: 'MANUAL', testName, isRealtime: true },
          });
          return data.data.payload.sessionId;
        },

        async stopTest(sessionId: string) {
          await axios.post(baseUrl, {
            type: 'STOP',
            payload: { sessionId },
          });
        },

        async cancelTest(sessionId: string) {
          await axios.post(baseUrl, {
            type: 'CANCEL',
            payload: { sessionId },
          });
        },

        async addSessionData(sessionId: string, data: unknown) {
          await axios.post(baseUrl, {
            type: 'ADD_SESSION_DATA',
            payload: {
              sessionId,
              data: JSON.stringify(data),
            },
          });
        },
      };
    },
  };
};

function createAdminSocket(adminUrl: string, token: string) {
  const url = new URL(adminUrl);
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
  return new DrillSocket(`${protocol}://${url.host}/ws/drill-admin-socket?token=${token}`);
}

function createTest2CodeSocket(adminUrl: string, token: string) {
  const url = new URL(adminUrl);
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
  return new DrillSocket(`${protocol}://${url.host}/ws/plugins/test2code?token=${token}`);
}

async function setupAxios(backendUrl: string) {
  axios.defaults.baseURL = `${backendUrl}/api/`;

  const authToken = await getAuthToken(); // TODO move that out of setupAxios method

  axios.interceptors.request.use(
    async (config) => {
      // eslint-disable-next-line no-param-reassign
      config.headers[AUTH_TOKEN_HEADER_NAME] = `Bearer ${authToken}`;
      return config;
    },
  );

  axios.interceptors.response.use(
    undefined, // (response) => response,
    async (error) => {
      if (error.response && error.response.status === 401) {
        // TODO update token & retry
        // see https://github.com/axios/axios/issues/934
        //  - note the comments
        //  - limit number of retries
        // browser.storage.local.set({ token: '' })
      }
      return Promise.reject(error);
    },
  );

  return authToken;
}

async function getAuthToken() {
  const { token } = await browser.storage.local.get('token');
  if (token) return token;
  return login();
}

async function login() {
  const { headers } = await axios.post('/login');
  const authToken = headers[AUTH_TOKEN_HEADER_NAME.toLowerCase()];
  if (!authToken) throw new Error('Backend authentication failed');
  return authToken;
}