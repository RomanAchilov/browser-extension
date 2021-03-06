import { v4 as uuid } from 'uuid';
import axios, { AxiosError } from 'axios';
import { browser } from 'webextension-polyfill-ts';
import { DrillSocket } from '../common/connection/drill-socket';
import { SessionActionError } from '../common/errors/session-action-error';

const AUTH_TOKEN_HEADER_NAME = 'Authorization';

export default async (backendUrl: string, errorCb: any, completeCb: any) => {
  const token = await setupAxios(backendUrl);
  const adminSocket = createAdminSocket(backendUrl, token, () => {
    adminSocket.cleanup();
    test2CodeSocket.cleanup();
    errorCb();
  }, completeCb);
  const test2CodeSocket = createTest2CodeSocket(backendUrl, token, () => {}, () => {}); // FIXME test2code - individual connection handling
  let test2CodeSubs: Record<string, any> = {};

  return {
    subscribeAdmin(route: string, handler: any) {
      // TODO check for duplicate subscriptions
      const unsubscribe = adminSocket.subscribe(
        route,
        handler,
      );
      return unsubscribe;
    },
    getTest2CodeSubs() {
      return test2CodeSubs;
    },
    setTest2CodeSubs(newSubs: Record<string, any>) {
      test2CodeSubs = newSubs;
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
          const sessionId = uuid();
          await axiosPost(baseUrl, {
            type: 'START',
            payload: {
              sessionId,
              testName,
              testType: 'MANUAL',
              isRealtime: true,
            },
          });
          return sessionId;
        },

        async stopTest(sessionId: string) {
          await axiosPost(baseUrl, {
            type: 'STOP',
            payload: { sessionId },
          });
        },

        async cancelTest(sessionId: string) {
          await axiosPost(baseUrl, {
            type: 'CANCEL',
            payload: { sessionId },
          });
        },

        async addSessionData(sessionId: string, data: unknown) {
          await axiosPost(baseUrl, {
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

function createAdminSocket(backendUrl: string, token: string, errorCb: any, completeCb: any) {
  const url = new URL(ensureProtocol(backendUrl));
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
  return new DrillSocket(`${protocol}://${url.host}/ws/drill-admin-socket?token=${token}`, errorCb, completeCb);
}

function createTest2CodeSocket(backendUrl: string, token: string, errorCb: any, completeCb: any) {
  const url = new URL(ensureProtocol(backendUrl));
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
  return new DrillSocket(`${protocol}://${url.host}/ws/plugins/test2code?token=${token}`, errorCb, completeCb);
}

function ensureProtocol(url: string) {
  const hasProtocol = url.indexOf('http') > -1 || url.indexOf('https') > -1;
  if (!hasProtocol) {
    return `http://${url}`;
  }
  return url;
}

async function setupAxios(backendUrl: string) {
  axios.defaults.baseURL = `${ensureProtocol(backendUrl)}/api/`;

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

async function axiosPost(baseUrl: string, payload: unknown) {
  let data;
  try {
    const res = await axios.post(baseUrl, payload);
    data = res?.data;
  } catch (e) {
    // FIXME this is specific to session actions, might as well move it elsewhere or rename a function
    if (isAxiosError(e)) {
      if (e.response?.data?.code === 404) {
        throw (new SessionActionError(e.response?.data?.message, (payload as any).payload.sessionId));
      }
    }

    throw new Error(getErrorMessage(e));
  }

  if (Array.isArray(data)) {
    if (!data.some(x => x.code === 200)) { // TODO change when we will figure out SG actions handling
      throw new Error('unexpected error');
    }
  } else if (data.code !== 200) { // TODO if backend always sets correct status codes that must not happen
    throw new Error('unexpected error');
  }
  return data;
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'string') return e;

  if (typeof e === 'object') {
    if (isAxiosError(e)) {
      if (e.response?.data?.message) {
        return e.response.data.message;
      }
      if (e.response?.status === 400) {
        return 'bad request';
      }
      if (e.response?.status === 500) {
        return 'internal server error';
      }
    }
  }

  return 'unexpected error';
}

function isAxiosError(e: unknown): e is AxiosError {
  if (e && (e as any).isAxiosError) return true;
  return false;
}
